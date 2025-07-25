import {
  Transaction,
  TransactionArgument,
  TransactionResult,
} from "@iota/iota-sdk/transactions";
import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";

import {
  CDP_PACKAGE_ID,
  CERT_METADATA_OBJ,
  CERT_NATIVE_POOL_OBJ,
  CERT_RULE_PACKAGE_ID,
  CLOCK_OBJ,
  COIN_TYPES,
  DEPOSIT_POINT_BONUS_COIN,
  FRAMEWORK_PACKAGE_ID,
  INCENTIVE_GLOBAL_CONFIG_OBJ,
  INCENTIVE_PACKAGE_ID,
  isDepositPointBonusCoin,
  ORACLE_PACKAGE_ID,
  POINT_GLOBAL_CONFIG_SHARED_OBJECT_REF,
  POINT_HANDLER_MAP,
  POINT_PACKAGE_ID,
  POOL_REWARDER_REGISTRY_OBJ,
  PYTH_RULE_CONFIG_OBJ,
  PYTH_RULE_PACKAGE_ID,
  PYTH_STATE_ID,
  STABILITY_POOL_OBJ,
  STABILITY_POOL_PACKAGE_ID,
  STABILITY_POOL_REWARDERS,
  STABILITY_POOL_TABLE_ID,
  TREASURY_OBJ,
  VAULT_MAP,
  VAULT_REWARDER_REGISTRY_OBJ,
  WORMHOLE_STATE_ID,
} from "@/constants";
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
} from "@/types";
import { getObjectFields, getPriceResultType, parseVaultObject } from "@/utils";
import {
  IotaPriceServiceConnection,
  IotaPythClient,
} from "@pythnetwork/pyth-iota-js";
import { bcs } from "@iota/iota-sdk/bcs";
import { isValidIotaAddress } from "@iota/iota-sdk/utils";

const getCoinSymbol = (coinType: string) => {
  const coin = Object.keys(COIN_TYPES).find(
    (key) => COIN_TYPES[key as COIN] === coinType,
  );
  if (coin) {
    return coin as COIN;
  }
  return undefined;
};

export class VirtueClient {
  /**
   * @description a TS wrapper over Virtue CDP client.
   * @param network connection to fullnode: 'mainnet' | 'testnet' | 'devnet' | 'localnet' | string
   * @param owner (optional) address of the current user (default: DUMMY_ADDRESS)
   */
  private rpcEndpoint: string;
  private iotaClient: IotaClient;
  private pythConnection: IotaPriceServiceConnection;
  private pythClient: IotaPythClient;
  public transaction: Transaction;
  public sender: string;

