import {
  Transaction,
  TransactionArgument,
  TransactionResult,
} from "@iota/iota-sdk/transactions";
import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";
import { bcs } from "@iota/iota-sdk/bcs";

import {
  BUCKET_OPERATIONS_PACKAGE_ID,
  CLOCK_OBJECT,
  COINS_TYPE_LIST,
  CONTRIBUTOR_TOKEN_ID,
  CORE_PACKAGE_ID,
  ORACLE_OBJECT,
  PROTOCOL_ID,
  PROTOCOL_OBJECT,
} from "./constants";
import {
  BucketInfo,
  BucketProtocolResponse,
  BucketResponse,
  COIN,
} from "./types";
import { getObjectFields } from "./utils";

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
   * @description Get bucket object from coin
   */
  async getBucket(token: COIN): Promise<BucketInfo> {
    const generalInfo = await this.client.getObject({
      id: PROTOCOL_ID,
      options: {
        showContent: true,
      },
    });
    const generalInfoField = generalInfo.data
      ?.content as BucketProtocolResponse;
    const minBottleSize = generalInfoField.fields.min_bottle_size;

    const coinType = COINS_TYPE_LIST[token];
    const res = await this.client.getDynamicFieldObject({
      parentId: PROTOCOL_ID,
      name: {
        type: `${CONTRIBUTOR_TOKEN_ID}::buck::BucketType<${coinType}>`,
        value: {
          dummy_field: false,
        },
      },
    });
    const fields = getObjectFields(res) as BucketResponse;

    const bucketInfo: BucketInfo = {
      token,
      baseFeeRate: Number(fields.base_fee_rate ?? 5_000),
      bottleTableSize: fields.bottle_table.fields.table.fields.size ?? "",
      bottleTableId: fields.bottle_table.fields.table.fields.id.id ?? "",
      collateralDecimal: fields.collateral_decimal ?? 0,
      collateralVault: fields.collateral_vault ?? "",
      latestRedemptionTime: Number(fields.latest_redemption_time ?? 0),
      minCollateralRatio: fields.min_collateral_ratio ?? "",
      mintedBuckAmount: fields.minted_buck_amount ?? "",
      maxMintAmount: fields.max_mint_amount ?? "",
      recoveryModeThreshold: fields.recovery_mode_threshold ?? "",
      minBottleSize,
    };

    return bucketInfo;
  }

  // MoveCall
  /**
   * @description update token price using supra oracle
   * @param assetType Asset , e.g "0x2::iota::IOTA"
   */
  updateSupraOracle(tx: Transaction, coin: COIN) {
    tx.moveCall({
      target:
        "0x915d11320f37ddb386367dbce81154e1b4cf83e6a3039df183ac4ae78131c786::ssui_rule::update_price",
      typeArguments: [COINS_TYPE_LIST[coin]],
      arguments: [
        tx.sharedObjectRef(ORACLE_OBJECT),
        tx.sharedObjectRef(CLOCK_OBJECT),
        tx.object(
          "0xbca474133638352ba83ccf7b5c931d50f764b09550e16612c9f70f1e21f3f594",
        ),
      ],
    });
  }

  /**
   * @description Borrow
   * @param tx
   * @param collateralType Asset , e.g "0x2::iota::IOTA"
   * @param collateralInput collateral input
   * @param buckOutput
   * @param insertionPlace optional
   * @returns TransactionResult
   */
  borrow(
    tx: Transaction,
    collateralType: string,
    collateralInput: TransactionResult,
    buckOutput: string | TransactionArgument,
    insertionPlace?: string,
    strapId?: string | TransactionArgument,
  ): TransactionResult | null {
    if (strapId) {
      if (strapId === "new") {
        const [strap] = tx.moveCall({
          target: `${CORE_PACKAGE_ID}::strap::new`,
          typeArguments: [collateralType],
        });
        if (strap) {
          const [buckOut] = tx.moveCall({
            target: `${BUCKET_OPERATIONS_PACKAGE_ID}::bucket_operations::high_borrow_with_strap`,
            typeArguments: [collateralType],
            arguments: [
              tx.sharedObjectRef(PROTOCOL_OBJECT),
              tx.sharedObjectRef(ORACLE_OBJECT),
              strap,
              tx.sharedObjectRef(CLOCK_OBJECT),
              collateralInput,
              typeof buckOutput === "string"
                ? tx.pure.u64(buckOutput)
                : buckOutput,
              tx.pure(
                bcs
                  .vector(bcs.Address)
                  .serialize(insertionPlace ? [insertionPlace] : []),
              ),
            ],
          });
          return [strap, buckOut] as TransactionResult;
        }
      } else {
        return tx.moveCall({
          target: `${BUCKET_OPERATIONS_PACKAGE_ID}::bucket_operations::high_borrow_with_strap`,
          typeArguments: [collateralType],
          arguments: [
            tx.sharedObjectRef(PROTOCOL_OBJECT),
            tx.sharedObjectRef(ORACLE_OBJECT),
            typeof strapId === "string" ? tx.object(strapId) : strapId,
            tx.sharedObjectRef(CLOCK_OBJECT),
            collateralInput,
            typeof buckOutput === "string"
              ? tx.pure.u64(buckOutput)
              : buckOutput,
            tx.pure(
              bcs
                .vector(bcs.Address)
                .serialize(insertionPlace ? [insertionPlace] : []),
            ),
          ],
        });
      }
    } else {
      return tx.moveCall({
        target: `${BUCKET_OPERATIONS_PACKAGE_ID}::bucket_operations::high_borrow`,
        typeArguments: [collateralType],
        arguments: [
          tx.sharedObjectRef(PROTOCOL_OBJECT),
          tx.sharedObjectRef(ORACLE_OBJECT),
          tx.sharedObjectRef(CLOCK_OBJECT),
          collateralInput,
          typeof buckOutput === "string" ? tx.pure.u64(buckOutput) : buckOutput,
          tx.pure(
            bcs
              .vector(bcs.Address)
              .serialize(insertionPlace ? [insertionPlace] : []),
          ),
        ],
      });
    }

    return null;
  }

  /**
   * @description Top up function
   * @param tx
   * @param collateralType Asset , e.g "0x2::iota::IOTA"
   * @param collateralInput collateral input
   * @param forAddress
   * @param insertionPlace optional
   * @returns TransactionResult
   */
  topUp(
    tx: Transaction,
    collateralType: string,
    collateralInput: TransactionResult,
    forAddress: string,
    insertionPlace?: string,
  ) {
    tx.moveCall({
      target: `${BUCKET_OPERATIONS_PACKAGE_ID}::bucket_operations::high_top_up`,
      typeArguments: [collateralType],
      arguments: [
        tx.sharedObjectRef(PROTOCOL_OBJECT),
        collateralInput,
        tx.pure.address(forAddress),
        tx.pure(
          bcs
            .vector(bcs.Address)
            .serialize(insertionPlace ? [insertionPlace] : []),
        ),
        tx.sharedObjectRef(CLOCK_OBJECT),
      ],
    });
  }
}
