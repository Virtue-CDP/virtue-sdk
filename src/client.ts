import {
  Transaction,
  TransactionArgument,
  TransactionResult,
} from "@iota/iota-sdk/transactions";
import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";

import {
  CDP_PACKAGE_ID,
  CDP_VERSION_OBJ,
  CLOCK_OBJ,
  COIN_DECIMALS,
  COINS_TYPE_LIST,
  FRAMEWORK_PACKAGE_ID,
  LIQUIDATION_PACKAGE_ID,
  ORACLE_PACKAGE_ID,
  ORIGINAL_LIQUIDATION_PACKAGE_ID,
  STABILITY_POOL_OBJ,
  TESTNET_PRICE_FEED_OBJ,
  TESTNET_PRICE_PACKAGE_ID,
  TREASURY_OBJ,
  VAULT_MAP,
} from "@/constants";
import {
  VaultInfo,
  VaultResponse,
  COLLATERAL_COIN,
  PositionInfo,
  VaultInfoList,
  PositionResponse,
  PriceMapResponse,
  COIN,
  StabilityPoolBalances,
  StabilityPoolResponse,
  StabilityPoolInfo,
} from "@/types";
import {
  formatBigInt,
  getCoinSymbol,
  getObjectFields,
  getPriceResultType,
  parsePositionObject,
  parseStabilityPoolObject,
  parseVaultObject,
} from "@/utils";

const DUMMY_ADDRESS = "0x0";

export class VirtueClient {
  /**
   * @description a TS wrapper over Virtue CDP client.
   * @param network connection to fullnode: 'mainnet' | 'testnet' | 'devnet' | 'localnet' | string
   * @param owner (optional) address of the current user (default: DUMMY_ADDRESS)
   */
  private rpcEndpoint: string;
  private client: IotaClient;

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
   * @description Get prices from oracle
   */
  async getPrices() {
    const res = await this.client.getObject({
      id: TESTNET_PRICE_FEED_OBJ.objectId,
      options: {
        showContent: true,
      },
    });
    const mapObj = getObjectFields(res) as PriceMapResponse;
    const fields = mapObj.price_map.fields.contents;

    const prices: Record<COIN, number> = {
      IOTA: 0,
      stIOTA: 0,
      VUSD: 1,
    };

    for (const field of fields) {
      const coinType = `0x${field.fields.key.fields.name}`;
      const symbol = getCoinSymbol(coinType);
      if (!symbol) continue;

      prices[symbol] = formatBigInt(field.fields.value.fields.value);
    }

    return prices;
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
    const vaults = await this.getAllVaults();
    const positions: PositionInfo[] = [];
    for (const vault of Object.values(vaults)) {
      const tableId = vault.bottleTableId;
      const res = await this.client.getDynamicFieldObject({
        parentId: tableId,
        name: {
          type: "address",
          value: debtor,
        },
      });
      const obj = getObjectFields(res);
      if (!obj) continue;

      const response = obj.value.fields.value as PositionResponse;
      const position = parsePositionObject(response);
      if (position) {
        positions.push(position);
      }
    }

    return positions;
  }

  async getPosition(
    debtor: string,
    collateral: COLLATERAL_COIN,
  ): Promise<PositionInfo | undefined> {
    const vaultInfo = await this.getVault(collateral);
    const tableId = vaultInfo.bottleTableId;
    const res = await this.client.getDynamicFieldObject({
      parentId: tableId,
      name: {
        type: "address",
        value: debtor,
      },
    });
    const obj = getObjectFields(res);
    if (!obj) return;

    const response = getObjectFields(
      obj.value.fields.value,
    ) as PositionResponse;
    return parsePositionObject(response);
  }

  async getStabilityPool(): Promise<StabilityPoolInfo> {
    const res = await this.client.getObject({
      id: STABILITY_POOL_OBJ.objectId,
      options: {
        showContent: true,
      },
    });
    const fields = getObjectFields(res) as StabilityPoolResponse;
    return parseStabilityPoolObject(fields);
  }

  async getStabilityPoolBalances(
    account: string,
  ): Promise<StabilityPoolBalances> {
    const tokensRes = await this.client.getOwnedObjects({
      owner: account,
      filter: {
        StructType: `${ORIGINAL_LIQUIDATION_PACKAGE_ID}::stablility_pool::StabilityToken`,
      },
      options: {
        showContent: true,
      },
    });
    if (tokensRes.data) {
      const vusdBalances = tokensRes.data.map((token) => {
        const tokenFields = getObjectFields(token);
        if (tokenFields) {
          return formatBigInt(tokenFields.amount, COIN_DECIMALS.VUSD);
        } else {
          return 0;
        }
      });

      return {
        vusdBalance: vusdBalances.reduce((x, y) => x + y, 0),
        collBalances: {
          IOTA: 0,
          stIOTA: 0,
        },
      };
    } else {
      return {
        vusdBalance: 0,
        collBalances: {
          IOTA: 0,
          stIOTA: 0,
        },
      };
    }
  }

