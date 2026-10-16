import {
  coinWithBalance,
  Transaction,
  TransactionArgument,
  TransactionResult,
} from "@iota/iota-sdk/transactions";
import {
  DryRunTransactionBlockResponse,
  getFullnodeUrl,
  IotaClient,
  IotaTransactionBlockResponse,
  IotaTransactionBlockResponseOptions,
} from "@iota/iota-sdk/client";

import { COIN_DECIMALS, CONFIG, ConfigType } from "@/constants";
import {
  VaultInfo,
  VaultResponse,
  COLLATERAL_COIN,
  PositionInfo,
  VaultInfoList,
  COIN,
  StabilityPoolInfo,
  StabilityPoolBalances,
  Rewards,
  CdpPositionsResponse,
  PoolPositionsResponse,
  PSM_COIN,
  PsmPoolInfoList,
} from "@/types";
import { getObjectFields, parseVaultObject } from "@/utils";
import { bcs } from "@iota/iota-sdk/bcs";
import {
  fromHEX,
  isValidIotaAddress,
  isValidIotaObjectId,
  normalizeIotaAddress,
  normalizeStructTag,
} from "@iota/iota-sdk/utils";
import { Keypair } from "@iota/iota-sdk/cryptography";

/** Upper bound on the Lazer round-trip, so a hung endpoint can't stall a price read. */
const LAZER_FETCH_TIMEOUT_MS = 5_000;

/**
 * Pyth's Lazer HTTP API hosts, tried in order until one answers with an update.
 * Each serves the same signed data. Override with `pythLazer.endpoint` to go
 * through a proxy; exported so that proxy can use the same hosts.
 */
export const DEFAULT_LAZER_ENDPOINTS: readonly string[] = Object.freeze([
  "https://pyth-lazer-0.dourolabs.app",
  "https://pyth-lazer-1.dourolabs.app",
  "https://pyth-lazer-2.dourolabs.app",
]);

/**
 * Properties requested in every Lazer update. `pyth_lazer_rule` abstains on an
 * update missing `confidence` or `feedUpdateTimestamp`, and reads
 * `marketSession` when present, so trimming this list silently loses the price.
 *
 * Exported so a proxy in front of Lazer can request exactly this list rather
 * than keep a copy that drifts when the SDK needs another property.
 */
export const LAZER_PROPERTIES = Object.freeze([
  "price",
  "exponent",
  "confidence",
  "feedUpdateTimestamp",
  "marketSession",
] as const);

/** The collaterals priced directly by an oracle; the rest are derived from these. */
const BASIC_PRICE_SYMBOLS: COLLATERAL_COIN[] = ["IOTA", "iBTC"];

/** Collaterals priced from another collateral's `PriceResult`, and from which. */
const DERIVED_FROM: Partial<Record<COLLATERAL_COIN, COLLATERAL_COIN>> = {
  stIOTA: "IOTA",
  vIOTA: "IOTA",
};

/** The basic symbol whose price `symbol` needs: itself, or what it derives from. */
const basicSymbolOf = (symbol: COLLATERAL_COIN): COLLATERAL_COIN =>
  DERIVED_FROM[symbol] ?? symbol;

/**
 * Everything the oracle rules need from the network, resolved before a single
 * command is written. Applying this cannot fail, which is what lets a position
 * build be abandoned without having touched the caller's transaction.
 *
 * `lazer` holds one signed Lazer update per basic symbol, fetched separately so
 * one feed's trouble — an unentitled id, a stale or wide-band quote — cannot
 * take another's price down with it. A symbol is absent when no update could be
 * had for it.
 */
type PreparedOracleUpdates = {
  lazer: Partial<Record<COLLATERAL_COIN, Uint8Array>>;
};

/**
 * Access to Pyth Lazer. Lazer is token-gated, and the token is a secret: a
 * browser must not hold it. A dApp should point `endpoint` at its own server
 * route that forwards `POST /v1/latest_price` with the token attached, and pass
 * no `apiKey`. A server-side caller can pass `apiKey` directly.
 */
export type PythLazerAccess = {
  /** Sent as `Authorization: Bearer <apiKey>` when given. */
  apiKey?: string;
  /**
   * Base URL(s) serving `POST /v1/latest_price`, tried in order until one
   * returns an update. Defaults to Pyth's own hosts.
   */
  endpoint?: string | readonly string[];
};

const getCoinSymbol = (coinType: string, coinTypes: Record<COIN, string>) => {
  const coin = Object.keys(coinTypes).find(
    (key) => coinTypes[key as COIN] === coinType,
  );
  if (coin) {
    return coin as COIN;
  }
  return undefined;
};

const DUMMY_ADDRESS = normalizeIotaAddress("0x0");

/** A `TypeName` as the treasury stores it: no `0x`, address padded to 64 hex. */
const normalizeTypeName = (type: string): string => {
  const [address, ...rest] = type.split("::");
  return [normalizeIotaAddress(address).replace(/^0x/, ""), ...rest].join("::");
};

/**
 * One wording for every check that refuses a build for want of a price. When a
 * withdrawal without a price was also tried and the chain rejected it, its abort
 * is appended: that cause may have nothing to do with the oracle (no position,
 * withdrawing too much, the protocol paused).
 */
const noPriceError = (symbol: COLLATERAL_COIN, withoutPriceRejection?: string) =>
  new Error(
    `No oracle rule could price ${symbol}: borrowing, and withdrawing while in debt, require a price.` +
      (withoutPriceRejection
        ? ` A withdrawal without a price was rejected on chain: ${withoutPriceRejection}`
        : ""),
  );

const TYPE_NAME_STRUCT = bcs.struct("TypeName", {
  name: bcs.String,
});

const CDP_POSITION_DATA = bcs.struct("CdpPositionData", {
  debtor: bcs.Address,
  coll_amount: bcs.U64,
  debt_amount: bcs.U64,
});

const POOL_POSITION_DATA = bcs.struct("StabilityPoolPositionData", {
  account: bcs.Address,
  vusd_balance: bcs.U64,
  coll_types: bcs.vector(TYPE_NAME_STRUCT),
  coll_amounts: bcs.vector(bcs.U64),
  timestamp: bcs.U64,
});

export class VirtueClient {
  /**
   * @description a TS wrapper over Virtue CDP client.
   * @param network connection to fullnode: 'mainnet' | 'testnet'
   * @param owner (optional) address of the current user (default: DUMMY_ADDRESS)
   */
  private rpcEndpoint: string;
  private iotaClient: IotaClient;
  public transaction: Transaction;
  public sender: string;
  public config: ConfigType;
  private network: "mainnet" | "testnet";
  private pythLazer: PythLazerAccess;

  constructor(inputs?: {
    network?: "mainnet" | "testnet";
    rpcUrl?: string;
    sender?: string;
    /** Required to price anything: IOTA comes from Pyth Lazer alone. */
    pythLazer?: PythLazerAccess;
  }) {
    const { network, rpcUrl, sender, pythLazer } = inputs ?? {};
    this.pythLazer = pythLazer ?? {};
    this.network = network ?? "mainnet";
    this.config = CONFIG[this.network];
    this.rpcEndpoint = rpcUrl ?? getFullnodeUrl(network ?? "mainnet");
    this.sender = sender ? normalizeIotaAddress(sender) : DUMMY_ADDRESS;
    this.iotaClient = new IotaClient({ url: this.rpcEndpoint });
    this.transaction = new Transaction();
  }

  /* ----- Getter ----- */

  /**
   * @description Get this.iotaClient
   */
  getIotaClient(): IotaClient {
    return this.iotaClient;
  }

  getAllCollateralSymbol(): COLLATERAL_COIN[] {
    return Object.keys(this.config.VAULT_MAP) as COLLATERAL_COIN[];
  }

  /* ----- Query ----- */

  /**
   * @description Price every collateral by dev-inspecting its aggregation and
   * reading the emitted `PriceAggregated` event.
   *
   * Each collateral is inspected on its own — a derived one together with the
   * basic price it needs — so nothing that fails to price can hide another
   * price: not iBTC hiding IOTA, and not a broken vIOTA pool hiding IOTA or
   * stIOTA.
   *
   * A symbol is **absent** from the result when no oracle rule could price it,
   * and the derived symbols go with it when their basic price is missing. The
   * return type is `Partial` to say so; treat a missing entry as "no price
   * available right now", never as zero.
   *
   * A symbol whose inspection could not be performed at all (an RPC failure) is
   * left out the same way, as in `aggregatePrices`. If every inspection that
   * actually reached the RPC failed that way, the RPC is unreachable, and that
   * is thrown rather than reported as an empty set of prices.
   */
  async getCollateralPrices(): Promise<
    Partial<Record<COLLATERAL_COIN, number>>
  > {
    const prepared = await this.prepareOracleUpdates();
    const pricePrecision = 10 ** 9;
    // Dev-inspected rather than dry-run. Building for a dry run asks the node
    // to determine a gas budget, which is itself an execution, so an
    // aggregation that aborts would come back as a thrown budgeting error
    // rather than as an absent price. Dev-inspection needs no gas and reports
    // the abort as a failed status with no events, which reads as "no price",
    // the contract this method promises.
    const symbols = this.priceableSymbols();
    const settled = await Promise.allSettled(
      symbols.map((symbol) => this.inspectAggregation(prepared, [symbol])),
    );
    // A symbol with no Lazer update resolves `null` without touching the RPC,
    // so it says nothing about whether the RPC is reachable. Judge that only by
    // the inspections that actually went out: none completed and some failed
    // means the RPC is down, not that nothing is priced.
    const rejected = settled.filter((r) => r.status === "rejected");
    const reached = settled.filter(
      (r) => r.status === "fulfilled" && r.value !== null,
    );
    if (rejected.length > 0 && reached.length === 0) {
      throw new Error(
        "Could not read collateral prices: no RPC dev-inspection could be performed. This is a transport failure, not an oracle one.",
        { cause: (rejected[0] as PromiseRejectedResult).reason },
      );
    }
    return symbols.reduce(
      (result, coinSymbol, i) => {
        const outcome = settled[i];
        if (outcome.status !== "fulfilled") return result;
        const inspect = outcome.value;
        if (!inspect || inspect.effects.status.status !== "success") {
          return result;
        }
        const coinType = this.config.COIN_TYPES[coinSymbol];
        const priceEvent = (inspect.events ?? []).findLast((e) =>
          normalizeStructTag(e.type).includes(normalizeStructTag(coinType)),
        );
        return priceEvent
          ? {
              ...result,
              [coinSymbol]:
                +(priceEvent.parsedJson as any).result / pricePrecision,
            }
          : result;
      },
      {} as Partial<Record<COLLATERAL_COIN, number>>,
    );
  }

