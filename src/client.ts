import {
  Transaction,
  TransactionArgument,
  TransactionResult,
} from "@iota/iota-sdk/transactions";
import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";

import {
  CDP_PACKAGE_ID,
  CLOCK_OBJ,
  COINS_TYPE_LIST,
  FRAMEWORK_PACKAGE_ID,
  ORACLE_PACKAGE_ID,
  PYTH_RULE_CONFIG_OBJ,
  PYTH_RULE_PACKAGE_ID,
  PYTH_STATE_ID,
  TREASURY_OBJ,
  VAULT_MAP,
  WORMHOLE_STATE_ID,
} from "@/constants";
import {
  VaultInfo,
  VaultResponse,
  COLLATERAL_COIN,
  PositionInfo,
  VaultInfoList,
  // PositionResponse,
  // StabilityPoolBalances,
  // StabilityPoolResponse,
  // StabilityPoolInfo,
} from "@/types";
import {
  getInputCoins,
  // formatBigInt,e
  getObjectFields,
  getPriceResultType,
  // parsePositionObject,
  // parseStabilityPoolObject,
  parseVaultObject,
} from "@/utils";
import {
  IotaPriceServiceConnection,
  IotaPythClient,
} from "@pythnetwork/pyth-iota-js";
import { bcs } from "@iota/iota-sdk/dist/cjs/bcs";