  /**
   * @description Create a price collector
   * @param collateral coin symbol, e.g "IOTA"
   */
  newPriceCollector(
    tx: Transaction,
    coinSymbol: COLLATERAL_COIN,
  ): TransactionResult {
    return tx.moveCall({
      target: `${ORACLE_PACKAGE_ID}::collector::new`,
      typeArguments: [COINS_TYPE_LIST[coinSymbol]],
    });
  }

  /**
   * @description Get a price result
   * @param collateral coin symbol, e.g "IOTA"
   */
  aggregatePrice(
    tx: Transaction,
    coinSymbol: COLLATERAL_COIN,
  ): TransactionResult {
    const [collector] = this.newPriceCollector(tx, coinSymbol);
    const coinType = COINS_TYPE_LIST[coinSymbol];
    // TODO: testnet only
    tx.moveCall({
      target: `${TESTNET_PRICE_PACKAGE_ID}::testnet_price::self_price`,
      typeArguments: [coinType],
      arguments: [tx.sharedObjectRef(TESTNET_PRICE_FEED_OBJ), collector],
    });

    // aggregate
    const aggregater = tx.sharedObjectRef(
      VAULT_MAP[coinSymbol].priceAggregater,
    );
    return tx.moveCall({
      target: `${ORACLE_PACKAGE_ID}::aggregater::aggregate`,
      typeArguments: [coinType],
      arguments: [aggregater, collector],
    });
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
  requestManagePosition(
    tx: Transaction,
    coinSymbol: COLLATERAL_COIN,
    depositCoin: TransactionArgument,
    borrowAmount: string,
    repaymentCoin: TransactionArgument,
    withdrawAmount: string,
    accountObj?: string | TransactionArgument,
  ) {
    const coinType = COINS_TYPE_LIST[coinSymbol];
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
      target: `${CDP_PACKAGE_ID}::manage::request`,
      typeArguments: [coinType],
      arguments: [
        tx.sharedObjectRef(CDP_VERSION_OBJ),
        accountReq,
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
   * @param manager request, see this.requestManagePosition
   * @param price result, see this.getPriceResult
   * @param the position place to insert
   * @returns [Coin<T>, COIN<VUSD>]
   */
  managePosition(
    tx: Transaction,
    coinSymbol: COLLATERAL_COIN,
    manageRequest: TransactionArgument,
    priceResult?: TransactionArgument,
    insertionPlace?: string,
  ): TransactionResult {
    const vault = VAULT_MAP[coinSymbol].vault;
    const priceResultOpt = priceResult
      ? tx.moveCall({
          target: `0x1::option::some`,
          typeArguments: [getPriceResultType(coinSymbol)],
          arguments: [priceResult],
        })
      : tx.moveCall({
          target: `0x1::option::none`,
          typeArguments: [getPriceResultType(coinSymbol)],
        });
    return tx.moveCall({
      target: `${CDP_PACKAGE_ID}::vault::manage_position`,
      typeArguments: [COINS_TYPE_LIST[coinSymbol]],
      arguments: [
        tx.sharedObjectRef(vault),
        tx.sharedObjectRef(CDP_VERSION_OBJ),
        tx.sharedObjectRef(TREASURY_OBJ),
        tx.sharedObjectRef(CLOCK_OBJ),
        priceResultOpt,
        manageRequest,
        tx.pure.option("address", insertionPlace),
      ],
    });
  }

  depositStabilityPool(
    tx: Transaction,
    vusdCoin: TransactionArgument,
  ): TransactionResult {
    return tx.moveCall({
      target: `${LIQUIDATION_PACKAGE_ID}::stablility_pool::deposit`,
      arguments: [tx.sharedObjectRef(STABILITY_POOL_OBJ), vusdCoin],
    });
  }

  withdrawStabilityPool(
    tx: Transaction,
    tokens: TransactionArgument[],
    amount: string,
  ): TransactionResult {
    const stabilityPool = tx.sharedObjectRef(STABILITY_POOL_OBJ);
    const [mainCoin, ...otherCoins] = tokens.map((token) => {
      const [vusdCoin] = tx.moveCall({
        target: `${LIQUIDATION_PACKAGE_ID}::stablility_pool::withdraw`,
        arguments: [stabilityPool, token],
      });
      return vusdCoin;
    });
    if (otherCoins.length > 0) {
      tx.mergeCoins(mainCoin, otherCoins);
    }
    const [outCoin] = tx.splitCoins(mainCoin, [amount]);
    const [token] = this.depositStabilityPool(tx, mainCoin);
    return [outCoin, token] as TransactionResult;
  }
}