  /**
   * @description Get all vault objects
   */
  async getAllVaults(): Promise<VaultInfoList> {
    // Get objectId from VAULT_MAP and get all vaults
    const vaultObjectIds = Object.values(this.config.VAULT_MAP).map(
      (v) => v.vault.objectId,
    );
    const vaultResults = await this.iotaClient.multiGetObjects({
      ids: vaultObjectIds,
      options: {
        showContent: true,
      },
    });

    const vaults: VaultInfoList = vaultResults.reduce((acc, res) => {
      const fields = getObjectFields(res) as VaultResponse;
      const token = Object.keys(this.config.VAULT_MAP).find(
        (key) =>
          this.config.VAULT_MAP[key as COLLATERAL_COIN].vault.objectId ===
          res.data?.objectId,
      );
      if (!token) return acc;

      const vault = parseVaultObject(token as COLLATERAL_COIN, fields);
      acc[vault.token] = vault;
      return acc;
    }, {} as VaultInfoList);

    return vaults;
  }

  /**
   * @description Get Vault<token> object
   */
  async getVault(token: COLLATERAL_COIN): Promise<VaultInfo> {
    const res = await this.iotaClient.getObject({
      id: this.config.VAULT_MAP[token].vault.objectId,
      options: {
        showContent: true,
      },
    });
    const fields = getObjectFields(res) as VaultResponse;

    return parseVaultObject(token, fields);
  }