  constructor(inputs: { rpcUrl?: string; sender: string }) {
    const { rpcUrl, sender } = inputs;
    this.rpcEndpoint = rpcUrl ?? getFullnodeUrl("mainnet");
    if (!isValidIotaAddress(sender)) {
      throw new Error("Invalid sender address");
    }
    this.sender = sender;
    this.iotaClient = new IotaClient({ url: this.rpcEndpoint });
    this.pythConnection = new IotaPriceServiceConnection(
      "https://hermes.pyth.network",
    );
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    this.pythClient = new IotaPythClient(
      this.iotaClient as any,
      PYTH_STATE_ID,
      WORMHOLE_STATE_ID,
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
   * @description Get all vault objects
   */
  async getAllVaults(): Promise<VaultInfoList> {
    // Get objectId from VAULT_MAP and get all vaults
    const vaultObjectIds = Object.values(VAULT_MAP).map(
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
      const token = Object.keys(VAULT_MAP).find(
        (key) =>
          VAULT_MAP[key as COLLATERAL_COIN].vault.objectId ===
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
      id: VAULT_MAP[token].vault.objectId,
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
    const clockObj = tx.sharedObjectRef(CLOCK_OBJ);
    const tokenList = Object.keys(VAULT_MAP) as COLLATERAL_COIN[];
    const debtorAddr = debtor ?? this.sender;
    if (!isValidIotaAddress(debtorAddr)) {
      throw new Error("Invalid debtor address");
    }
    tokenList.map((token) => {
      tx.moveCall({
        target: `${CDP_PACKAGE_ID}::vault::try_get_position_data`,
        typeArguments: [COIN_TYPES[token]],
        arguments: [
          tx.sharedObjectRef(VAULT_MAP[token].vault),
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
      id: STABILITY_POOL_OBJ.objectId,
      options: {
        showContent: true,
      },
    });
    const fields = getObjectFields(res);

    if (!fields) {
      return { vusdBalance: 0 };
    }

    return { vusdBalance: fields.vusd_balance };
  }

  /**
   * @description Get user's balances in stability pool
   */
  async getStabilityPoolBalances(
    account?: string,
  ): Promise<StabilityPoolBalances> {
    const accountAddr = account ?? this.sender;
    if (!isValidIotaAddress(accountAddr)) {
      throw new Error("Invalid account address");
    }
    const res = await this.iotaClient.getDynamicFieldObject({
      parentId: STABILITY_POOL_TABLE_ID,
      name: {
        type: "address",
        value: accountAddr,
      },
    });
    const collBalances: Partial<Record<COLLATERAL_COIN, number>> = {};
    Object.keys(VAULT_MAP).map((collSymbol) => {
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
      const coinSymbol = getCoinSymbol(coinType);
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
    if (!isValidIotaAddress(accountAddr)) {
      throw new Error("Invalid debtor address");
    }
    const tx = new Transaction();
    const vaultInfo = VAULT_MAP[collateralSymbol];
    const rewarders = vaultInfo.rewarders;
    const vaultObj = tx.sharedObjectRef(vaultInfo.vault);
    if (!rewarders) return {};
    rewarders.map((rewarder) => {
      tx.moveCall({
        target: `${INCENTIVE_PACKAGE_ID}::borrow_incentive::realtime_reward_amount`,
        typeArguments: [
          COIN_TYPES[collateralSymbol],
          COIN_TYPES[rewarder.rewardSymbol],
        ],
        arguments: [
          tx.sharedObjectRef(rewarder),
          vaultObj,
          tx.pure.address(accountAddr),
          tx.sharedObjectRef(CLOCK_OBJ),
        ],
      });
    });
    const res = await this.iotaClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: accountAddr,
    });
    console.log(res.results);
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
    if (!isValidIotaAddress(accountAddr)) {
      throw new Error("Invalid debtor address");
    }

    STABILITY_POOL_REWARDERS.map((rewarder) => {
      tx.moveCall({
        target: `${INCENTIVE_PACKAGE_ID}::stability_pool_incentive::realtime_reward_amount`,
        typeArguments: [COIN_TYPES[rewarder.rewardSymbol]],
        arguments: [
          tx.sharedObjectRef(rewarder),
          this.transaction.sharedObjectRef(STABILITY_POOL_OBJ),
          tx.pure.address(accountAddr),
          tx.sharedObjectRef(CLOCK_OBJ),
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
      const rewarder = STABILITY_POOL_REWARDERS[idx];
      if (value.returnValues) {
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

  /* ----- Transaction Utils ----- */

  /**
   * @description new zero coin
   */
  zeroCoin(coinSymbol: COIN): TransactionResult {
    return this.transaction.moveCall({
      target: "0x2::coin::zero",
      typeArguments: [COIN_TYPES[coinSymbol]],
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
        const coinType = COIN_TYPES[coinSymbol];
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

  /**
   * @description Create a AccountRequest
   * @param accountObj (optional): Account object or EOA if undefined
   * @return [AccountRequest]
   */
  newAccountRequest(
    accountObj?: string | TransactionArgument,
  ): TransactionResult {
    return accountObj
      ? this.transaction.moveCall({
          target: `${FRAMEWORK_PACKAGE_ID}::account::request_with_account`,
          arguments: [
            typeof accountObj === "string"
              ? this.transaction.object(accountObj)
              : accountObj,
          ],
        })
      : this.transaction.moveCall({
          target: `${FRAMEWORK_PACKAGE_ID}::account::request`,
        });
  }

  /**
   * @description Create a price collector
   * @param collateral coin symbol, e.g "IOTA"
   * @return [PriceCollector]
   */
  newPriceCollector(collateralSymbol: COLLATERAL_COIN): TransactionResult {
    return this.transaction.moveCall({
      target: `${ORACLE_PACKAGE_ID}::collector::new`,
      typeArguments: [COIN_TYPES[collateralSymbol]],
    });
  }

  /**
   * @description Get a price result
   * @param collateral coin symbol, e.g "IOTA"
   * @return [PriceResult]
   */
  async aggregatePrice(
    collateralSymbol: COLLATERAL_COIN,
  ): Promise<TransactionResult> {
    const [collector] = this.newPriceCollector(collateralSymbol);
    const coinType = COIN_TYPES[collateralSymbol];
    const vaultInfo = VAULT_MAP[collateralSymbol];
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
        target: `${PYTH_RULE_PACKAGE_ID}::pyth_rule::feed`,
        typeArguments: [coinType],
        arguments: [
          collector,
          this.transaction.sharedObjectRef(PYTH_RULE_CONFIG_OBJ),
          this.transaction.sharedObjectRef(CLOCK_OBJ),
          this.transaction.object(PYTH_STATE_ID),
          this.transaction.object(priceInfoObjId),
        ],
      });
      return this.transaction.moveCall({
        target: `${ORACLE_PACKAGE_ID}::aggregater::aggregate`,
        typeArguments: [coinType],
        arguments: [
          this.transaction.sharedObjectRef(vaultInfo.priceAggregater),
          collector,
        ],
      });
    } else if (collateralSymbol === "stIOTA") {
      const [collector] = this.newPriceCollector("stIOTA");
      const [iotaPriceResult] = await this.aggregatePrice("IOTA");
      this.transaction.moveCall({
        target: `${CERT_RULE_PACKAGE_ID}::cert_rule::feed`,
        arguments: [
          collector,
          iotaPriceResult,
          this.transaction.sharedObjectRef(CERT_NATIVE_POOL_OBJ),
          this.transaction.sharedObjectRef(CERT_METADATA_OBJ),
        ],
      });
      return this.transaction.moveCall({
        target: `${ORACLE_PACKAGE_ID}::aggregater::aggregate`,
        typeArguments: [COIN_TYPES.stIOTA],
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
   * @returns [UpdateRequest]
   */
  debtorRequest(inputs: {
    collateralSymbol: COLLATERAL_COIN;
    depositCoin: TransactionArgument;
    borrowAmount: string | TransactionArgument;
    repaymentCoin: TransactionArgument;
    withdrawAmount: string | TransactionArgument;
    accountObj?: string | TransactionArgument;
  }): TransactionResult {
    const {
      collateralSymbol,
      depositCoin,
      borrowAmount,
      repaymentCoin,
      withdrawAmount,
      accountObj,
    } = inputs;
    const coinType = COIN_TYPES[collateralSymbol];
    const vaultId = VAULT_MAP[collateralSymbol].vault.objectId;
    const [accountReq] = this.newAccountRequest(accountObj);
    return this.transaction.moveCall({
      target: `${CDP_PACKAGE_ID}::request::debtor_request`,
      typeArguments: [coinType],
      arguments: [
        accountReq,
        this.transaction.sharedObjectRef(TREASURY_OBJ),
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
   * @returns [Coin<T>, COIN<VUSD>]
   */
  updatePosition(inputs: {
    collateralSymbol: COLLATERAL_COIN;
    updateRequest: TransactionArgument;
    priceResult?: TransactionArgument;
  }): TransactionResult {
    const { collateralSymbol, updateRequest, priceResult } = inputs;
    const vault = VAULT_MAP[collateralSymbol].vault;
    const priceResultOpt = priceResult
      ? this.transaction.moveCall({
          target: `0x1::option::some`,
          typeArguments: [getPriceResultType(collateralSymbol)],
          arguments: [priceResult],
        })
      : this.transaction.moveCall({
          target: `0x1::option::none`,
          typeArguments: [getPriceResultType(collateralSymbol)],
        });
    return this.transaction.moveCall({
      target: `${CDP_PACKAGE_ID}::vault::update_position`,
      typeArguments: [COIN_TYPES[collateralSymbol]],
      arguments: [
        this.transaction.sharedObjectRef(vault),
        this.transaction.sharedObjectRef(TREASURY_OBJ),
        this.transaction.sharedObjectRef(CLOCK_OBJ),
        priceResultOpt,
        updateRequest,
      ],
    });
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
    let updateResponse = response;
    const vault = VAULT_MAP[collateralSymbol].vault;
    const vaultObj = this.transaction.sharedObjectRef(vault);
    const collateralType = COIN_TYPES[collateralSymbol];
    const rewarders = VAULT_MAP[collateralSymbol].rewarders;
    const globalConfigObj = this.transaction.sharedObjectRef(
      INCENTIVE_GLOBAL_CONFIG_OBJ,
    );
    const registryObj = this.transaction.sharedObjectRef(
      VAULT_REWARDER_REGISTRY_OBJ,
    );
    const clockObj = this.transaction.sharedObjectRef(CLOCK_OBJ);
    const checker = this.transaction.moveCall({
      target: `${INCENTIVE_PACKAGE_ID}::borrow_incentive::new_checker`,
      typeArguments: [collateralType],
      arguments: [registryObj, globalConfigObj, updateResponse],
    });
    (rewarders ?? []).map((rewarder) => {
      const rewardType = COIN_TYPES[rewarder.rewardSymbol];
      this.transaction.moveCall({
        target: `${INCENTIVE_PACKAGE_ID}::borrow_incentive::update`,
        typeArguments: [collateralType, rewardType],
        arguments: [
          checker,
          globalConfigObj,
          vaultObj,
          this.transaction.sharedObjectRef(rewarder),
          clockObj,
        ],
      });
    });
    const [responseAfterIncentive] = this.transaction.moveCall({
      target: `${INCENTIVE_PACKAGE_ID}::borrow_incentive::destroy_checker`,
      typeArguments: [collateralType],
      arguments: [checker, globalConfigObj],
    });
    updateResponse = responseAfterIncentive;
    this.transaction.moveCall({
      target: `${CDP_PACKAGE_ID}::vault::destroy_response`,
      typeArguments: [COIN_TYPES[collateralSymbol]],
      arguments: [
        vaultObj,
        this.transaction.sharedObjectRef(TREASURY_OBJ),
        updateResponse,
      ],
    });
  }

  /**
   * @description deposit to stability pool
   * @param vusdCoin: coin of VUSD
   * @param recipient (optional): deposit for recipient instead of sender
   * @returns [PositionResponse]
   */
  depositStabilityPool(inputs: {
    vusdCoin: TransactionArgument;
    recipient?: string;
  }): TransactionResult {
    const { vusdCoin, recipient } = inputs;
    return this.transaction.moveCall({
      target: `${STABILITY_POOL_PACKAGE_ID}::stability_pool::deposit`,
      arguments: [
        this.transaction.sharedObjectRef(STABILITY_POOL_OBJ),
        this.transaction.sharedObjectRef(CLOCK_OBJ),
        this.transaction.pure.address(recipient ?? this.sender),
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
  }): TransactionResult {
    const { amount, accountRequest, accountObj } = inputs;
    const [accountReq] = accountRequest
      ? [accountRequest]
      : this.newAccountRequest(accountObj);
    return this.transaction.moveCall({
      target: `${STABILITY_POOL_PACKAGE_ID}::stability_pool::withdraw`,
      arguments: [
        this.transaction.sharedObjectRef(STABILITY_POOL_OBJ),
        this.transaction.sharedObjectRef(CLOCK_OBJ),
        accountReq,
        this.transaction.pure.u64(amount),
      ],
    });
  }

  /**
   * @description claim from stability pool
   */
  claimStabilityPool(inputs: {
    accountRequest?: TransactionArgument;
    accountObj?: string | TransactionArgument;
  }): TransactionArgument[] {
    const { accountRequest, accountObj } = inputs;
    const [accountReq] = accountRequest
      ? [accountRequest]
      : this.newAccountRequest(accountObj);
    const collCoins = Object.keys(VAULT_MAP).map((collSymbol) => {
      const collType = COIN_TYPES[collSymbol as COLLATERAL_COIN];
      const [collCoin] = this.transaction.moveCall({
        target: `${STABILITY_POOL_OBJ}::stability_pool::claim`,
        typeArguments: [collType],
        arguments: [
          this.transaction.sharedObjectRef(STABILITY_POOL_OBJ),
          accountReq,
        ],
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
    const globalConfigObj = this.transaction.sharedObjectRef(
      INCENTIVE_GLOBAL_CONFIG_OBJ,
    );
    const registryObj = this.transaction.sharedObjectRef(
      POOL_REWARDER_REGISTRY_OBJ,
    );
    const clockObj = this.transaction.sharedObjectRef(CLOCK_OBJ);
    const checker = this.transaction.moveCall({
      target: `${INCENTIVE_PACKAGE_ID}::stability_pool_incentive::new_checker`,
      arguments: [registryObj, globalConfigObj, positionResponse],
    });
    (STABILITY_POOL_REWARDERS ?? []).map((rewarder) => {
      const rewardType = COIN_TYPES[rewarder.rewardSymbol];
      this.transaction.moveCall({
        target: `${INCENTIVE_PACKAGE_ID}::stability_pool_incentive::update`,
        typeArguments: [rewardType],
        arguments: [
          checker,
          globalConfigObj,
          this.transaction.sharedObjectRef(STABILITY_POOL_OBJ),
          this.transaction.sharedObjectRef(rewarder),
          clockObj,
        ],
      });
    });
    const [responseAfterIncentive] = this.transaction.moveCall({
      target: `${INCENTIVE_PACKAGE_ID}::stability_pool_incentive::destroy_checker`,
      arguments: [checker, globalConfigObj],
    });
    positionResponse = responseAfterIncentive;

    this.transaction.moveCall({
      target: `${STABILITY_POOL_PACKAGE_ID}::stability_pool::check_response`,
      arguments: [
        this.transaction.sharedObjectRef(STABILITY_POOL_OBJ),
        positionResponse,
      ],
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
  }): Promise<Transaction> {
    this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const {
      collateralSymbol,
      depositAmount,
      borrowAmount,
      repaymentAmount,
      withdrawAmount,
      accountObjId,
      recipient,
    } = inputs;
    const coinType = COIN_TYPES[collateralSymbol];
    const [depositCoin] = await this.splitInputCoins(
      collateralSymbol,
      depositAmount,
    );
    const [repaymentCoin] = await this.splitInputCoins("VUSD", repaymentAmount);
    if (Number(borrowAmount) > 0 || Number(withdrawAmount) > 0) {
      const [priceResult] = await this.aggregatePrice(collateralSymbol);
      const [updateRequest] = this.debtorRequest({
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
        priceResult,
      });
      // emit point
      if (isDepositPointBonusCoin(collateralSymbol))
        this.emitPointForDepositAction(collateralSymbol, response);

      this.checkResponse({ collateralSymbol, response });
      if (Number(withdrawAmount) > 0) {
        this.transaction.transferObjects([collCoin], recipient ?? this.sender);
      } else {
        this.transaction.moveCall({
          target: "0x2::coin::destroy_zero",
          typeArguments: [coinType],
          arguments: [collCoin],
        });
      }
      if (Number(borrowAmount) > 0) {
        if (recipient === "StabilityPool") {
          const [response] = this.depositStabilityPool({ vusdCoin, recipient });
          this.checkResponseForStabilityPool(response);
        } else {
          this.transaction.transferObjects(
            [vusdCoin],
            recipient ?? this.sender,
          );
        }
      } else {
        this.transaction.moveCall({
          target: "0x2::coin::destroy_zero",
          typeArguments: [COIN_TYPES.VUSD],
          arguments: [vusdCoin],
        });
      }
      const tx = this.getTransaction();
      this.resetTransaction();
      return tx;
    } else {
      const [updateRequest] = this.debtorRequest({
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
      this.transaction.moveCall({
        target: "0x2::coin::destroy_zero",
        typeArguments: [coinType],
        arguments: [collCoin],
      });
      this.transaction.moveCall({
        target: "0x2::coin::destroy_zero",
        typeArguments: [COIN_TYPES.VUSD],
        arguments: [vusdCoin],
      });
      const tx = this.getTransaction();
      this.resetTransaction();
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
  }): Promise<Transaction> {
    this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const { collateralSymbol, accountObjId, recipient } = inputs;
    const collType = COIN_TYPES[collateralSymbol];
    const vaultObj = VAULT_MAP[collateralSymbol].vault;
    const [collAmount, debtAmount] = this.transaction.moveCall({
      target: `${CDP_PACKAGE_ID}::vault::get_position_data`,
      typeArguments: [collType],
      arguments: [
        this.transaction.sharedObjectRef(vaultObj),
        this.transaction.pure.address(this.sender),
        this.transaction.sharedObjectRef(CLOCK_OBJ),
      ],
    });
    const repaymentCoin = await this.splitInputCoins("VUSD", debtAmount);
    const [updateRequest] = this.debtorRequest({
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
    this.transaction.moveCall({
      target: "0x2::coin::destroy_zero",
      typeArguments: [COIN_TYPES.VUSD],
      arguments: [vusdCoin],
    });
    this.transaction.transferObjects(
      [collCoin],
      recipient ?? this.transaction.pure.address(this.sender),
    );

    const tx = this.getTransaction();
    this.resetTransaction();
    return tx;
  }

  /**
   * @description build and return Transaction of deposit stability pool
   * @param depositAmount: how much amount to deposit (collateral)
   * @returns Transaction
   */
  async buildDepositStabilityPoolTransaction(inputs: {
    depositAmount: string;
    recipient?: string;
  }): Promise<Transaction> {
    this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const { depositAmount, recipient } = inputs;
    const [vusdCoin] = await this.splitInputCoins("VUSD", depositAmount);
    const [response] = this.depositStabilityPool({ vusdCoin, recipient });
    this.checkResponseForStabilityPool(response);
    const tx = this.getTransaction();
    this.resetTransaction();
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
  }): Promise<Transaction> {
    this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const { withdrawAmount: amount, accountObj } = inputs;
    const [vusdOut, response] = this.withdrawStabilityPool({
      amount,
      accountObj,
    });
    this.checkResponseForStabilityPool(response);
    this.transaction.transferObjects([vusdOut], this.sender);
    const tx = this.getTransaction();
    this.resetTransaction();
    return tx;
  }

  /**
   * @description build and return Transaction of withdraw stability pool
   * @param withdrawAmount: how much amount to withdraw (collateral)
   * @returns Transaction
   */
  async buildClaimStabilityPoolTransaction(inputs: {
    accountObj?: string;
  }): Promise<Transaction> {
    this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const collCoins = this.claimStabilityPool(inputs);
    this.transaction.transferObjects(collCoins, this.sender);
    const tx = this.getTransaction();
    this.resetTransaction();
    return tx;
  }

  /**
   * @description claim the rewards from borrow incentive program
   */
  buildClaimBorrowRewards(inputs: {
    accountObj?: string | TransactionArgument;
  }): Transaction {
    this.resetTransaction();
    const { accountObj } = inputs;
    const [accountReq] = this.newAccountRequest(accountObj);
    const globalConfigObj = this.transaction.sharedObjectRef(
      INCENTIVE_GLOBAL_CONFIG_OBJ,
    );
    const clockObj = this.transaction.sharedObjectRef(CLOCK_OBJ);
    Object.keys(VAULT_MAP).map((collSymbol) => {
      const vaultInfo = VAULT_MAP[collSymbol as COLLATERAL_COIN];
      const rewarders = vaultInfo.rewarders;
      const vaultObj = this.transaction.sharedObjectRef(vaultInfo.vault);
      if (rewarders) {
        rewarders.map((rewarder) => {
          const [reward] = this.transaction.moveCall({
            target: `${INCENTIVE_PACKAGE_ID}::borrow_incentive::claim`,
            typeArguments: [COIN_TYPES[rewarder.rewardSymbol]],
            arguments: [
              this.transaction.sharedObjectRef(rewarder),
              globalConfigObj,
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
    this.resetTransaction();
    return tx;
  }

  /**
   * @description claim the rewards from stability pool incentive program
   */
  buildClaimStabilityPoolRewards(inputs: {
    accountObj?: string | TransactionArgument;
  }): Transaction {
    this.resetTransaction();
    const { accountObj } = inputs;
    const [accountReq] = this.newAccountRequest(accountObj);
    const globalConfigObj = this.transaction.sharedObjectRef(
      INCENTIVE_GLOBAL_CONFIG_OBJ,
    );
    const clockObj = this.transaction.sharedObjectRef(CLOCK_OBJ);
    const stabilityPoolObj =
      this.transaction.sharedObjectRef(STABILITY_POOL_OBJ);
    STABILITY_POOL_REWARDERS.map((rewarder) => {
      const [reward] = this.transaction.moveCall({
        target: `${INCENTIVE_PACKAGE_ID}::stability_pool_incentive::claim`,
        typeArguments: [COIN_TYPES[rewarder.rewardSymbol]],
        arguments: [
          this.transaction.sharedObjectRef(rewarder),
          globalConfigObj,
          stabilityPoolObj,
          accountReq,
          clockObj,
        ],
      });
      this.transaction.transferObjects([reward], this.sender);
    });
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
    this.transaction.moveCall({
      target: `${POINT_PACKAGE_ID}::point::emit_point_for_deposit_action`,
      typeArguments: [COIN_TYPES[collateralSymbol]],
      arguments: [
        this.transaction.sharedObjectRef(POINT_GLOBAL_CONFIG_SHARED_OBJECT_REF),
        this.transaction.sharedObjectRef(POINT_HANDLER_MAP[collateralSymbol]),
        this.transaction.sharedObjectRef(VAULT_MAP[collateralSymbol].vault),
        response,
        this.transaction.object.clock(),
      ],
    });
  }
}