const DUMMY_ADDRESS = "0xcafe";

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
  private transaction: Transaction;

  constructor(
    public network: string = "mainnet",
    public sender: string = DUMMY_ADDRESS,
  ) {
    if (
      network == "mainnet" ||
      network == "testnet" ||
      network == "devnet" ||
      network == "localnet"
    ) {
      this.rpcEndpoint = getFullnodeUrl(network);
    } else {
      this.rpcEndpoint = network as string;
    }

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
    if (debtorAddr === DUMMY_ADDRESS) {
      throw new Error("Debtor address is required");
    }
    tokenList.map((token) => {
      tx.moveCall({
        target: `${CDP_PACKAGE_ID}::vault::try_get_position_data`,
        typeArguments: [COINS_TYPE_LIST[token]],
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

  // async getStabilityPool(): Promise<StabilityPoolInfo> {
  //   const res = await this.iotaClient.getObject({
  //     id: STABILITY_POOL_OBJ.objectId,
  //     options: {
  //       showContent: true,
  //     },
  //   });
  //   const fields = getObjectFields(res) as StabilityPoolResponse;
  //   return parseStabilityPoolObject(fields);
  // }

  // async getStabilityPoolBalances(
  //   account: string,
  // ): Promise<StabilityPoolBalances> {
  //   const tokensRes = await this.iotaClient.getOwnedObjects({
  //     owner: account,
  //     filter: {
  //       StructType: `${ORIGINAL_LIQUIDATION_PACKAGE_ID}::stablility_pool::StabilityToken`,
  //     },
  //     options: {
  //       showContent: true,
  //     },
  //   });
  //   if (tokensRes.data) {
  //     const vusdBalances = tokensRes.data.map((token) => {
  //       const tokenFields = getObjectFields(token);
  //       if (tokenFields) {
  //         return formatBigInt(tokenFields.amount, COIN_DECIMALS.VUSD);
  //       } else {
  //         return 0;
  //       }
  //     });

  //     return {
  //       vusdBalance: vusdBalances.reduce((x, y) => x + y, 0),
  //       collBalances: {
  //         IOTA: 0,
  //         stIOTA: 0,
  //       },
  //     };
  //   } else {
  //     return {
  //       vusdBalance: 0,
  //       collBalances: {
  //         IOTA: 0,
  //         stIOTA: 0,
  //       },
  //     };
  //   }
  // }

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
   * @description Create a price collector
   * @param collateral coin symbol, e.g "IOTA"
   * @return [PriceCollector]
   */
  newPriceCollector(collateralSymbol: COLLATERAL_COIN): TransactionResult {
    return this.transaction.moveCall({
      target: `${ORACLE_PACKAGE_ID}::collector::new`,
      typeArguments: [COINS_TYPE_LIST[collateralSymbol]],
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
    const coinType = COINS_TYPE_LIST[collateralSymbol];
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
    } else {
      // TODO: integrate stIOTA
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
    borrowAmount: string;
    repaymentCoin: TransactionArgument;
    withdrawAmount: string;
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
    const coinType = COINS_TYPE_LIST[collateralSymbol];
    const vaultId = VAULT_MAP[collateralSymbol].vault.objectId;
    const [accountReq] = accountObj
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
    return this.transaction.moveCall({
      target: `${CDP_PACKAGE_ID}::request::debtor_request`,
      typeArguments: [coinType],
      arguments: [
        accountReq,
        this.transaction.sharedObjectRef(TREASURY_OBJ),
        this.transaction.pure.id(vaultId),
        depositCoin,
        this.transaction.pure.u64(borrowAmount),
        repaymentCoin,
        this.transaction.pure.u64(withdrawAmount),
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
      typeArguments: [COINS_TYPE_LIST[collateralSymbol]],
      arguments: [
        this.transaction.sharedObjectRef(vault),
        this.transaction.sharedObjectRef(TREASURY_OBJ),
        this.transaction.sharedObjectRef(CLOCK_OBJ),
        priceResultOpt,
        updateRequest,
      ],
    });
  }

  // depositStabilityPool(
  //   tx: Transaction,
  //   vusdCoin: TransactionArgument,
  // ): TransactionResult {
  //   return tx.moveCall({
  //     target: `${LIQUIDATION_PACKAGE_ID}::stablility_pool::deposit`,
  //     arguments: [tx.sharedObjectRef(STABILITY_POOL_OBJ), vusdCoin],
  //   });
  // }

  // withdrawStabilityPool(
  //   tx: Transaction,
  //   tokens: TransactionArgument[],
  //   amount: string,
  // ): TransactionResult {
  //   const stabilityPool = tx.sharedObjectRef(STABILITY_POOL_OBJ);
  //   const [mainCoin, ...otherCoins] = tokens.map((token) => {
  //     const [vusdCoin] = tx.moveCall({
  //       target: `${LIQUIDATION_PACKAGE_ID}::stablility_pool::withdraw`,
  //       arguments: [stabilityPool, token],
  //     });
  //     return vusdCoin;
  //   });
  //   if (otherCoins.length > 0) {
  //     tx.mergeCoins(mainCoin, otherCoins);
  //   }
  //   const [outCoin] = tx.splitCoins(mainCoin, [amount]);
  //   const [token] = this.depositStabilityPool(tx, mainCoin);
  //   return [outCoin, token] as TransactionResult;
  // }
  //
  //
  //

  /* ----- Transaction Methods ----- */
  async buildManagePositionTransaction(inputs: {
    collateralSymbol: COLLATERAL_COIN;
    depositAmount: string;
    borrowAmount: string;
    repaymentAmount: string;
    withdrawAmount: string;
    accountObjId?: string;
    recipient?: string | "StabilityPool";
  }): Promise<Transaction> {
    const {
      collateralSymbol,
      depositAmount,
      borrowAmount,
      repaymentAmount,
      withdrawAmount,
      accountObjId,
      recipient,
    } = inputs;
    const coinType = COINS_TYPE_LIST[collateralSymbol];
    if (!this.sender) throw new Error("Sender is not set");
    const [depositCoin] = await getInputCoins(
      this.transaction,
      this.iotaClient,
      this.sender,
      coinType,
      depositAmount,
    );
    const [repaymentCoin] = await getInputCoins(
      this.transaction,
      this.iotaClient,
      this.sender,
      COINS_TYPE_LIST.VUSD,
      repaymentAmount,
    );
    const [priceResult] =
      Number(borrowAmount) > 0 || Number(withdrawAmount) > 0
        ? await this.aggregatePrice(collateralSymbol)
        : [undefined];
    const [updateRequest] = this.debtorRequest({
      collateralSymbol,
      depositCoin,
      borrowAmount,
      repaymentCoin,
      withdrawAmount,
      accountObj: accountObjId,
    });
    const [collCoin, vusdCoin] = this.updatePosition({
      collateralSymbol,
      updateRequest,
      priceResult,
    });
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
        // TODO: integrate StabilityPool
        // client.depositStabilityPool(tx, vusdCoin);
        // tx.transferObjects([collCoin], recipient ?? sender);
        this.transaction.transferObjects([vusdCoin], recipient ?? this.sender);
      } else {
        this.transaction.transferObjects([vusdCoin], recipient ?? this.sender);
      }
    } else {
      this.transaction.moveCall({
        target: "0x2::coin::destroy_zero",
        typeArguments: [COINS_TYPE_LIST.VUSD],
        arguments: [vusdCoin],
      });
    }
    return this.transaction;
  }
}
