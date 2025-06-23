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

const DUMMY_ADDRESS = "0x0";

export class VirtueClient {
  /**
   * @description a TS wrapper over Virtue CDP client.
   * @param network connection to fullnode: 'mainnet' | 'testnet' | 'devnet' | 'localnet' | string
   * @param owner (optional) address of the current user (default: DUMMY_ADDRESS)
   */
  private rpcEndpoint: string;
  private client: IotaClient;
  private pythConnection: IotaPriceServiceConnection;
  private pythClient: IotaPythClient;

  constructor(
    public network: string = "mainnet",
    public owner: string = DUMMY_ADDRESS,
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

    this.client = new IotaClient({ url: this.rpcEndpoint });
    this.pythConnection = new IotaPriceServiceConnection(
      "https://hermes.pyth.network",
    );
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    this.pythClient = new IotaPythClient(
      this.client as any,
      PYTH_STATE_ID,
      WORMHOLE_STATE_ID,
    );
  }

  getClient() {
    return this.client;
  }

  // Query
  /**
   * @description Get all vault objects
   */
  async getAllVaults(): Promise<VaultInfoList> {
    // Get objectId from VAULT_MAP and get all vaults
    const vaultObjectIds = Object.values(VAULT_MAP).map(
      (v) => v.vault.objectId,
    );
    const vaultResults = await this.client.multiGetObjects({
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
    const res = await this.client.getObject({
      id: VAULT_MAP[token].vault.objectId,
      options: {
        showContent: true,
      },
    });
    const fields = getObjectFields(res) as VaultResponse;

    return parseVaultObject(token, fields);
  }

  async getPositionsByDebtor(debtor: string): Promise<PositionInfo[]> {
    const tx = new Transaction();
    const clockObj = tx.sharedObjectRef(CLOCK_OBJ);
    const tokenList = Object.keys(VAULT_MAP) as COLLATERAL_COIN[];
    tokenList.map((token) => {
      tx.moveCall({
        target: `${CDP_PACKAGE_ID}::vault::try_get_position_data`,
        typeArguments: [COINS_TYPE_LIST[token]],
        arguments: [
          tx.sharedObjectRef(VAULT_MAP[token].vault),
          tx.pure.address(debtor),
          clockObj,
        ],
      });
    });

    const res = await this.getClient().devInspectTransactionBlock({
      transactionBlock: tx,
      sender: debtor,
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
  //   const res = await this.client.getObject({
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
  //   const tokensRes = await this.client.getOwnedObjects({
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

  /**
   * @description Create a price collector
   * @param collateral coin symbol, e.g "IOTA"
   */
  newPriceCollector(
    tx: Transaction,
    collateralSymbol: COLLATERAL_COIN,
  ): TransactionResult {
    return tx.moveCall({
      target: `${ORACLE_PACKAGE_ID}::collector::new`,
      typeArguments: [COINS_TYPE_LIST[collateralSymbol]],
    });
  }

  /**
   * @description Get a price result
   * @param collateral coin symbol, e.g "IOTA"
   */
  async aggregatePrice(
    tx: Transaction,
    collateralSymbol: COLLATERAL_COIN,
  ): Promise<TransactionResult> {
    const [collector] = this.newPriceCollector(tx, collateralSymbol);
    const coinType = COINS_TYPE_LIST[collateralSymbol];
    const vaultInfo = VAULT_MAP[collateralSymbol];
    if (vaultInfo.pythPriceId) {
      const updateData = await this.pythConnection.getPriceFeedsUpdateData([
        vaultInfo.pythPriceId,
      ]);
      const [priceInfoObjId] = await this.pythClient.updatePriceFeeds(
        tx as any,
        updateData,
        [vaultInfo.pythPriceId],
      );
      tx.moveCall({
        target: `${PYTH_RULE_PACKAGE_ID}::pyth_rule::feed`,
        typeArguments: [coinType],
        arguments: [
          collector,
          tx.sharedObjectRef(PYTH_RULE_CONFIG_OBJ),
          tx.sharedObjectRef(CLOCK_OBJ),
          tx.object(PYTH_STATE_ID),
          tx.object(priceInfoObjId),
        ],
      });
      return tx.moveCall({
        target: `${ORACLE_PACKAGE_ID}::aggregater::aggregate`,
        typeArguments: [coinType],
        arguments: [tx.sharedObjectRef(vaultInfo.priceAggregater), collector],
      });
    } else {
      return this.aggregatePrice(tx, "IOTA");
    }
  }

  /**
   * @description Get a request to Mange Position
   * @param tx
   * @param collateral coin symbol , e.g "IOTA"
   * @param collateral input coin
   * @param the amount to borrow
   * @param repyment input coin (always VUSD)
   * @param the amount to withdraw
   * @returns ManageRequest
   */
  debtorRequest(
    tx: Transaction,
    inputs: {
      collateralSymbol: COLLATERAL_COIN;
      depositCoin: TransactionArgument;
      borrowAmount: string;
      repaymentCoin: TransactionArgument;
      withdrawAmount: string;
      accountObj?: string | TransactionArgument;
    },
  ) {
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
      ? tx.moveCall({
          target: `${FRAMEWORK_PACKAGE_ID}::account::request_with_account`,
          arguments: [
            typeof accountObj === "string" ? tx.object(accountObj) : accountObj,
          ],
        })
      : tx.moveCall({
          target: `${FRAMEWORK_PACKAGE_ID}::account::request`,
        });
    return tx.moveCall({
      target: `${CDP_PACKAGE_ID}::request::debtor_request`,
      typeArguments: [coinType],
      arguments: [
        accountReq,
        tx.sharedObjectRef(TREASURY_OBJ),
        tx.pure.id(vaultId),
        depositCoin,
        tx.pure.u64(borrowAmount),
        repaymentCoin,
        tx.pure.u64(withdrawAmount),
      ],
    });
  }

  /**
   * @description Manage Position
   * @param tx
   * @param collateral coin symbol , e.g "IOTA"
   * @param manager request, ex: see this.debtorRequest
   * @param price result, see this.getPriceResult
   * @param the position place to insert
   * @returns [Coin<T>, COIN<VUSD>]
   */
  updatePosition(
    tx: Transaction,
    inputs: {
      collateralSymbol: COLLATERAL_COIN;
      manageRequest: TransactionArgument;
      priceResult?: TransactionArgument;
    },
  ): TransactionResult {
    const { collateralSymbol, manageRequest, priceResult } = inputs;
    const vault = VAULT_MAP[collateralSymbol].vault;
    const priceResultOpt = priceResult
      ? tx.moveCall({
          target: `0x1::option::some`,
          typeArguments: [getPriceResultType(collateralSymbol)],
          arguments: [priceResult],
        })
      : tx.moveCall({
          target: `0x1::option::none`,
          typeArguments: [getPriceResultType(collateralSymbol)],
        });
    return tx.moveCall({
      target: `${CDP_PACKAGE_ID}::vault::update_position`,
      typeArguments: [COINS_TYPE_LIST[collateralSymbol]],
      arguments: [
        tx.sharedObjectRef(vault),
        tx.sharedObjectRef(TREASURY_OBJ),
        tx.sharedObjectRef(CLOCK_OBJ),
        priceResultOpt,
        manageRequest,
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
}
