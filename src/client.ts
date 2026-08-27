import {
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
} from "@/types";
import { getObjectFields, parseVaultObject } from "@/utils";
import { bcs } from "@iota/iota-sdk/bcs";
import {
  fromHEX,
  normalizeIotaAddress,
  normalizeStructTag,
} from "@iota/iota-sdk/utils";
import { Keypair } from "@iota/iota-sdk/cryptography";

/** Upper bound on the crossbar round-trip, so a hung endpoint can't stall a price read. */
const SWITCHBOARD_CRANK_TIMEOUT_MS = 5_000;

/** The collaterals priced directly by an oracle; the rest are derived from these. */
const BASIC_PRICE_SYMBOLS: COLLATERAL_COIN[] = ["IOTA"];

/** One signed Switchboard response, as crossbar hands it over. */
type SwitchboardResponse = {
  successValue: string;
  isNegative: boolean;
  timestamp: number;
  signature: string;
  oracleId: string;
};

/** Responses already proven to validate on chain, with the queue they belong to. */
type PreparedSwitchboard = {
  aggregatorId: string;
  queue: string;
  results: SwitchboardResponse[];
};

/**
 * Everything the oracle rules need from the network, resolved before a single
 * command is written. Applying this cannot fail, which is what lets a position
 * build be abandoned without having touched the caller's transaction.
 */
