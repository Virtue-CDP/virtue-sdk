import {
  Transaction,
  TransactionArgument,
  TransactionResult,
} from "@iota/iota-sdk/transactions";
import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";
// import { bcs } from "@iota/iota-sdk/bcs";

import { VaultInfo, VaultResponse, COLLATERAL_COIN, Position } from "./types";
import { getObjectFields, getPriceResultType } from "./utils";
import {
  CDP_PACKAGE_ID,
  CDP_VERSION_OBJ,
  CLOCK_OBJ,
  COINS_TYPE_LIST,
  FRAMEWORK_PACKAGE_ID,
  ORACLE_PACKAGE_ID,
  TESTNET_PRICE_FEED_OBJ,
  TESTNET_PRICE_PACKAGE_ID,
  TREASURY_OBJ,
  VAULT_MAP,
} from "./constants";

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
   * @description Get Vault<token> object
   */
  async getVaultInfo(coinSymbol: COLLATERAL_COIN): Promise<VaultInfo> {
    const vault = VAULT_MAP[coinSymbol];
    const res = await this.client.getObject({
      id: vault.vault.objectId,
      options: {
        showContent: true,
      },
    });
    const fields = getObjectFields(res) as VaultResponse;

    const vaultInfo: VaultInfo = {
      token: coinSymbol,
      baseFeeRate:
        Number(fields.position_table.fields.fee_rate ?? 3_000_000) / 10 ** 9,
      bottleTableSize: fields.position_table.fields.table.fields.size,
      bottleTableId: fields.position_table.fields.table.fields.id.id,
      collateralDecimal: Number(fields.decimal),
      collateralVault: fields.balance,
      latestRedemptionTime: Number(fields.position_table.fields.timestamp),
      minCollateralRatio: fields.liquidation_config.fields.mcr.fields.value,
      mintedBuckAmount: fields.limited_supply.fields.supply,
      maxMintAmount: fields.limited_supply.fields.limit,
      recoveryModeThreshold: fields.liquidation_config.fields.ccr.fields.value,
      minBottleSize: fields.min_debt_amount,
    };

    return vaultInfo;
  }

  async getPosition(
    debtor: string,
    coinSymbol: COLLATERAL_COIN,
  ): Promise<Position | undefined> {
    const vaultInfo = await this.getVaultInfo(coinSymbol);
    const tableId = vaultInfo.bottleTableId;
    const positionRes = await this.client.getDynamicFieldObject({
      parentId: tableId,
      name: {
        type: "address",
        value: debtor,
      },
    });
    const positionData = getObjectFields(positionRes);
    if (!positionData) return;
    positionData;
    return {
      collAmount: positionData.coll_amount,
      debtAmount: positionData.debt_amount,
    };
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
}