  /**
   * @description Get debtor's position data
   */
  async getDebtorPositions(debtor?: string): Promise<PositionInfo[]> {
    const tx = new Transaction();
    const clockObj = tx.sharedObjectRef(this.config.CLOCK_OBJ);
    const tokenList = Object.keys(this.config.VAULT_MAP) as COLLATERAL_COIN[];
    const debtorAddr = debtor ?? this.sender;
    if (debtorAddr === DUMMY_ADDRESS) {
      throw new Error("Invalid debtor address");
    }
    tokenList.map((token) => {
      tx.moveCall({
        target: `${this.config.CDP_PACKAGE_ID}::vault::try_get_position_data`,
        typeArguments: [this.config.COIN_TYPES[token]],
        arguments: [
          tx.sharedObjectRef(this.config.VAULT_MAP[token].vault),
          tx.pure.address(debtorAddr),
          clockObj,
        ],
      });
    });

    const res = await this.iotaClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: debtor ?? this.sender,
    });
    if (!res.results) return [];

    return res.results.map((value, idx) => {
      const collateral = tokenList[idx];
      if (value.returnValues) {
        const [collReturn, debtReturn] = value.returnValues;
        return {
          collateral,
          collAmount: collReturn
            ? bcs.u64().parse(Uint8Array.from(collReturn[0]))
            : "0",
          debtAmount: debtReturn
            ? bcs.u64().parse(Uint8Array.from(debtReturn[0]))
            : "0",
        };
      } else {
        return {
          collateral: tokenList[idx],
          collAmount: "0",
          debtAmount: "0",
        };
      }
    });
  }

  /**
   * @description Get data from stability pool
   */
  async getStabilityPool(): Promise<StabilityPoolInfo> {
    const res = await this.iotaClient.getObject({
      id: this.config.STABILITY_POOL_OBJ.objectId,
      options: {
        showContent: true,
      },
    });
    const fields = getObjectFields(res);

    if (!fields) {
      return { vusdBalance: 0 };
    }

    return { vusdBalance: Number(fields.vusd_balance) };
  }

  /**
   * @description Get every PSM pool's live state, with the VUSD the PSM module
   * may still mint. Empty where the network has no PSM.
   */
  async getPsmPools(): Promise<PsmPoolInfoList> {
    const pools = Object.entries(this.config.PSM_POOLS ?? {}) as [
      PSM_COIN,
      NonNullable<ConfigType["PSM_POOLS"]>[PSM_COIN],
    ][];
    if (pools.length === 0 || !this.config.PSM_WITNESS_TYPE) return {};

    const [treasuryRes, ...poolRes] = await this.iotaClient.multiGetObjects({
      ids: [
        this.config.TREASURY_OBJ.objectId,
        ...pools.map(([, info]) => info!.pool.objectId),
      ],
      options: { showContent: true },
    });

    // A read that fails must not look like a limit of zero: that would block
    // every swap in with no sign anything went wrong. So nothing here defaults.
    const treasury = getObjectFields(treasuryRes);
    if (!treasury) throw new Error("Could not read the VUSD treasury");
    // The treasury keys each module's supply by its witness `TypeName`, which
    // is written without the `0x` prefix and names the package's original id.
    const witness = normalizeTypeName(this.config.PSM_WITNESS_TYPE);
    const supplyEntry = (
      treasury.module_supply_map?.fields?.contents ?? []
    ).find((e: any) => normalizeTypeName(e.fields.key.fields.name) === witness);
    if (!supplyEntry) {
      throw new Error(
        `The VUSD treasury has no supply entry for ${this.config.PSM_WITNESS_TYPE}`,
      );
    }
    const limit = BigInt(supplyEntry.fields.value.fields.limit);
    const supply = BigInt(supplyEntry.fields.value.fields.supply);
    const mintableVusd = (limit > supply ? limit - supply : 0n).toString();

    const feeRates = (feeConfig: any) => ({
      swapInFeeRate: Number(feeConfig.swap_in_fee_rate.fields.value) / 1e9,
      swapOutFeeRate: Number(feeConfig.swap_out_fee_rate.fields.value) / 1e9,
    });

    // Pools are independent, like collateral prices: one that can't be read is
    // left out (never reported as empty), and only all of them failing throws.
    const result: PsmPoolInfoList = {};
    pools.forEach(([coin, info], i) => {
      const fields = getObjectFields(poolRes[i]);
      if (!fields) return;
      result[coin] = {
        coin,
        coinType: info!.coinType,
        decimal: Number(fields.decimal),
        balance: String(fields.balance),
        vusdSupply: String(fields.vusd_supply),
        ...feeRates(fields.default_fee_config.fields),
        partnerFeeRates: Object.fromEntries(
          (fields.partner_fee_configs?.fields?.contents ?? []).map((e: any) => [
            normalizeIotaAddress(e.fields.key),
            feeRates(e.fields.value.fields),
          ]),
        ),
        mintableVusd,
        moduleVusdSupply: supply.toString(),
      };
    });
    if (Object.keys(result).length === 0) {
      throw new Error("Could not read any PSM pool");
    }
    return result;
  }

  /**
   * @description Get user's balances in stability pool
   */
  async getStabilityPoolBalances(
    account?: string,
  ): Promise<StabilityPoolBalances> {
    const accountAddr = account ?? this.sender;
    if (accountAddr === DUMMY_ADDRESS) {
      throw new Error("Invalid account address");
    }
    // `getDynamicFieldObject` is the V2 RPC since @iota/iota-sdk 1.7, which
    // takes `parentObjectId` and returns no content unless asked: without
    // `showContent` every balance would read as zero.
    const res = await this.iotaClient.getDynamicFieldObject({
      parentObjectId: this.config.STABILITY_POOL_TABLE_ID,
      name: {
        type: "address",
        value: accountAddr,
      },
      options: { showContent: true },
    });
    // A missing field means the account has no deposit, so zero balances. Any
    // other error is a failed read, which must not pass for zero balances.
    if (res.error && res.error.code !== "dynamicFieldNotFound") {
      throw new Error(
        `Could not read the stability pool position: ${JSON.stringify(res.error)}`,
      );
    }
    const collBalances: Partial<Record<COLLATERAL_COIN, number>> = {};
    Object.keys(this.config.VAULT_MAP).map((collSymbol) => {
      collBalances[collSymbol as COLLATERAL_COIN] = 0;
    });
    if (res.data?.content?.dataType !== "moveObject") {
      return { vusdBalance: 0, collBalances };
    }
    const fields = res.data.content.fields as any;

    const vusdBalance =
      fields.value.fields.value.fields.vusd_balance.fields.value;
    const vecMap = fields.value.fields.value.fields.coll_balances.fields
      .contents as any[];
    vecMap.map((info) => {
      const coinType = "0x" + info.fields.key.fields.name;
      const coinSymbol = getCoinSymbol(coinType, this.config.COIN_TYPES);
      if (coinSymbol) {
        const collBalance = info.fields.value.fields.value;
        collBalances[coinSymbol as COLLATERAL_COIN] = +collBalance;
      }
    });
    return { vusdBalance, collBalances };
  }

  /**
   * @description Get reward amounts from borrow incentive program
   */
  async getBorrowRewards(
    collateralSymbol: COLLATERAL_COIN,
    account?: string,
  ): Promise<Rewards> {
    const accountAddr = account ?? this.sender;
    if (accountAddr === DUMMY_ADDRESS) {
      throw new Error("Invalid debtor address");
    }
    const tx = new Transaction();
    const vaultInfo = this.config.VAULT_MAP[collateralSymbol];
    const rewarders = vaultInfo.rewarders;
    const vaultObj = tx.sharedObjectRef(vaultInfo.vault);
    if (!rewarders) return {};
    rewarders.map((rewarder) => {
      tx.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::borrow_incentive::realtime_reward_amount`,
        typeArguments: [
          this.config.COIN_TYPES[collateralSymbol],
          this.config.COIN_TYPES[rewarder.rewardSymbol],
        ],
        arguments: [
          tx.sharedObjectRef(rewarder),
          vaultObj,
          tx.pure.address(accountAddr),
          tx.sharedObjectRef(this.config.CLOCK_OBJ),
        ],
      });
    });
    const res = await this.iotaClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: accountAddr,
    });
    if (!res.results) return {};
    const rewards: Rewards = {};
    res.results.map((value, idx) => {
      const rewarder = rewarders[idx];
      if (rewarder && value.returnValues) {
        const [rewardAmount] = value.returnValues;
        rewards[rewarder.rewardSymbol] = Number(
          rewardAmount
            ? bcs.u64().parse(Uint8Array.from(rewardAmount[0]))
            : "0",
        );
      }
    });
    return rewards;
  }

  /**
   * @description Get reward amounts from stability pool incentive program
   */
  async getStabilityPoolRewards(account?: string): Promise<Rewards> {
    const tx = new Transaction();
    const accountAddr = account ?? this.sender;
    if (accountAddr === DUMMY_ADDRESS) {
      throw new Error("Invalid debtor address");
    }

    this.config.STABILITY_POOL_REWARDERS.map((rewarder) => {
      tx.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::pool_incentive::realtime_reward_amount`,
        typeArguments: [this.config.COIN_TYPES[rewarder.rewardSymbol]],
        arguments: [
          tx.sharedObjectRef(rewarder),
          tx.sharedObjectRef(this.config.STABILITY_POOL_OBJ),
          tx.pure.address(accountAddr),
          tx.sharedObjectRef(this.config.CLOCK_OBJ),
        ],
      });
    });
    const res = await this.iotaClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: accountAddr,
    });
    if (!res.results) return {};

    const rewards: Rewards = {};
    res.results.map((value, idx) => {
      const rewarder = this.config.STABILITY_POOL_REWARDERS[idx];
      if (rewarder && value.returnValues) {
        const [rewardAmount] = value.returnValues;
        rewards[rewarder.rewardSymbol] = Number(
          rewardAmount
            ? bcs.u64().parse(Uint8Array.from(rewardAmount[0]))
            : "0",
        );
      }
    });
    return rewards;
  }

  /**
   * @description Get CDP Positions
   */
  async getCdpPositions({
    coinSymbol,
    pageSize,
    cursor,
  }: {
    coinSymbol: COLLATERAL_COIN;
    pageSize: number;
    cursor?: string | null;
  }): Promise<CdpPositionsResponse> {
    const tx = new Transaction();
    const vaultInfo = this.config.VAULT_MAP[coinSymbol];
    const coinType = this.config.COIN_TYPES[coinSymbol];
    tx.moveCall({
      target: `${this.config.CDP_PACKAGE_ID}::vault::get_positions`,
      typeArguments: [coinType],
      arguments: [
        tx.sharedObjectRef(vaultInfo.vault),
        tx.sharedObjectRef(this.config.CLOCK_OBJ),
        tx.pure.option("address", cursor),
        tx.pure.u64(pageSize),
      ],
    });
    const res = await this.getIotaClient().devInspectTransactionBlock({
      transactionBlock: tx,
      sender: this.sender,
    });
    if (!res.results || !res.results[0]?.returnValues) {
      return {
        positions: [],
        nextCursor: null,
      };
    }
    const [positionBytes, nextCursorBytes] = res.results[0].returnValues;
    const positions = (
      bcs
        .vector(CDP_POSITION_DATA)
        .parse(Uint8Array.from(positionBytes ? positionBytes[0] : [])) as any[]
    ).map((pos) => {
      return {
        collateralType: coinType,
        debtor: pos.debtor,
        collAmount: Number(pos.coll_amount) / 10 ** COIN_DECIMALS[coinSymbol],
        debtAmount: Number(pos.debt_amount) / 10 ** COIN_DECIMALS.VUSD,
      };
    });
    const nextCursor = bcs
      .option(bcs.Address)
      .parse(Uint8Array.from(nextCursorBytes ? nextCursorBytes[0] : []));
    return {
      positions,
      nextCursor,
    };
  }

  /**
   * @description Get CDP Positions
   */
  async getStabilityPoolPositions({
    pageSize,
    cursor,
  }: {
    pageSize: number;
    cursor?: string | null;
  }): Promise<PoolPositionsResponse> {
    const tx = new Transaction();
    tx.moveCall({
      target: `${this.config.STABILITY_POOL_PACKAGE_ID}::stability_pool::get_positions`,
      arguments: [
        tx.sharedObjectRef(this.config.STABILITY_POOL_OBJ),
        tx.pure.option("address", cursor),
        tx.pure.u64(pageSize),
      ],
    });
    const res = await this.getIotaClient().devInspectTransactionBlock({
      transactionBlock: tx,
      sender: this.sender,
    });
    if (!res.results || !res.results[0]?.returnValues) {
      return {
        positions: [],
        nextCursor: null,
      };
    }
    const [positionVec, nextCursorVec] = res.results[0].returnValues;
    const positions = (
      bcs
        .vector(POOL_POSITION_DATA)
        .parse(Uint8Array.from(positionVec ? positionVec[0] : [])) as any[]
    ).map((pos) => {
      const collAmounts: Record<string, number> = {};
      (pos.coll_types as any[]).map((t, idx) => {
        return (collAmounts["0x" + t.name] = Number(pos.coll_amounts[idx]));
      });
      return {
        account: pos.account,
        vusdAmount: Number(pos.vusd_balance),
        collAmounts,
        timestamp: Number(pos.timestamp),
      };
    });
    const nextCursor = bcs
      .option(bcs.Address)
      .parse(Uint8Array.from(nextCursorVec ? nextCursorVec[0] : []));
    return { positions, nextCursor };
  }

  /* ----- Transaction Utils ----- */

  /**
   * @description new zero coin
   */
  zeroCoin(coinSymbol: COIN): TransactionResult {
    return this.transaction.moveCall({
      target: "0x2::coin::zero",
      typeArguments: [this.config.COIN_TYPES[coinSymbol]],
    });
  }

  /**
   * @description destroy zero coin
   */
  destroyZeroCoin(coinSymbol: COIN, coin: TransactionArgument) {
    this.transaction.moveCall({
      target: "0x2::coin::destroy_zero",
      typeArguments: [this.config.COIN_TYPES[coinSymbol]],
      arguments: [coin],
    });
  }

  /**
   * @description split the needed coins
   */
  async splitInputCoins(
    coinSymbol: COIN,
    ...amounts: (string | TransactionArgument)[]
  ): Promise<TransactionResult> {
    const totalAmount = amounts.reduce(
      (sum, amount) => sum + Number(amount),
      0,
    );
    if (totalAmount === 0) {
      return this.zeroCoin(coinSymbol);
    } else {
      if (coinSymbol === "IOTA") {
        return this.transaction.splitCoins(
          this.transaction.gas,
          amounts.map((amount) =>
            typeof amount === "string"
              ? this.transaction.pure.u64(amount)
              : amount,
          ),
        );
      } else {
        return this.splitCoinsByType(
          this.config.COIN_TYPES[coinSymbol],
          ...amounts,
        );
      }
    }
  }

  /**
   * @description split the needed coins of any non-IOTA coin type. Coin
   * selection is the SDK's `coinWithBalance` intent, resolved when the
   * transaction is built: a shortfall surfaces then, as "Not enough coins of
   * type ...", and the coins come from the transaction's sender. Until then
   * the transaction carries an unresolved intent, so building it needs an RPC
   * client.
   */
  async splitCoinsByType(
    coinType: string,
    ...amounts: (string | TransactionArgument)[]
  ): Promise<TransactionResult> {
    // Amounts given as transaction arguments are only known on chain.
    const total = amounts.every((a) => typeof a === "string")
      ? amounts.reduce((sum, a) => sum + BigInt(a as string), 0n)
      : undefined;
    if (total === 0n) {
      const zero = this.transaction.moveCall({
        target: "0x2::coin::zero",
        typeArguments: [coinType],
      });
      if (amounts.length <= 1) return zero;
      // One zero coin per amount, as a real split would return.
      const out = this.transaction.splitCoins(
        zero,
        amounts.map(() => this.transaction.pure.u64(0)),
      );
      this.transaction.moveCall({
        target: "0x2::coin::destroy_zero",
        typeArguments: [coinType],
        arguments: [zero],
      });
      return out;
    }

    // The sender's coins are picked, merged and split by the SDK's
    // `coinWithBalance` intent when the transaction is built, so a shortfall
    // surfaces then ("Not enough coins of type ..."), from the transaction's
    // sender.
    const tx = this.transaction;
    const pureAmounts = amounts.map((amount) =>
      typeof amount === "string" ? tx.pure.u64(amount) : amount,
    );
    if (total !== undefined) {
      // A coin of exactly `total`, split into the amounts; what is left is a
      // zero coin, which has no `drop` and must be destroyed explicitly.
      const coin = tx.add(coinWithBalance({ type: coinType, balance: total }));
      const out = tx.splitCoins(coin, pureAmounts);
      tx.moveCall({
        target: "0x2::coin::destroy_zero",
        typeArguments: [coinType],
        arguments: [coin],
      });
      return out;
    }

    // An amount only known on chain cannot be sized up front: take the
    // sender's whole balance of the type, split the amounts from it, and
    // return the rest. Because it claims the whole balance it cannot share a
    // transaction with another `coinWithBalance` of the same coin (their
    // totals are summed). Close position sizes its VUSD from the debt instead.
    // The intent picks coins from the transaction's sender, so read that
    // account's balance. It is the balance as of now: if it drops before the
    // transaction is built, or some of those coins are inputs elsewhere in it,
    // the build fails with "Not enough coins of type ...".
    const { totalBalance } = await this.iotaClient.getBalance({
      owner: tx.getData().sender ?? this.sender,
      coinType,
    });
    if (BigInt(totalBalance) === 0n) {
      throw new Error(`Not enough coins of type ${coinType}`);
    }
    const coin = tx.add(
      coinWithBalance({ type: coinType, balance: BigInt(totalBalance) }),
    );
    const out = tx.splitCoins(coin, pureAmounts);
    tx.transferObjects([coin], this.sender);
    return out;
  }

  /* ----- Transaction Methods ----- */

  /**
   * @description Reset this.transaction
   */
  resetTransaction() {
    this.transaction = new Transaction();
  }

  /**
   * @description return Transaction
   * @returns Transaction
   */
  getTransaction(): Transaction {
    return this.transaction;
  }

  async dryrunTransaction(): Promise<DryRunTransactionBlockResponse> {
    this.transaction.setSender(this.sender);
    return this.iotaClient.dryRunTransactionBlock({
      transactionBlock: await this.transaction.build({
        client: this.iotaClient,
      }),
    });
  }

  async signAndExecuteTransaction(
    signer: Keypair,
    options?: IotaTransactionBlockResponseOptions,
  ): Promise<IotaTransactionBlockResponse> {
    if (signer.toIotaAddress() !== this.sender) {
      throw new Error("Invalid signer");
    }
    return this.iotaClient.signAndExecuteTransaction({
      transaction: this.transaction,
      signer,
      options,
    });
  }

  treasuryObj(): TransactionArgument {
    return this.transaction.sharedObjectRef(this.config.TREASURY_OBJ);
  }

  vaultObj(collateralSymbol: COLLATERAL_COIN): TransactionArgument {
    return this.transaction.sharedObjectRef(
      this.config.VAULT_MAP[collateralSymbol].vault,
    );
  }

  stabilityPoolObj(): TransactionArgument {
    return this.transaction.sharedObjectRef(this.config.STABILITY_POOL_OBJ);
  }

  /** The PSM package and `coin`'s pool, or a throw where there is no PSM. */
  private psmPool(coin: PSM_COIN) {
    const pool = this.config.PSM_POOLS?.[coin];
    if (!this.config.PSM_PACKAGE_ID || !pool) {
      throw new Error(`No PSM pool for ${coin} on ${this.network}`);
    }
    return { packageId: this.config.PSM_PACKAGE_ID, ...pool };
  }

  /**
   * `&Option<AccountRequest>` for the PSM's partner fee lookup: `none` pays the
   * default rates.
   */
  private psmPartner(
    accountRequest?: TransactionArgument,
  ): TransactionArgument {
    const type = `${this.config.ORIGINAL_FRAMEWORK_PACKAGE_ID}::account::AccountRequest`;
    return accountRequest
      ? this.transaction.moveCall({
          target: `0x1::option::some`,
          typeArguments: [type],
          arguments: [accountRequest],
        })
      : this.transaction.moveCall({
          target: `0x1::option::none`,
          typeArguments: [type],
        });
  }

  /**
   * @description PSM swap in: deposit `coin` and mint VUSD 1:1 after decimal
   * scaling, less the swap-in fee (taken in VUSD)
   * @param assetCoin: Coin<coin> to deposit
   * @param accountRequest (optional): a partner's AccountRequest for its fee rate
   * @returns Coin<VUSD>
   */
  psmSwapIn(inputs: {
    coin: PSM_COIN;
    assetCoin: TransactionArgument;
    accountRequest?: TransactionArgument;
  }): TransactionArgument {
    const { coin, assetCoin, accountRequest } = inputs;
    const { packageId, coinType, pool } = this.psmPool(coin);
    const [vusdCoin] = this.transaction.moveCall({
      target: `${packageId}::pool::swap_in`,
      typeArguments: [coinType],
      arguments: [
        this.transaction.sharedObjectRef(pool),
        this.treasuryObj(),
        assetCoin,
        this.psmPartner(accountRequest),
      ],
    });
    return vusdCoin;
  }

  /**
   * @description PSM swap out: burn VUSD and withdraw `coin` 1:1 after decimal
   * scaling, less the swap-out fee (taken in `coin`)
   * @param vusdCoin: Coin<VUSD> to burn
   * @param accountRequest (optional): a partner's AccountRequest for its fee rate
   * @returns Coin<coin>
   */
  psmSwapOut(inputs: {
    coin: PSM_COIN;
    vusdCoin: TransactionArgument;
    accountRequest?: TransactionArgument;
  }): TransactionArgument {
    const { coin, vusdCoin, accountRequest } = inputs;
    const { packageId, coinType, pool } = this.psmPool(coin);
    const [assetCoin] = this.transaction.moveCall({
      target: `${packageId}::pool::swap_out`,
      typeArguments: [coinType],
      arguments: [
        this.transaction.sharedObjectRef(pool),
        this.treasuryObj(),
        vusdCoin,
        this.psmPartner(accountRequest),
      ],
    });
    return assetCoin;
  }

  /**
   * @description Create a AccountRequest
   * @param accountObj (optional): Account object or EOA if undefined
   * @return AccountRequest
   */
  newAccountRequest(
    accountObj?: string | TransactionArgument,
  ): TransactionArgument {
    return accountObj
      ? this.transaction.moveCall({
          target: `${this.config.FRAMEWORK_PACKAGE_ID}::account::request_with_account`,
          arguments: [
            typeof accountObj === "string"
              ? this.transaction.object(accountObj)
              : accountObj,
          ],
        })
      : this.transaction.moveCall({
          target: `${this.config.FRAMEWORK_PACKAGE_ID}::account::request`,
        });
  }

  /**
   * @description Create a price collector
   * @param collateral coin symbol, e.g "IOTA"
   * @return PriceCollector
   */
  newPriceCollector(
    collateralSymbol: COLLATERAL_COIN,
    tx: Transaction = this.transaction,
  ): TransactionArgument {
    return tx.moveCall({
      target: `${this.config.ORACLE_PACKAGE_ID}::collector::new`,
      typeArguments: [this.config.COIN_TYPES[collateralSymbol]],
    });
  }

  /**
   * @description Resolve everything the oracle rules need from the network,
   * without writing anything to the transaction.
   *
   * Building a position is not reversible. Commands can only be appended to a
   * `Transaction`, never removed — `getData()` returns a snapshot and the
   * builder behind it is private — and swapping in a rebuilt object is no
   * substitute, since that changes the identity a caller is composing against
   * and drops that instance's plugins and intent resolvers. So everything that
   * can fail happens here, before the first command is written, and applying the
   * result afterwards is pure transaction building.
   *
   * The prepared data is then carried into the aggregation rather than fetched
   * again. Probing and refetching would leave a window where the preflight
   * passes and the real fetch fails, throwing only after the transaction had
   * been written to — and it would pay for the same work twice.
   *
   * Each basic symbol gets its own Lazer request. Lazer rejects a whole request
   * when any one feed in it is not entitled, so a shared request would let one
   * feed's entitlement decide every price.
   */
  private async prepareOracleUpdates(
    basicSymbols: COLLATERAL_COIN[] = BASIC_PRICE_SYMBOLS,
  ): Promise<PreparedOracleUpdates> {
    const entries = await Promise.all(
      basicSymbols
        .filter((symbol) => this.lazerRuleFeeds(symbol))
        .map(
          async (symbol) =>
            [
              symbol,
              await this.prepareLazer(this.config.PYTH_LAZER_FEED_IDS![symbol]!),
            ] as const,
        ),
    );
    const lazer: Partial<Record<COLLATERAL_COIN, Uint8Array>> = {};
    for (const [symbol, update] of entries) {
      if (update) lazer[symbol] = update;
    }
    return { lazer };
  }

  /**
   * @description The configured collaterals that have an oracle path at all:
   * the basic symbols, and the symbols derived from one of them.
   */
  private priceableSymbols(): COLLATERAL_COIN[] {
    return this.getAllCollateralSymbol().filter((symbol) =>
      BASIC_PRICE_SYMBOLS.includes(basicSymbolOf(symbol)),
    );
  }

  /**
   * @description Whether the Lazer rule is wired up for a symbol at all.
   *
   * Config alone decides whether the rule is *added*. The rule abstains on a
   * stale or incomplete update rather than aborting, but it aborts on a coin type
   * it has no feed id for (`EUnsupportedCoinType`). Live config is aligned today,
   * and `canPriceCollateral` dev-inspects the real aggregation rather than
   * trusting that, so a drifted rule config surfaces as "cannot price" instead
   * of a failed transaction.
   */
  private lazerRuleFeeds(symbol: COLLATERAL_COIN): boolean {
    return (
      this.config.PYTH_LAZER_FEED_IDS?.[symbol] !== undefined &&
      !!this.config.PYTH_LAZER_PACKAGE_ID &&
      !!this.config.PYTH_LAZER_STATE_OBJ &&
      !!this.config.PYTH_LAZER_RULE_PACKAGE_ID &&
      !!this.config.PYTH_LAZER_RULE_CONFIG_OBJ
    );
  }

  /**
   * @description Build the aggregation for `symbols` on a transaction of its own
   * and dev-inspect it. Returns `null` when the prepared data cannot even build
   * a price for every symbol asked about (nothing to inspect).
   *
   * Built on a transaction of its own. Assigning a scratch transaction to
   * `this.transaction` for the duration would expose it through
   * `getTransaction()` and, worse, let a concurrent build or
   * `resetTransaction()` land in that window only to be overwritten when this
   * restored the old one.
   *
   * Transport failures propagate; callers decide what they mean.
   */
  private async inspectAggregation(
    prepared: PreparedOracleUpdates,
    symbols: COLLATERAL_COIN[],
  ) {
    const probe = new Transaction();
    const priceResults = this.aggregatePricesWith(prepared, probe, symbols);
    if (!symbols.every((symbol) => priceResults[symbol])) return null;
    return this.iotaClient.devInspectTransactionBlock({
      sender: DUMMY_ADDRESS,
      transactionBlock: probe,
    });
  }

  /**
   * @description Whether the prepared data can actually price this collateral.
   *
   * Answered by building the aggregation and dev-inspecting it, rather than by
   * reasoning about which rules are configured. Configuration is not the
   * question — having a Lazer update says nothing about whether the rule will
   * accept it. An update signed too long ago, or one whose confidence band is
   * wider than the rule's gate, makes the rule abstain, `aggregate` fails its
   * threshold with `err_total_weight_not_enough`, and a predicate that had said
   * "yes" would already have written a doomed position onto the caller's
   * transaction. The same inspection runs the on-chain verify, so an update the
   * verifier rejects is caught here too.
   *
   * Running the real thing also covers what a predicate would miss: a rule
   * config drifted from the coin types asked about, or any future rule with its
   * own abort conditions.
   *
   * A dev-inspection that *executes* and reports failure means no rule can
   * price this collateral. A dev-inspection that could not run at all means
   * nothing of the sort, so transport failures are raised rather than folded
   * into a `false` that would blame the oracles for a throttled RPC.
   */
  private async canPriceCollateral(
    collateralSymbol: COLLATERAL_COIN,
    prepared: PreparedOracleUpdates,
  ): Promise<boolean> {
    let inspect;
    try {
      inspect = await this.inspectAggregation(prepared, [collateralSymbol]);
    } catch (error) {
      throw new Error(
        `Could not determine whether ${collateralSymbol} is priceable: the RPC dev-inspection could not be performed. This is a transport failure, not an oracle one.`,
        { cause: error },
      );
    }
    return inspect?.effects.status.status === "success";
  }

  /**
   * @description Fetch one signed Lazer update for `feedId`, without touching
   * the current transaction.
   *
   * Lazer is pull-based: nothing is stored on chain, so the signed update has to
   * travel in the same PTB as the read, through
   * `pyth_lazer::parse_and_verify_le_ecdsa_update`.
   *
   * No on-chain check happens here. Whether the update verifies and prices is
   * settled by the single dev-inspection of the real aggregation that every
   * caller runs anyway, which includes the verify; probing the verify alone
   * first would only spend time inside the rule's freshness window.
   *
   * Endpoints are tried in order. Never throws: no access configured, an
   * endpoint outage, a slow or unauthorised response or malformed bytes all
   * move on to the next endpoint, and come back `null` when none answered.
   */
  private async prepareLazer(feedId: number): Promise<Uint8Array | null> {
    const channel = this.config.PYTH_LAZER_CHANNEL;
    if (!channel) return null;
    const configured = this.pythLazer.endpoint ?? DEFAULT_LAZER_ENDPOINTS;
    const endpoints = (
      Array.isArray(configured) ? configured : [configured]
    ).map((endpoint) => endpoint.replace(/\/+$/, ""));
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.pythLazer.apiKey) {
      headers.Authorization = `Bearer ${this.pythLazer.apiKey}`;
    }
    const body = JSON.stringify({
      priceFeedIds: [feedId],
      properties: LAZER_PROPERTIES,
      formats: ["leEcdsa"],
      jsonBinaryEncoding: "hex",
      channel,
    });

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(`${endpoint}/v1/latest_price`, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(LAZER_FETCH_TIMEOUT_MS),
        });
        if (!res.ok) continue;
        const update = this.lazerUpdateFromResponse(await res.json());
        if (update) return update;
      } catch {
        // Next endpoint.
      }
    }
    return null;
  }

  /**
   * @description Pull the signed `leEcdsa` bytes out of a `/v1/latest_price`
   * response body, or `null` when it carries none. Pure — no I/O.
   *
   * `Buffer` is a Node global that browser bundles do not provide, and a
   * ReferenceError here would be swallowed by the fail-soft catch around
   * preparation — quietly disabling the only price source there is, for every
   * dApp consumer. `fromHEX` works in both runtimes.
   */
  private lazerUpdateFromResponse(body: unknown): Uint8Array | null {
    const hex = (body as { leEcdsa?: { data?: unknown } } | null)?.leEcdsa
      ?.data;
    if (typeof hex !== "string" || hex.length === 0) return null;
    try {
      return fromHEX(hex);
    } catch {
      return null;
    }
  }

  /**
   * @description Append the Lazer verify call and return the verified `Update`.
   * Pure — no I/O.
   */
  private verifyLazerUpdate(
    tx: Transaction,
    update: Uint8Array,
  ): TransactionResult {
    return tx.moveCall({
      target: `${this.config.PYTH_LAZER_PACKAGE_ID}::pyth_lazer::parse_and_verify_le_ecdsa_update`,
      arguments: [
        tx.sharedObjectRef(this.config.PYTH_LAZER_STATE_OBJ!),
        tx.object.clock(),
        tx.pure.vector("u8", update),
      ],
    });
  }

  /**
   * @description Price every collateral that can be priced right now, into the
   * current transaction.
   *
   * Each collateral is dev-inspected on its own first — a derived one together
   * with the basic price it needs — and only those that price are added,
   * because a PTB is all-or-nothing: one abort would otherwise take every other
   * price, and whatever the caller bundles with them, down too. A broken vIOTA
   * pool therefore leaves IOTA and stIOTA in place. Never throws — a collateral
   * whose inspection could not be performed is left out.
   *
   * @return PriceResult per collateral that could be priced
   */
  async aggregatePrices(): Promise<
    Partial<Record<COLLATERAL_COIN, TransactionResult>>
  > {
    const prepared = await this.prepareOracleUpdates();
    const verdicts = await Promise.all(
      this.priceableSymbols().map(async (symbol) => {
        try {
          const inspect = await this.inspectAggregation(prepared, [symbol]);
          return inspect?.effects.status.status === "success" ? [symbol] : [];
        } catch {
          return [];
        }
      }),
    );
    return this.aggregatePricesWith(
      prepared,
      this.transaction,
      verdicts.flat(),
    );
  }

  /**
   * @description The transaction-building half of the price calls, working only
   * from data already fetched by `prepareOracleUpdates`. Pure — no I/O.
   *
   * Builds only what `symbols` need: each requested symbol's basic symbol, then
   * the requested derived symbols. A borrow against IOTA therefore carries
   * nothing of iBTC's, and the reverse.
   *
   * Kept separate so a position build can settle whether its collateral is
   * priceable before writing anything, then build from that exact same prepared
   * data — no second fetch, and so no window for the answer to change in
   * between.
   */
  private aggregatePricesWith(
    prepared: PreparedOracleUpdates,
    tx: Transaction,
    symbols: COLLATERAL_COIN[],
  ): Partial<Record<COLLATERAL_COIN, TransactionResult>> {
    const basics = BASIC_PRICE_SYMBOLS.filter((basic) =>
      symbols.some((symbol) => basicSymbolOf(symbol) === basic),
    );

    const results: Partial<Record<COLLATERAL_COIN, TransactionResult>> = {};
    for (const symbol of basics) {
      const update = prepared.lazer[symbol];
      // `aggregate` needs at least one source to reach its threshold, so a
      // symbol no rule can price is left out of the transaction altogether
      // rather than being aggregated into a guaranteed abort.
      if (!update || !this.lazerRuleFeeds(symbol)) continue;
      const coinType = this.config.COIN_TYPES[symbol];

      // Lazer stores nothing on chain, so the signed update is verified in this
      // same PTB, ahead of the `feed` that reads it.
      const lazerUpdate = this.verifyLazerUpdate(tx, update);
      const collector = this.newPriceCollector(symbol, tx);
      // `feed` abstains on a stale or incomplete update rather than aborting,
      // so the update's age is settled on chain. It does abort on a coin type
      // with no registered feed id, which is why priceability is settled by
      // dev-inspecting the real aggregation rather than inferred from config.
      tx.moveCall({
        target: `${this.config.PYTH_LAZER_RULE_PACKAGE_ID}::pyth_lazer_rule::feed`,
        typeArguments: [coinType],
        arguments: [
          collector,
          tx.sharedObjectRef(this.config.PYTH_LAZER_RULE_CONFIG_OBJ!),
          tx.object.clock(),
          lazerUpdate,
        ],
      });
      results[symbol] = tx.moveCall({
        target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
        typeArguments: [coinType],
        arguments: [
          tx.sharedObjectRef(this.config.VAULT_MAP[symbol].priceAggregater),
          collector,
        ],
      });
    }

    // stIOTA and vIOTA are derived from the IOTA price, so they can only be
    // built when IOTA itself got one.
    const iotaPriceResult = results.IOTA;
    if (!iotaPriceResult) return results;

    if (symbols.includes("stIOTA")) {
      const stIotaCollector = this.newPriceCollector("stIOTA", tx);
      tx.moveCall({
        target: `${this.config.CERT_RULE_PACKAGE_ID}::cert_rule::feed`,
        arguments: [
          stIotaCollector,
          iotaPriceResult,
          tx.sharedObjectRef(this.config.CERT_NATIVE_POOL_OBJ),
          tx.sharedObjectRef(this.config.CERT_METADATA_OBJ),
        ],
      });
      results.stIOTA = tx.moveCall({
        target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
        typeArguments: [this.config.COIN_TYPES.stIOTA],
        arguments: [
          tx.sharedObjectRef(this.config.VAULT_MAP.stIOTA.priceAggregater),
          stIotaCollector,
        ],
      });
    }

    if (symbols.includes("vIOTA")) {
      const vIotaCollector = this.newPriceCollector("vIOTA", tx);
      tx.moveCall({
        target: `${this.config.VCERT_RULE_PACKAGE_ID}::vcert_rule::feed`,
        arguments: [
          vIotaCollector,
          iotaPriceResult,
          tx.sharedObjectRef(this.config.VCERT_NATIVE_POOL_OBJ),
          tx.sharedObjectRef(this.config.VCERT_METADATA_OBJ),
        ],
      });
      results.vIOTA = tx.moveCall({
        target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
        typeArguments: [this.config.COIN_TYPES.vIOTA],
        arguments: [
          tx.sharedObjectRef(this.config.VAULT_MAP.vIOTA.priceAggregater),
          vIotaCollector,
        ],
      });
    }

    return results;
  }

  /**
   * @description Get a request to Mange Position
   * @param collateralSymbol: collateral coin symbol , e.g "IOTA"
   * @param depositCoin: collateral input coin
   * @param borrowAmount: the amount to borrow
   * @param repaymentCoin: repyment input coin (always VUSD)
   * @param withdrawAmount: the amount to withdraw
   * @param accountObj (optional): account object id or transaction argument
   * @returns UpdateRequest
   */
  debtorRequest(inputs: {
    collateralSymbol: COLLATERAL_COIN;
    depositCoin: TransactionArgument;
    borrowAmount: string | TransactionArgument;
    repaymentCoin: TransactionArgument;
    withdrawAmount: string | TransactionArgument;
    accountObj?: string | TransactionArgument;
  }): TransactionArgument {
    const {
      collateralSymbol,
      depositCoin,
      borrowAmount,
      repaymentCoin,
      withdrawAmount,
      accountObj,
    } = inputs;
    const coinType = this.config.COIN_TYPES[collateralSymbol];
    const vaultId = this.config.VAULT_MAP[collateralSymbol].vault.objectId;
    const accountReq = this.newAccountRequest(accountObj);
    return this.transaction.moveCall({
      target: `${this.config.CDP_PACKAGE_ID}::request::debtor_request`,
      typeArguments: [coinType],
      arguments: [
        accountReq,
        this.treasuryObj(),
        this.transaction.pure.id(vaultId),
        depositCoin,
        typeof borrowAmount === "string"
          ? this.transaction.pure.u64(borrowAmount)
          : borrowAmount,
        repaymentCoin,
        typeof withdrawAmount === "string"
          ? this.transaction.pure.u64(withdrawAmount)
          : withdrawAmount,
      ],
    });
  }

  /**
   * @description Get a request to Mange Position
   * @param collateralSymbol: collateral coin symbol , e.g "IOTA"
   * @param depositCoin: collateral input coin
   * @param borrowAmount: the amount to borrow
   * @param repaymentCoin: repyment input coin (always VUSD)
   * @param withdrawAmount: the amount to withdraw
   * @param accountObj (optional): account object id or transaction argument
   * @returns UpdateRequest
   */
  donorRequest(inputs: {
    collateralSymbol: COLLATERAL_COIN;
    debtor: string;
    depositCoin: TransactionArgument;
    repaymentCoin: TransactionArgument;
  }): TransactionArgument {
    const { collateralSymbol, debtor, depositCoin, repaymentCoin } = inputs;
    const coinType = this.config.COIN_TYPES[collateralSymbol];
    const vaultId = this.config.VAULT_MAP[collateralSymbol].vault.objectId;
    return this.transaction.moveCall({
      target: `${this.config.CDP_PACKAGE_ID}::request::donor_request`,
      typeArguments: [coinType],
      arguments: [
        this.treasuryObj(),
        this.transaction.pure.id(vaultId),
        this.transaction.pure.address(debtor),
        depositCoin,
        repaymentCoin,
      ],
    });
  }

  /**
   * @description Manage Position
   * @param collateralSymbol: collateral coin symbol , e.g "IOTA"
   * @param updateRequest: manager request, ex: see this.debtorRequest
   * @param priceResult: price result, see this.aggregatePrice
   * @returns [Coin<T>, COIN<VUSD>, UpdateResponse]
   */
  updatePosition(inputs: {
    collateralSymbol: COLLATERAL_COIN;
    updateRequest: TransactionArgument;
    priceResult?: TransactionArgument;
  }): [TransactionArgument, TransactionArgument, TransactionArgument] {
    const { collateralSymbol, updateRequest, priceResult } = inputs;
    const priceResultType = `${this.config.ORIGINAL_ORACLE_PACKAGE_ID}::result::PriceResult<${this.config.COIN_TYPES[collateralSymbol]}>`;
    const priceResultOpt = priceResult
      ? this.transaction.moveCall({
          target: `0x1::option::some`,
          typeArguments: [priceResultType],
          arguments: [priceResult],
        })
      : this.transaction.moveCall({
          target: `0x1::option::none`,
          typeArguments: [priceResultType],
        });
    const [collCoin, vusdCoin, response] = this.transaction.moveCall({
      target: `${this.config.CDP_PACKAGE_ID}::vault::update_position`,
      typeArguments: [this.config.COIN_TYPES[collateralSymbol]],
      arguments: [
        this.vaultObj(collateralSymbol),
        this.treasuryObj(),
        this.transaction.object.clock(),
        priceResultOpt,
        updateRequest,
      ],
    });
    return [collCoin, vusdCoin, response];
  }

  /**
   * @description check and destroy UpdateRequest
   * @param collateralSymbol: "IOTA" or "stIOTA"
   * @param response: UpdateRequest generated by update_position
   */
  checkRequest(inputs: {
    collateralSymbol: COLLATERAL_COIN;
    request: TransactionArgument;
  }): TransactionArgument {
    const { collateralSymbol, request } = inputs;
    let updateRequest = request;
    const vaultObj = this.vaultObj(collateralSymbol);
    if (this.config.INCENTIVE_PACKAGE_ID) {
      const collateralType = this.config.COIN_TYPES[collateralSymbol];
      const rewarders = this.config.VAULT_MAP[collateralSymbol].rewarders;
      const registryObj = this.transaction.sharedObjectRef(
        this.config.VAULT_REWARDER_REGISTRY_OBJ,
      );
      const clockObj = this.transaction.object.clock();
      const checker = this.transaction.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::borrow_incentive::new_checker`,
        typeArguments: [collateralType],
        arguments: [registryObj, updateRequest],
      });
      (rewarders ?? []).map((rewarder) => {
        const rewardType = this.config.COIN_TYPES[rewarder.rewardSymbol];
        this.transaction.moveCall({
          target: `${this.config.INCENTIVE_PACKAGE_ID}::borrow_incentive::update`,
          typeArguments: [collateralType, rewardType],
          arguments: [
            registryObj,
            checker,
            vaultObj,
            this.transaction.sharedObjectRef(rewarder),
            clockObj,
          ],
        });
      });
      const [responseAfterIncentive] = this.transaction.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::borrow_incentive::destroy_checker`,
        typeArguments: [collateralType],
        arguments: [registryObj, checker],
      });
      updateRequest = responseAfterIncentive;
    }
    return updateRequest;
  }

  /**
   * @description check and destroy UpdateResponse
   * @param collateralSymbol: "IOTA" or "stIOTA"
   * @param response: UpdateResponse generated by update_position
   */
  checkResponse(inputs: {
    collateralSymbol: COLLATERAL_COIN;
    response: TransactionArgument;
  }) {
    const { collateralSymbol, response } = inputs;
    const vaultObj = this.vaultObj(collateralSymbol);
    this.emitPoint(collateralSymbol, response);
    this.transaction.moveCall({
      target: `${this.config.CDP_PACKAGE_ID}::vault::destroy_response`,
      typeArguments: [this.config.COIN_TYPES[collateralSymbol]],
      arguments: [vaultObj, this.treasuryObj(), response],
    });
  }

  /**
   * @description deposit to stability pool
   * @param vusdCoin: coin of VUSD
   * @param recipient (optional): deposit for recipient instead of sender
   * @returns PositionResponse
   */
  depositStabilityPool(inputs: {
    vusdCoin: TransactionArgument;
    accountRequest?: TransactionArgument;
    accountObj?: string | TransactionArgument;
  }): TransactionArgument {
    const { vusdCoin, accountRequest, accountObj } = inputs;
    const accountReq = accountRequest
      ? accountRequest
      : this.newAccountRequest(accountObj);
    return this.transaction.moveCall({
      target: `${this.config.STABILITY_POOL_PACKAGE_ID}::stability_pool::deposit_and_update`,
      arguments: [
        this.stabilityPoolObj(),
        this.transaction.object.clock(),
        accountReq,
        vusdCoin,
      ],
    });
  }

  /**
   * @description withdraw from stability pool
   * @param amount: how much amount to withdraw
   * @param accountRequest: AccountRequest see this.accountRequest()
   * @param amount: how much amount to withdraw
   * @returns [Coin<VUSD>, PositionResponse]
   */
  withdrawStabilityPool(inputs: {
    amount: string;
    accountRequest?: TransactionArgument;
    accountObj?: string | TransactionArgument;
  }): [TransactionArgument, TransactionArgument] {
    const { amount, accountRequest, accountObj } = inputs;
    const accountReq = accountRequest
      ? accountRequest
      : this.newAccountRequest(accountObj);
    const [vusdCoin, response] = this.transaction.moveCall({
      target: `${this.config.STABILITY_POOL_PACKAGE_ID}::stability_pool::withdraw_and_update`,
      arguments: [
        this.stabilityPoolObj(),
        this.transaction.object.clock(),
        accountReq,
        this.transaction.pure.u64(amount),
      ],
    });
    return [vusdCoin, response];
  }

  /**
   * @description claim from stability pool
   */
  claimStabilityPool(inputs: {
    accountRequest?: TransactionArgument;
    accountObj?: string | TransactionArgument;
  }): TransactionArgument[] {
    const { accountRequest, accountObj } = inputs;
    const accountReq = accountRequest
      ? accountRequest
      : this.newAccountRequest(accountObj);
    const collCoins = Object.keys(this.config.VAULT_MAP).map((collSymbol) => {
      const collType = this.config.COIN_TYPES[collSymbol as COLLATERAL_COIN];
      const [collCoin] = this.transaction.moveCall({
        target: `${this.config.STABILITY_POOL_PACKAGE_ID}::stability_pool::claim`,
        typeArguments: [collType],
        arguments: [this.stabilityPoolObj(), accountReq],
      });
      return collCoin;
    });
    return collCoins;
  }

  /**
   * @description check response for stability pool
   * @param response: PositionResponse
   */
  checkResponseForStabilityPool(response: TransactionArgument) {
    let positionResponse = response;
    if (this.config.INCENTIVE_PACKAGE_ID) {
      const registryObj = this.transaction.sharedObjectRef(
        this.config.POOL_REWARDER_REGISTRY_OBJ,
      );
      const clockObj = this.transaction.object.clock();
      const checker = this.transaction.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::pool_incentive::new_checker`,
        arguments: [registryObj, positionResponse],
      });
      (this.config.STABILITY_POOL_REWARDERS ?? []).map((rewarder) => {
        const rewardType = this.config.COIN_TYPES[rewarder.rewardSymbol];
        this.transaction.moveCall({
          target: `${this.config.INCENTIVE_PACKAGE_ID}::pool_incentive::update`,
          typeArguments: [rewardType],
          arguments: [
            registryObj,
            checker,
            this.transaction.sharedObjectRef(rewarder),
            clockObj,
          ],
        });
      });
      const [responseAfterIncentive] = this.transaction.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::pool_incentive::destroy_checker`,
        arguments: [registryObj, checker],
      });
      positionResponse = responseAfterIncentive;
    }

    this.transaction.moveCall({
      target: `${this.config.STABILITY_POOL_PACKAGE_ID}::stability_pool::check_update_response`,
      arguments: [this.stabilityPoolObj(), positionResponse],
    });
  }

  /* ----- Transaction Methods ----- */

  /**
   * @description Whether this withdrawal can go ahead with no price at all.
   *
   * Answered by dev-inspecting the real withdrawal with `option::none`, never by
   * reasoning about the vault's rules: `update_position` decides when it needs a
   * price (today, a borrow or a withdrawal that leaves debt), and a copy of that
   * rule here would drift the moment the vault changed. Only a successful
   * inspection says yes. One that aborts, for any reason, says no; one that
   * could not run at all is a transport failure and is raised as one.
   *
   * Narrowed to what an inspection of committed state can vouch for: a plain
   * withdrawal (nothing deposited, repaid or borrowed), by a real sender, on a
   * transaction carrying nothing else. Commands already composed ahead of it,
   * a borrow on this same position say, would change the state it executes
   * against.
   *
   * The probe is built by a scratch client so it never touches this client's
   * transaction; a plain withdrawal builds without any RPC calls.
   */
  private async canWithdrawWithoutPrice(inputs: {
    collateralSymbol: COLLATERAL_COIN;
    depositAmount: string;
    borrowAmount: string;
    repaymentAmount: string;
    withdrawAmount: string;
    accountObjId?: string;
    recipient?: string;
  }): Promise<{ ok: boolean; rejection?: string }> {
    const plainWithdrawal =
      Number(inputs.withdrawAmount) > 0 &&
      Number(inputs.borrowAmount) === 0 &&
      Number(inputs.depositAmount) === 0 &&
      Number(inputs.repaymentAmount) === 0;
    if (!plainWithdrawal) return { ok: false };
    if (this.sender === DUMMY_ADDRESS) return { ok: false };
    if (this.transaction.getData().commands.length > 0) return { ok: false };

    // Input mistakes fail while the probe is built, inside the inspection call
    // below, where they would be reported as an unreachable RPC. Reject them
    // here, as the input errors they are.
    const { recipient, accountObjId } = inputs;
    if (recipient !== undefined && !isValidIotaAddress(normalizeIotaAddress(recipient))) {
      throw new Error(
        `Invalid recipient for a withdrawal: ${recipient}. Only borrowed VUSD can go to the stability pool.`,
      );
    }
    if (accountObjId !== undefined && !isValidIotaObjectId(normalizeIotaAddress(accountObjId))) {
      throw new Error(`Invalid accountObjId: ${accountObjId}`);
    }

    const scratch = new VirtueClient({
      network: this.network,
      rpcUrl: this.rpcEndpoint,
      sender: this.sender,
    });
    scratch.config = this.config;
    const probe = await scratch.buildManagePosition(
      { ...inputs, keepTransaction: true },
      "none",
    );
    probe.setSender(this.sender);

    let inspect;
    try {
      inspect = await this.iotaClient.devInspectTransactionBlock({
        sender: this.sender,
        transactionBlock: probe,
      });
    } catch (error) {
      throw new Error(
        `Could not determine whether ${inputs.collateralSymbol} can be withdrawn without a price: the RPC dev-inspection could not be performed. This is a transport failure, not an oracle one.`,
        { cause: error },
      );
    }
    return inspect.effects.status.status === "success"
      ? { ok: true }
      : { ok: false, rejection: inspect.effects.status.error ?? "unknown abort" };
  }

  /**
   * @description build and return Transaction of manage position
   * @param collateralSymbol: collateral coin symbol , e.g "IOTA"
   * @param depositAmount: how much amount to deposit (collateral)
   * @param borrowAmount: how much amout to borrow (VUSD)
   * @param repaymentAmount: how much amount to repay (VUSD)
   * @param withdrawAmount: how much amount to withdraw (collateral)
   * @param accountObjId: the Account object to hold position (undefined if just use EOA)
   * @param recipient (optional): the recipient of the output coins
   * @returns Transaction
   *
   * **Sign and execute this promptly.** Borrowing or withdrawing embeds a signed
   * Pyth Lazer update, and `pyth_lazer_rule` only accepts one within its
   * freshness tolerance of the moment Pyth signed it — 30s by default, counted
   * from the signing time rather than from now. Past it the rule abstains,
   * `aggregate` aborts with `err_total_weight_not_enough`, and the whole
   * transaction goes with it. A transaction held that long must be rebuilt, not
   * resubmitted. This deadline is inherent to feeding a price on chain.
   *
   * Either the whole position is built or the transaction is left exactly as it
   * was found — including when the collateral turns out to be unpriceable, which
   * is settled before anything is written.
   */
  async buildManagePositionTransaction(inputs: {
    collateralSymbol: COLLATERAL_COIN;
    depositAmount: string;
    borrowAmount: string;
    repaymentAmount: string;
    withdrawAmount: string;
    accountObjId?: string;
    recipient?: string;
    keepTransaction?: boolean;
  }): Promise<Transaction> {
    const { collateralSymbol, borrowAmount, withdrawAmount, keepTransaction } =
      inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    // Coin splits and the oracle commands land on the transaction before it can
    // be known whether the position is buildable at all, and a `Transaction`
    // cannot be rolled back afterwards: `getData()` returns a snapshot, the
    // builder behind it is private, and swapping in a rebuilt object would
    // change the identity the caller is composing against and drop that
    // instance's plugins and intent resolvers. So the one question that can fail
    // the build is asked up front, while the transaction is still untouched.
    let price: PreparedOracleUpdates | "none" | undefined;
    if (Number(borrowAmount) > 0 || Number(withdrawAmount) > 0) {
      // Only the price this position needs: an IOTA borrow fetches and writes
      // nothing of iBTC's, and the reverse.
      const prepared = await this.prepareOracleUpdates([
        basicSymbolOf(collateralSymbol),
      ]);
      if (await this.canPriceCollateral(collateralSymbol, prepared)) {
        price = prepared;
      } else {
        const withoutPrice = await this.canWithdrawWithoutPrice(inputs);
        if (!withoutPrice.ok) {
          throw noPriceError(collateralSymbol, withoutPrice.rejection);
        }
        // The probe vouched for an otherwise empty transaction. Another build on
        // this client may have written to it while the probe was in flight, and
        // a borrow on this position, say, would change what the withdrawal
        // executes against: check again right before writing.
        if (this.transaction.getData().commands.length > 0) {
          throw noPriceError(collateralSymbol);
        }
        // A debt-free position must not be locked in by an oracle outage.
        price = "none";
      }
    }
    this.transaction.setSender(this.sender);
    return await this.buildManagePosition(inputs, price ?? null);
  }

  /**
   * @description The body of `buildManagePositionTransaction`, split out so the
   * entry point above can settle its preconditions before anything is written.
   */
  private async buildManagePosition(
    inputs: {
      collateralSymbol: COLLATERAL_COIN;
      depositAmount: string;
      borrowAmount: string;
      repaymentAmount: string;
      withdrawAmount: string;
      accountObjId?: string;
      recipient?: string;
      keepTransaction?: boolean;
    },
    /**
     * The settled price: the prepared oracle data for a borrow or withdrawal,
     * `"none"` for a withdrawal already shown to need no price, or `null` when
     * the operation needs no price at all (deposit, repay). Required: a borrow
     * or withdrawal given `null` throws rather than fetch a price here.
     */
    price: PreparedOracleUpdates | "none" | null,
  ): Promise<Transaction> {
    const {
      collateralSymbol,
      depositAmount,
      borrowAmount,
      repaymentAmount,
      withdrawAmount,
      accountObjId,
      recipient,
      keepTransaction,
    } = inputs;
    const [depositCoin] = await this.splitInputCoins(
      collateralSymbol,
      depositAmount,
    );
    const [repaymentCoin] = await this.splitInputCoins("VUSD", repaymentAmount);
    if (Number(borrowAmount) > 0 || Number(withdrawAmount) > 0) {
      // The same data the precondition was settled from, so the answer here
      // cannot differ from the one already acted on.
      // `canPriceCollateral` has already settled this before anything was
      // written, so a missing price here means it went away in between. Kept as
      // a backstop because `updatePosition` turns a missing price into
      // `option::none`, and building a borrow as though no price check were
      // needed is far worse than throwing on a partially built transaction.
      const priceResult =
        price === null || price === "none"
          ? undefined
          : this.aggregatePricesWith(price, this.transaction, [
              collateralSymbol,
            ])[collateralSymbol];
      if (!priceResult && price !== "none") {
        throw noPriceError(collateralSymbol);
      }
      let updateRequest = this.debtorRequest({
        collateralSymbol,
        depositCoin,
        borrowAmount,
        repaymentCoin,
        withdrawAmount,
        accountObj: accountObjId,
      });
      updateRequest = this.checkRequest({
        collateralSymbol,
        request: updateRequest,
      });
      const [collCoin, vusdCoin, response] = this.updatePosition({
        collateralSymbol,
        updateRequest,
        priceResult,
      });
      this.checkResponse({ collateralSymbol, response });
      if (Number(withdrawAmount) > 0) {
        this.transaction.transferObjects([collCoin], recipient ?? this.sender);
      } else {
        this.destroyZeroCoin(collateralSymbol, collCoin);
      }
      if (Number(borrowAmount) > 0) {
        if (recipient === "StabilityPool") {
          const response = this.depositStabilityPool({
            vusdCoin,
            accountObj: accountObjId,
          });
          this.checkResponseForStabilityPool(response);
        } else {
          this.transaction.transferObjects(
            [vusdCoin],
            recipient ?? this.sender,
          );
        }
      } else {
        this.destroyZeroCoin("VUSD", vusdCoin);
      }
      const tx = this.getTransaction();
      // Every other builder honours `keepTransaction`; this branch alone reset
      // unconditionally, throwing away the composition the caller asked to keep
      // for exactly the operations that need a price.
      if (!keepTransaction) this.resetTransaction();
      return tx;
    } else {
      let updateRequest = this.debtorRequest({
        collateralSymbol,
        depositCoin,
        borrowAmount,
        repaymentCoin,
        withdrawAmount,
        accountObj: accountObjId,
      });
      updateRequest = this.checkRequest({
        collateralSymbol,
        request: updateRequest,
      });
      const [collCoin, vusdCoin, response] = this.updatePosition({
        collateralSymbol,
        updateRequest,
      });

      this.checkResponse({ collateralSymbol, response });
      this.destroyZeroCoin(collateralSymbol, collCoin);
      this.destroyZeroCoin("VUSD", vusdCoin);
      const tx = this.getTransaction();
      if (!keepTransaction) this.resetTransaction();
      return tx;
    }
  }

  /**
   * @description build and return Transaction of close position
   * @param collateralSymbol: collateral coin symbol , e.g "IOTA"
   * @param accountObjId: the Account object to hold position (undefined if just use EOA)
   * @param recipient (optional): the recipient of the output coins
   * @returns Transaction
   */
  async buildClosePositionTransaction(inputs: {
    collateralSymbol: COLLATERAL_COIN;
    accountObjId?: string;
    recipient?: string;
    keepTransaction?: boolean;
  }): Promise<Transaction> {
    const { collateralSymbol, accountObjId, recipient, keepTransaction } =
      inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    // The repayment is the debt as read on chain at execution. Its VUSD is sized
    // from the debt read now, plus headroom for interest accrued meanwhile
    // (0.1% + 0.001 VUSD), capped at what the wallet holds. When the wallet
    // holds more than that, another VUSD intent can share the transaction;
    // when the cap applies, the budget is the whole balance and it cannot
    // (`coinWithBalance` sums the intents of a type).
    const vusdType = this.config.COIN_TYPES.VUSD;
    const [positions, { totalBalance }] = await Promise.all([
      this.getDebtorPositions(this.sender),
      this.iotaClient.getBalance({ owner: this.sender, coinType: vusdType }),
    ]);
    // `getDebtorPositions` returns nothing when its read fails; that is not a
    // zero debt, and sizing for one would only abort on chain.
    const position = positions.find((p) => p.collateral === collateralSymbol);
    if (!position) {
      throw new Error(
        `Could not read the ${collateralSymbol} position to size its repayment.`,
      );
    }
    const debtNow = BigInt(position.debtAmount);
    // `coinWithBalance` resolves a zero budget to `coin::zero` (since 1.10), so
    // a wallet short of the debt would only abort on chain, after signing.
    if (debtNow > 0n && BigInt(totalBalance) < debtNow) {
      throw new Error(
        `Not enough VUSD to close the ${collateralSymbol} position: it owes ${debtNow} and the wallet holds ${totalBalance}.`,
      );
    }
    const headroom = debtNow + debtNow / 1000n + 1000n;
    const repaymentBudget =
      headroom < BigInt(totalBalance) ? headroom : BigInt(totalBalance);
    this.transaction.setSender(this.sender);
    const collType = this.config.COIN_TYPES[collateralSymbol];
    const [collAmount, debtAmount] = this.transaction.moveCall({
      target: `${this.config.CDP_PACKAGE_ID}::vault::get_position_data`,
      typeArguments: [collType],
      arguments: [
        this.vaultObj(collateralSymbol),
        this.transaction.pure.address(this.sender),
        this.transaction.object.clock(),
      ],
    });
    const repaymentFunds = this.transaction.add(
      coinWithBalance({ type: vusdType, balance: repaymentBudget }),
    );
    const [repaymentCoin] = this.transaction.splitCoins(repaymentFunds, [
      debtAmount,
    ]);
    this.transaction.transferObjects([repaymentFunds], this.sender);
    let updateRequest = this.debtorRequest({
      collateralSymbol,
      depositCoin: this.zeroCoin(collateralSymbol),
      borrowAmount: "0",
      repaymentCoin,
      withdrawAmount: collAmount,
      accountObj: accountObjId,
    });
    updateRequest = this.checkRequest({
      collateralSymbol,
      request: updateRequest,
    });
    const [collCoin, vusdCoin, response] = this.updatePosition({
      collateralSymbol,
      updateRequest,
    });

    this.checkResponse({ collateralSymbol, response });
    this.destroyZeroCoin("VUSD", vusdCoin);
    this.transaction.transferObjects(
      [collCoin],
      recipient ?? this.transaction.pure.address(this.sender),
    );

    const tx = this.getTransaction();
    if (!keepTransaction) this.resetTransaction();
    return tx;
  }

  /**
   * @description build and return Transaction of deposit stability pool
   * @param depositAmount: how much amount to deposit (collateral)
   * @returns Transaction
   */
  async buildDepositStabilityPoolTransaction(inputs: {
    depositAmount: string;
    accountObjId?: string;
    keepTransaction?: boolean;
  }): Promise<Transaction> {
    const { depositAmount, accountObjId, keepTransaction } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const [vusdCoin] = await this.splitInputCoins("VUSD", depositAmount);
    const response = this.depositStabilityPool({
      vusdCoin,
      accountObj: accountObjId,
    });
    this.checkResponseForStabilityPool(response);
    const tx = this.getTransaction();
    if (!keepTransaction) this.resetTransaction();
    return tx;
  }

  /**
   * @description build and return Transaction of withdraw stability pool
   * @param withdrawAmount: how much amount to withdraw (collateral)
   * @returns Transaction
   */
  async buildWithdrawStabilityPoolTransaction(inputs: {
    withdrawAmount: string;
    accountObj?: string;
    keepTransaction?: boolean;
  }): Promise<Transaction> {
    const { withdrawAmount: amount, accountObj, keepTransaction } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const [vusdOut, response] = this.withdrawStabilityPool({
      amount,
      accountObj,
    });
    this.checkResponseForStabilityPool(response);
    this.transaction.transferObjects([vusdOut], this.sender);
    const tx = this.getTransaction();
    if (!keepTransaction) this.resetTransaction();
    return tx;
  }

  /**
   * @description build and return Transaction of withdraw stability pool
   * @param withdrawAmount: how much amount to withdraw (collateral)
   * @returns Transaction
   */
  buildClaimStabilityPoolTransaction(inputs: {
    accountObj?: string;
    keepTransaction?: boolean;
  }): Transaction {
    const { keepTransaction } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const collCoins = this.claimStabilityPool(inputs);
    this.transaction.transferObjects(collCoins, this.sender);
    const tx = this.getTransaction();
    if (!keepTransaction) this.resetTransaction();
    return tx;
  }

  /**
   * @description claim the rewards from borrow incentive program
   */
  buildClaimBorrowRewards(inputs: {
    accountObj?: string | TransactionArgument;
    keepTransaction?: boolean;
  }): Transaction {
    const { accountObj, keepTransaction } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    if (!this.config.INCENTIVE_PACKAGE_ID) {
      throw new Error("No rewards to claim");
    }
    this.transaction.setSender(this.sender);
    const accountReq = this.newAccountRequest(accountObj);
    const clockObj = this.transaction.object.clock();
    const registryObj = this.transaction.sharedObjectRef(
      this.config.VAULT_REWARDER_REGISTRY_OBJ,
    );
    Object.keys(this.config.VAULT_MAP).map((collSymbol) => {
      const vaultInfo = this.config.VAULT_MAP[collSymbol as COLLATERAL_COIN];
      const rewarders = vaultInfo.rewarders;
      const vaultObj = this.vaultObj(collSymbol as COLLATERAL_COIN);
      if (rewarders) {
        rewarders.map((rewarder) => {
          const [reward] = this.transaction.moveCall({
            target: `${this.config.INCENTIVE_PACKAGE_ID}::borrow_incentive::claim`,
            typeArguments: [
              this.config.COIN_TYPES[collSymbol as COLLATERAL_COIN],
              this.config.COIN_TYPES[rewarder.rewardSymbol],
            ],
            arguments: [
              registryObj,
              this.transaction.sharedObjectRef(rewarder),
              vaultObj,
              accountReq,
              clockObj,
            ],
          });
          this.transaction.transferObjects([reward], this.sender);
        });
      }
    });
    const tx = this.getTransaction();
    if (!keepTransaction) this.resetTransaction();
    return tx;
  }

  /**
   * @description claim the rewards from stability pool incentive program
   */
  buildClaimStabilityPoolRewards(inputs: {
    accountObj?: string | TransactionArgument;
    keepTransaction?: boolean;
  }): Transaction {
    const { accountObj, keepTransaction } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    if (!this.config.INCENTIVE_PACKAGE_ID) {
      throw new Error("No rewards to claim");
    }
    this.transaction.setSender(this.sender);
    const accountReq = this.newAccountRequest(accountObj);
    const registryObj = this.transaction.sharedObjectRef(
      this.config.POOL_REWARDER_REGISTRY_OBJ,
    );
    const clockObj = this.transaction.object.clock();
    const stabilityPoolObj = this.transaction.sharedObjectRef(
      this.config.STABILITY_POOL_OBJ,
    );
    this.config.STABILITY_POOL_REWARDERS.map((rewarder) => {
      const [reward] = this.transaction.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::pool_incentive::claim`,
        typeArguments: [this.config.COIN_TYPES[rewarder.rewardSymbol]],
        arguments: [
          registryObj,
          this.transaction.sharedObjectRef(rewarder),
          stabilityPoolObj,
          accountReq,
          clockObj,
        ],
      });
      this.transaction.transferObjects([reward], this.sender);
    });
    const tx = this.getTransaction();
    if (!keepTransaction) this.resetTransaction();
    return tx;
  }

  /**
   * @description claim total rewards
   */
  buildClaimTotalRewards(inputs: {
    accountObj?: string | TransactionArgument;
  }): Transaction {
    this.resetTransaction();
    this.buildClaimBorrowRewards({ ...inputs, keepTransaction: true });
    this.buildClaimStabilityPoolRewards({ ...inputs, keepTransaction: true });
    const tx = this.getTransaction();
    this.resetTransaction();
    return tx;
  }

  /**
   * @description build and return Transaction of a PSM swap, sending the
   * output to the sender. No oracle is involved: the PSM swaps at a fixed 1:1.
   * @param coin: the PSM stablecoin, e.g. "USDT0"
   * @param direction: "in" pays `coin` for VUSD, "out" pays VUSD for `coin`
   * @param amount: raw units of what is paid
   * @param accountObj (optional): pay a partner's fee rates. Quote it with the
   * account's address as `quotePsmSwap`'s `partner`, or the quote will not
   * match.
   * @returns Transaction
   */
  async buildPsmSwapTransaction(inputs: {
    coin: PSM_COIN;
    direction: "in" | "out";
    amount: string;
    accountObj?: string | TransactionArgument;
    keepTransaction?: boolean;
  }): Promise<Transaction> {
    const { coin, direction, amount, accountObj, keepTransaction } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (this.sender === DUMMY_ADDRESS) throw new Error("Sender is not set");
    if (!/^\d+$/.test(amount) || BigInt(amount) === 0n) {
      throw new Error("Swap amount must be a positive integer of raw units");
    }
    const { coinType } = this.psmPool(coin);
    this.transaction.setSender(this.sender);
    // Coin selection is resolved when the transaction is built, so a short
    // balance surfaces at build time, not here.
    const [inputCoin] =
      direction === "in"
        ? await this.splitCoinsByType(coinType, amount)
        : await this.splitCoinsByType(this.config.COIN_TYPES.VUSD, amount);
    const accountRequest = accountObj
      ? this.newAccountRequest(accountObj)
      : undefined;
    const output =
      direction === "in"
        ? this.psmSwapIn({ coin, assetCoin: inputCoin, accountRequest })
        : this.psmSwapOut({ coin, vusdCoin: inputCoin, accountRequest });
    this.transaction.transferObjects([output], this.sender);
    const tx = this.getTransaction();
    if (!keepTransaction) this.resetTransaction();
    return tx;
  }

  /**
   * @description instruction for emitting point request
   */
  emitPoint(collateralSymbol: COLLATERAL_COIN, response: TransactionArgument) {
    if (this.config.POINT_PACKAGE_ID) {
      this.transaction.moveCall({
        target: `${this.config.POINT_PACKAGE_ID}::point_manager::emit_point`,
        typeArguments: [this.config.COIN_TYPES[collateralSymbol]],
        arguments: [
          this.transaction.sharedObjectRef(this.config.POINT_MANAGER_OBJ),
          this.transaction.sharedObjectRef(this.config.POINT_GLOBAL_CONFIG_OBJ),
          this.vaultObj(collateralSymbol),
          response,
          this.transaction.object.clock(),
        ],
      });
    }
  }
}