type PreparedOracleUpdates = {
  switchboard: Partial<Record<COLLATERAL_COIN, PreparedSwitchboard>>;
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

  constructor(inputs?: {
    network?: "mainnet" | "testnet";
    rpcUrl?: string;
    sender?: string;
  }) {
    const { network, rpcUrl, sender } = inputs ?? {};
    this.config = CONFIG[network ?? "mainnet"];
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
   * @description Price every collateral by dry-running `aggregatePrices` and
   * reading the emitted `PriceAggregated` events.
   *
   * A symbol is **absent** from the result when no oracle rule could price it —
   * `aggregatePrices` leaves such a symbol out of the transaction, so it emits
   * no event, and the derived symbols go with it since they are computed from
   * the IOTA price. The return type is `Partial` to say so; treat a missing
   * entry as "no price available right now", never as zero.
   */
  async getCollateralPrices(): Promise<
    Partial<Record<COLLATERAL_COIN, number>>
  > {
    this.resetTransaction();
    await this.aggregatePrices();
    this.transaction.setSender(DUMMY_ADDRESS);
    // Dev-inspected rather than dry-run. Building for a dry run asks the node to
    // determine a gas budget, which is itself an execution — so an aggregation
    // that aborts because nothing could price the symbol comes back as a thrown
    // budgeting error rather than as an absent price. Dev-inspection needs no
    // gas and reports the abort as a failed status with no events, which the
    // reduce below then reads as "no price", the contract this method promises.
    const inspectRes = await this.iotaClient.devInspectTransactionBlock({
      sender: DUMMY_ADDRESS,
      transactionBlock: this.transaction,
    });
    this.resetTransaction();
    const pricePrecision = 10 ** 9;
    return this.getAllCollateralSymbol().reduce(
      (result, coinSymbol) => {
        const coinType = this.config.COIN_TYPES[coinSymbol];
        const priceEvent = (inspectRes.events ?? []).findLast((e) =>
          normalizeStructTag(e.type).includes(normalizeStructTag(coinType)),
        );
        if (priceEvent) {
          return {
            ...result,
            [coinSymbol]:
              +(priceEvent.parsedJson as any).result / pricePrecision,
          };
        } else {
          return result;
        }
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
   * @description Get user's balances in stability pool
   */
  async getStabilityPoolBalances(
    account?: string,
  ): Promise<StabilityPoolBalances> {
    const accountAddr = account ?? this.sender;
    if (accountAddr === DUMMY_ADDRESS) {
      throw new Error("Invalid account address");
    }
    const res = await this.iotaClient.getDynamicFieldObject({
      parentId: this.config.STABILITY_POOL_TABLE_ID,
      name: {
        type: "address",
        value: accountAddr,
      },
    });
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
        const coinType = this.config.COIN_TYPES[coinSymbol];
        const { data: userCoins } = await this.iotaClient.getCoins({
          owner: this.sender,
          coinType,
        });
        const [mainCoin, ...otherCoins] = userCoins.map((coin) =>
          this.transaction.objectRef({
            objectId: coin.coinObjectId,
            version: coin.version,
            digest: coin.digest,
          }),
        );
        if (!mainCoin) {
          throw new Error("Not enough balance");
        }

        const ifMerge = otherCoins.length > 0;

        if (ifMerge) {
          this.transaction.mergeCoins(mainCoin, otherCoins);
        }

        const out = this.transaction.splitCoins(
          mainCoin,
          amounts.map((amount) =>
            typeof amount === "string"
              ? this.transaction.pure.u64(amount)
              : amount,
          ),
        );

        if (ifMerge) {
          this.transaction.transferObjects([mainCoin], this.sender);
        }

        return out;
      }
    }
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
   */
  private async prepareOracleUpdates(
    basicSymbols: COLLATERAL_COIN[] = BASIC_PRICE_SYMBOLS,
  ): Promise<PreparedOracleUpdates> {
    const switchboardAggregators = this.config.SWITCHBOARD_AGGREGATORS ?? {};

    const switchboard: Partial<Record<COLLATERAL_COIN, PreparedSwitchboard>> =
      {};
    for (const symbol of basicSymbols) {
      const aggregatorId = switchboardAggregators[symbol];
      if (!aggregatorId) continue;
      const prepared = await this.prepareSwitchboard(aggregatorId);
      if (prepared) switchboard[symbol] = prepared;
    }

    return { switchboard };
  }

  /**
   * @description Whether the Switchboard rule is wired up for a symbol at all.
   *
   * Config alone decides whether the rule is *added*. It abstains on a stale
   * aggregator rather than aborting, so adding it costs nothing — but note it is
   * not unconditionally fail-soft: the deployed rule aborts on a coin type it
   * has no mapping for (`err_unsupported_coin_type`) or an aggregator that is
   * not the one registered for that coin (`err_invalid_aggregator`). Live config
   * is aligned today, and `canPriceCollateral` dev-inspects the real aggregation
   * rather than trusting that, so a drifted rule config surfaces as "cannot
   * price" instead of a failed transaction.
   */
  private switchboardRuleFeeds(symbol: COLLATERAL_COIN): boolean {
    return (
      !!this.config.SWITCHBOARD_AGGREGATORS?.[symbol] &&
      !!this.config.SWITCHBOARD_RULE_PACKAGE_ID &&
      !!this.config.SWITCHBOARD_RULE_CONFIG_OBJ
    );
  }

  /**
   * @description Whether the prepared data can actually price this collateral.
   *
   * Answered by building the aggregation and dev-inspecting it, rather than by
   * reasoning about which rules are configured. Configuration is not the
   * question — being wired up to Switchboard says nothing about whether its
   * aggregator still holds a result the rule will accept. With nothing cranked
   * and a stale aggregator the rule abstains, `aggregate` fails its threshold
   * with `err_total_weight_not_enough`, and a predicate that had said "yes"
   * would already have written a doomed position onto the caller's transaction.
   *
   * Running the real thing also covers what a predicate would miss: a rule
   * config drifted from the aggregator it is asked about, or any future rule
   * with its own abort conditions.
   *
   * Built on a transaction of its own. Assigning a scratch transaction to
   * `this.transaction` for the duration would expose it through
   * `getTransaction()` and, worse, let a concurrent build or
   * `resetTransaction()` land in that window only to be overwritten when this
   * restored the old one.
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
    const probe = new Transaction();
    const priceResults = await this.aggregatePricesWith(prepared, probe);
    if (!priceResults[collateralSymbol]) return false;

    let inspect;
    try {
      inspect = await this.iotaClient.devInspectTransactionBlock({
        sender: DUMMY_ADDRESS,
        transactionBlock: probe,
      });
    } catch (error) {
      throw new Error(
        `Could not determine whether ${collateralSymbol} is priceable: the RPC dev-inspection could not be performed. This is a transport failure, not an oracle one.`,
        { cause: error },
      );
    }
    return inspect.effects.status.status === "success";
  }

  /**
   * @description Fetch signed Switchboard responses and keep the ones that will
   * actually validate on chain, without touching the current transaction.
   *
   * Switchboard is on-demand, not push: `Aggregator.current_result` only changes
   * when someone submits a signed oracle response. Left alone the IOTA mainnet
   * feed sat 330 days stale, so the crank belongs in the same PTB as the read.
   *
   * Two things make this awkward, both handled here:
   *
   * - Most oracles on the IOTA queues are broken — their signature no longer
   *   recovers to the `secp256k1_key` in their on-chain `Oracle` object, so
   *   `aggregator_submit_result_action::validate` aborts. Crossbar hands out one
   *   at random per request, so a plain crank succeeds about a quarter of the
   *   time. `numSignatures` asks for the whole set instead.
   * - A PTB is all-or-nothing, so one broken oracle would take the entire price
   *   read — and whatever borrow or liquidation is bundled with it — down too.
   *   Each response is therefore devInspected on its own and only the survivors
   *   are kept.
   *
   * Never throws: a crossbar outage, a slow endpoint, a malformed response or an
   * RPC failure all come back `null`. Switchboard is one rule among several, so
   * raising here would take down price reads that the others could have served.
   */
  private async prepareSwitchboard(
    aggregatorId: string,
    numSignatures = 8,
  ): Promise<PreparedSwitchboard | null> {
    const pkg = this.config.SWITCHBOARD_PACKAGE_ID;
    if (!pkg) return null;

    try {
      const res = await fetch(
        `https://crossbar.switchboard.xyz/updates/iota/mainnet/${aggregatorId}?numSignatures=${numSignatures}`,
        { signal: AbortSignal.timeout(SWITCHBOARD_CRANK_TIMEOUT_MS) },
      );
      if (!res.ok) return null;
      const body = (await res.json()) as {
        responses?: { results?: SwitchboardResponse[] }[];
      };
      const results = (body.responses ?? [])
        .flatMap((r) => r.results ?? [])
        // `"00"` is crossbar's placeholder for an oracle that did not sign.
        .filter((r) => r.signature && r.signature !== "00" && r.successValue);
      if (results.length === 0) return null;

      const aggObj = await this.iotaClient.getObject({
        id: aggregatorId,
        options: { showContent: true },
      });
      const queue = (aggObj.data?.content as any)?.fields?.queue as string;
      if (!queue) return null;

      const verdicts = await Promise.all(
        results.map(async (r) => {
          try {
            const probe = new Transaction();
            if (!this.addSwitchboardSubmission(probe, aggregatorId, queue, r)) {
              return undefined;
            }
            const inspect = await this.iotaClient.devInspectTransactionBlock({
              sender: DUMMY_ADDRESS,
              transactionBlock: probe,
            });
            return inspect.effects.status.status === "success" ? r : undefined;
          } catch {
            return undefined;
          }
        }),
      );
      const validated = verdicts.filter(
        (r): r is SwitchboardResponse => r !== undefined,
      );
      if (validated.length === 0) return null;

      return { aggregatorId, queue, results: validated };
    } catch {
      return null;
    }
  }

  /**
   * @description Append one `aggregator_submit_result_action::run` call. Pure —
   * no I/O — so replaying a response that already passed its probe cannot fail.
   * Returns false for a signature that is not the 65 bytes the action expects.
   */
  private addSwitchboardSubmission(
    tx: Transaction,
    aggregatorId: string,
    queue: string,
    r: SwitchboardResponse,
  ): boolean {
    const pkg = this.config.SWITCHBOARD_PACKAGE_ID;
    if (!pkg) return false;
    // `Buffer` is a Node global that browser bundles do not provide, and the
    // ReferenceError would be swallowed by the fail-soft catch around
    // preparation — quietly disabling the only price source there is, for every
    // dApp consumer. `fromHEX` works in both runtimes.
    let signature: Uint8Array;
    try {
      signature = fromHEX(r.signature);
    } catch {
      return false;
    }
    if (signature.length !== 65) return false;
    // The queue fee is 0, but `run` still asserts the coin type it accepts.
    const [fee] = tx.splitCoins(tx.gas, [0]);
    tx.moveCall({
      target: `${pkg}::aggregator_submit_result_action::run`,
      typeArguments: ["0x2::iota::IOTA"],
      arguments: [
        tx.object(aggregatorId),
        tx.object(queue),
        tx.pure.u128(BigInt(r.successValue.replace(/^-/, ""))),
        tx.pure.bool(r.isNegative || r.successValue.startsWith("-")),
        tx.pure.u64(BigInt(r.timestamp)),
        tx.object(r.oracleId),
        tx.pure.vector("u8", signature),
        tx.object.clock(),
        fee!,
      ],
    });
    return true;
  }

  /**
   * @description Add the prepared Switchboard submissions to the current
   * transaction, so the aggregator is fresh before anything in this same PTB
   * reads it. Returns how many were added; zero simply means the rule will read
   * whatever is already on chain and abstain if that is stale.
   */
  private applySwitchboard(
    prepared: PreparedSwitchboard | undefined,
    tx: Transaction,
  ): number {
    if (!prepared) return 0;
    let added = 0;
    for (const r of prepared.results) {
      if (
        this.addSwitchboardSubmission(
          tx,
          prepared.aggregatorId,
          prepared.queue,
          r,
        )
      ) {
        added++;
      }
    }
    return added;
  }

  /**
   * @description Get a price result
   * @param collateral coin symbol, e.g "IOTA"
   * @return [PriceResult]
   */
  async aggregatePrices(): Promise<
    Partial<Record<COLLATERAL_COIN, TransactionResult>>
  > {
    return this.aggregatePricesWith(await this.prepareOracleUpdates());
  }

  /**
   * @description The transaction-building half of `aggregatePrices`, working
   * only from data already fetched and validated by `prepareOracleUpdates`.
   *
   * Kept separate so a position build can settle whether its collateral is
   * priceable before writing anything, then build from that exact same prepared
   * data — no second fetch, and so no window for the answer to change in
   * between.
   */
  private async aggregatePricesWith(
    prepared: PreparedOracleUpdates,
    tx: Transaction = this.transaction,
  ): Promise<Partial<Record<COLLATERAL_COIN, TransactionResult>>> {
    const basicSymbol = BASIC_PRICE_SYMBOLS;

    // Switchboard reads whatever was last submitted, so the refresh goes into
    // this same PTB, ahead of everything that reads it.
    const switchboardAggregators = this.config.SWITCHBOARD_AGGREGATORS ?? {};
    for (const symbol of basicSymbol) {
      this.applySwitchboard(prepared.switchboard[symbol], tx);
    }

    const basicPriceResults = basicSymbol.reduce(
      (result, symbol) => {
        const coinType = this.config.COIN_TYPES[symbol];
        const switchboardAggregatorId = switchboardAggregators[symbol];
        const switchboardFeeds = this.switchboardRuleFeeds(symbol);

        // `aggregate` needs at least one source to reach its threshold, so a
        // symbol no rule can price is left out of the transaction altogether
        // rather than being aggregated into a guaranteed abort.
        if (!switchboardFeeds) return result;

        const collector = this.newPriceCollector(symbol, tx);
        // `feed` abstains on a stale aggregator rather than aborting, so it is
        // safe to add even when the crank fed nothing. It is not
        // unconditionally fail-soft though — a coin type it has no mapping for,
        // or an aggregator other than the one registered for that coin, both
        // abort — which is why priceability is settled by dev-inspecting the
        // real aggregation rather than inferred from configuration.
        if (switchboardFeeds && switchboardAggregatorId) {
          tx.moveCall({
            target: `${this.config.SWITCHBOARD_RULE_PACKAGE_ID}::switchboard_rule::feed`,
            typeArguments: [coinType],
            arguments: [
              collector,
              tx.sharedObjectRef(this.config.SWITCHBOARD_RULE_CONFIG_OBJ!),
              tx.object.clock(),
              tx.object(switchboardAggregatorId),
            ],
          });
        }
        const priceResult = tx.moveCall({
          target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
          typeArguments: [coinType],
          arguments: [
            tx.sharedObjectRef(this.config.VAULT_MAP[symbol].priceAggregater),
            collector,
          ],
        });
        return { ...result, [symbol]: priceResult };
      },
      {} as Partial<Record<COLLATERAL_COIN, TransactionResult>>,
    );

    // stIOTA and vIOTA are derived from the IOTA price, so they can only be
    // built when IOTA itself got one.
    if (!basicPriceResults.IOTA) return basicPriceResults;
    const iotaPriceResult = basicPriceResults.IOTA;

    // deal with stIOTA
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
    const stIotaPrice = tx.moveCall({
      target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
      typeArguments: [this.config.COIN_TYPES.stIOTA],
      arguments: [
        tx.sharedObjectRef(this.config.VAULT_MAP.stIOTA.priceAggregater),
        stIotaCollector,
      ],
    });

    // deal with vIOTA
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
    const vIotaPrice = tx.moveCall({
      target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
      typeArguments: [this.config.COIN_TYPES.vIOTA],
      arguments: [
        tx.sharedObjectRef(this.config.VAULT_MAP.vIOTA.priceAggregater),
        vIotaCollector,
      ],
    });

    return { ...basicPriceResults, stIOTA: stIotaPrice, vIOTA: vIotaPrice };
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
   * Switchboard response, and the queue only accepts one for
   * `max_staleness_seconds` after the oracle signed it — 150s on the configured
   * queue, counted from the signing time rather than from now, so the usable
   * window is shorter than that. Past it,
   * `aggregator_submit_result_action::validate` aborts and takes the whole
   * transaction with it. A transaction held that long must be rebuilt, not
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
    let prepared: PreparedOracleUpdates | undefined;
    if (Number(borrowAmount) > 0 || Number(withdrawAmount) > 0) {
      prepared = await this.prepareOracleUpdates();
      if (!(await this.canPriceCollateral(collateralSymbol, prepared))) {
        throw new Error(
          `No oracle rule could price ${collateralSymbol}: borrowing and withdrawing require a price.`,
        );
      }
    }
    this.transaction.setSender(this.sender);
    return await this.buildManagePosition(inputs, prepared);
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
    prepared?: PreparedOracleUpdates,
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
      const priceResults = await this.aggregatePricesWith(
        prepared ?? (await this.prepareOracleUpdates()),
      );
      // `canPriceCollateral` has already settled this before anything was
      // written, so reaching here means the price went away in between. Kept as
      // a backstop because `updatePosition` turns a missing price into
      // `option::none`, and building a borrow as though no price check were
      // needed is far worse than throwing on a partially built transaction.
      const priceResult = priceResults[collateralSymbol];
      if (!priceResult) {
        throw new Error(
          `No oracle rule could price ${collateralSymbol}: borrowing and withdrawing require a price.`,
        );
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
    const repaymentCoin = await this.splitInputCoins("VUSD", debtAmount);
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
