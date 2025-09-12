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
  isDepositPointBonusCoin,
  DEPOSIT_POINT_BONUS_COIN,
  CdpPositionsResponse,
  PoolPositionsResponse,
} from "@/types";
import { getObjectFields, parseVaultObject } from "@/utils";
import {
  IotaPriceServiceConnection,
  IotaPythClient,
} from "@pythnetwork/pyth-iota-js";
import { bcs } from "@iota/iota-sdk/bcs";
import { normalizeIotaAddress } from "@iota/iota-sdk/utils";
import { Keypair } from "@iota/iota-sdk/cryptography";

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
  private pythConnection: IotaPriceServiceConnection;
  private pythClient: IotaPythClient;
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
    this.pythConnection = new IotaPriceServiceConnection(
      "https://hermes.pyth.network",
    );
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    this.pythClient = new IotaPythClient(
      this.iotaClient as any,
      this.config.PYTH_STATE_ID,
      this.config.WORMHOLE_STATE_ID,
    );
    this.transaction = new Transaction();
  }

  /* ----- Getter ----- */

  /**
   * @description Get this.iotaClient
   */
  getIotaClient(): IotaClient {
    return this.iotaClient;
  }

  /**
   * @description Get this.pythConnection
   */
  getPythConnection(): IotaPriceServiceConnection {
    return this.pythConnection;
  }

  /**
   * @description Get this.pythClient
   */
  getPythClient(): IotaPythClient {
    return this.pythClient;
  }

  /* ----- Query ----- */

  /**
   * @description
   */
  async getPrice(symbol: COLLATERAL_COIN): Promise<number> {
    this.resetTransaction();
    await this.aggregatePrice(symbol);
    this.transaction.setSender(DUMMY_ADDRESS);
    const dryrunRes = await this.dryrunTransaction();
    this.resetTransaction();
    const priceResult = dryrunRes.events.find((e) =>
      e.type.includes("PriceAggregated"),
    );
    const pricePrecision = 10 ** 9;

    if (priceResult) {
      return +(priceResult.parsedJson as any).result / pricePrecision;
    } else {
      return 0;
    }
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
      (pos.coll_types as any[]).map(
        (t, idx) =>
          (collAmounts["0x" + t.fields.name] = Number(pos.coll_amounts[idx])),
      );
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
  newPriceCollector(collateralSymbol: COLLATERAL_COIN): TransactionArgument {
    return this.transaction.moveCall({
      target: `${this.config.ORACLE_PACKAGE_ID}::collector::new`,
      typeArguments: [this.config.COIN_TYPES[collateralSymbol]],
    });
  }

  /**
   * @description Get a price result
   * @param collateral coin symbol, e.g "IOTA"
   * @return [PriceResult]
   */
  async aggregatePrice(
    collateralSymbol: COLLATERAL_COIN,
  ): Promise<TransactionArgument> {
    const collector = this.newPriceCollector(collateralSymbol);
    const coinType = this.config.COIN_TYPES[collateralSymbol];
    const vaultInfo = this.config.VAULT_MAP[collateralSymbol];
    if (vaultInfo.pythPriceId) {
      const updateData = await this.pythConnection.getPriceFeedsUpdateData([
        vaultInfo.pythPriceId,
      ]);
      const [priceInfoObjId] = await this.pythClient.updatePriceFeeds(
        this.transaction as any,
        updateData,
        [vaultInfo.pythPriceId],
      );
      this.transaction.moveCall({
        target: `${this.config.PYTH_RULE_PACKAGE_ID}::pyth_rule::feed`,
        typeArguments: [coinType],
        arguments: [
          collector,
          this.transaction.sharedObjectRef(this.config.PYTH_RULE_CONFIG_OBJ),
          this.transaction.object.clock(),
          this.transaction.object(this.config.PYTH_STATE_ID),
          this.transaction.object(priceInfoObjId),
        ],
      });
      return this.transaction.moveCall({
        target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
        typeArguments: [coinType],
        arguments: [
          this.transaction.sharedObjectRef(vaultInfo.priceAggregater),
          collector,
        ],
      });
    } else if (collateralSymbol === "stIOTA") {
      const collector = this.newPriceCollector("stIOTA");
      const iotaPriceResult = await this.aggregatePrice("IOTA");
      this.transaction.moveCall({
        target: `${this.config.CERT_RULE_PACKAGE_ID}::cert_rule::feed`,
        arguments: [
          collector,
          iotaPriceResult,
          this.transaction.sharedObjectRef(this.config.CERT_NATIVE_POOL_OBJ),
          this.transaction.sharedObjectRef(this.config.CERT_METADATA_OBJ),
        ],
      });
      return this.transaction.moveCall({
        target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
        typeArguments: [this.config.COIN_TYPES.stIOTA],
        arguments: [
          this.transaction.sharedObjectRef(vaultInfo.priceAggregater),
          collector,
        ],
      });
    } else {
      return this.aggregatePrice("IOTA");
    }
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
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const [depositCoin] = await this.splitInputCoins(
      collateralSymbol,
      depositAmount,
    );
    const [repaymentCoin] = await this.splitInputCoins("VUSD", repaymentAmount);
    if (Number(borrowAmount) > 0 || Number(withdrawAmount) > 0) {
      const priceResult = await this.aggregatePrice(collateralSymbol);
      const updateRequest = this.debtorRequest({
        collateralSymbol,
        depositCoin,
        borrowAmount,
        repaymentCoin,
        withdrawAmount,
        accountObj: accountObjId,
      });
      const checkedUpdateRequest = this.checkRequest({
        collateralSymbol,
        request: updateRequest,
      });
      const [collCoin, vusdCoin, response] = this.updatePosition({
        collateralSymbol,
        updateRequest: checkedUpdateRequest,
        priceResult,
      });
      // emit point
      if (isDepositPointBonusCoin(collateralSymbol))
        this.emitPointForDepositAction(collateralSymbol, response);

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
      this.resetTransaction();
      return tx;
    } else {
      const updateRequest = this.debtorRequest({
        collateralSymbol,
        depositCoin,
        borrowAmount,
        repaymentCoin,
        withdrawAmount,
        accountObj: accountObjId,
      });
      const [collCoin, vusdCoin, response] = this.updatePosition({
        collateralSymbol,
        updateRequest,
      });
      // emit point
      if (isDepositPointBonusCoin(collateralSymbol))
        this.emitPointForDepositAction(collateralSymbol, response);

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
    const updateRequest = this.debtorRequest({
      collateralSymbol,
      depositCoin: this.zeroCoin(collateralSymbol),
      borrowAmount: "0",
      repaymentCoin,
      withdrawAmount: collAmount,
      accountObj: accountObjId,
    });
    const [collCoin, vusdCoin, response] = this.updatePosition({
      collateralSymbol,
      updateRequest,
    });
    // emit point
    if (isDepositPointBonusCoin(collateralSymbol))
      this.emitPointForDepositAction(collateralSymbol, response);

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
  async buildClaimStabilityPoolTransaction(inputs: {
    accountObj?: string;
    keepTransaction?: boolean;
  }): Promise<Transaction> {
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
  emitPointForDepositAction(
    collateralSymbol: DEPOSIT_POINT_BONUS_COIN,
    response: TransactionArgument,
  ) {
    if (this.config.POINT_PACKAGE_ID) {
      this.transaction.moveCall({
        target: `${this.config.POINT_PACKAGE_ID}::point::emit_point_for_deposit_action`,
        typeArguments: [this.config.COIN_TYPES[collateralSymbol]],
        arguments: [
          this.transaction.sharedObjectRef(
            this.config.POINT_GLOBAL_CONFIG_SHARED_OBJECT_REF,
          ),
          this.transaction.sharedObjectRef(
            this.config.POINT_HANDLER_MAP[collateralSymbol],
          ),
          this.transaction.sharedObjectRef(
            this.config.VAULT_MAP[collateralSymbol].vault,
          ),
          response,
          this.transaction.object.clock(),
        ],
      });
    }
  }
}
