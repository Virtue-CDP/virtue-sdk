import { Transaction, TransactionResult, TransactionArgument } from '@iota/iota-sdk/transactions';
import { IotaClient, IotaObjectData, IotaParsedData, IotaObjectResponse, IotaMoveObject } from '@iota/iota-sdk/client';
import * as superstruct from 'superstruct';
import { Infer } from 'superstruct';
import { SharedObjectRef } from '@iota/iota-sdk/dist/cjs/bcs/types';

type COIN = "IOTA" | "stIOTA" | "VUSD";
type COLLATERAL_COIN = "IOTA" | "stIOTA";

type Float = {
    fields: {
        value: string;
    };
};
type VaultResponse = {
    balance: string;
    decimal: number;
    min_debt_amount: string;
    limited_supply: {
        fields: {
            limit: string;
            supply: string;
        };
    };
    liquidation_config: {
        fields: {
            mcr: Float;
            ccr: Float;
            bcr: Float;
        };
    };
    position_table: {
        fields: {
            fee_rate: Float;
            interest_rate: Float;
            timestamp: number;
            table: {
                fields: {
                    head: string | null;
                    tail: string | null;
                    id: {
                        id: string;
                    };
                    size: string;
                };
            };
        };
    };
    surplus_table: {
        fields: {
            id: {
                id: string;
            };
            size: string;
        };
    };
};
type PositionResponse = {
    coll_amount: string;
    debt_amount: string;
    interest_buffer: string;
    interest_unit: {
        type: string;
        fields: {
            value: string;
        };
    };
};

type VaultInfo = {
    token: COLLATERAL_COIN;
    baseFeeRate: number;
    bottleTableSize: string;
    bottleTableId: string;
    collateralDecimal: number;
    collateralVault: string;
    latestRedemptionTime: number;
    minCollateralRatio: string;
    mintedBuckAmount: string;
    minBottleSize: string;
    maxMintAmount: string;
    recoveryModeThreshold: string;
};
type Position = {
    token: COLLATERAL_COIN;
    collAmount: string;
    debtAmount: string;
};
type VaultInfoList = Partial<Record<COLLATERAL_COIN, VaultInfo>>;

declare class VirtueClient {
    network: string;
    owner: string;
    /**
     * @description a TS wrapper over Virtue CDP client.
     * @param network connection to fullnode: 'mainnet' | 'testnet' | 'devnet' | 'localnet' | string
     * @param owner (optional) address of the current user (default: DUMMY_ADDRESS)
     */
    private rpcEndpoint;
    private client;
    constructor(network?: string, owner?: string);
    getClient(): IotaClient;
    /**
     * @description Get all vault objects
     */
    getAllVaults(): Promise<VaultInfoList>;
    /**
     * @description Get Vault<token> object
     */
    getVault(token: COLLATERAL_COIN): Promise<VaultInfo>;
    getPositionsByDebtor(debtor: string): Promise<Position[]>;
    getPosition(debtor: string, coinSymbol: COLLATERAL_COIN): Promise<Position | undefined>;
    /**
     * @description Create a price collector
     * @param collateral coin symbol, e.g "IOTA"
     */
    newPriceCollector(tx: Transaction, coinSymbol: COLLATERAL_COIN): TransactionResult;
    /**
     * @description Get a price result
     * @param collateral coin symbol, e.g "IOTA"
     */
    aggregatePrice(tx: Transaction, coinSymbol: COLLATERAL_COIN): TransactionResult;
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
    requestManagePosition(tx: Transaction, coinSymbol: COLLATERAL_COIN, depositCoin: TransactionArgument, borrowAmount: string, repaymentCoin: TransactionArgument, withdrawAmount: string, accountObj?: string | TransactionArgument): TransactionResult;
    /**
     * @description Manage Position
     * @param tx
     * @param collateral coin symbol , e.g "IOTA"
     * @param manager request, see this.requestManagePosition
     * @param price result, see this.getPriceResult
     * @param the position place to insert
     * @returns [Coin<T>, COIN<VUSD>]
     */
    managePosition(tx: Transaction, coinSymbol: COLLATERAL_COIN, manageRequest: TransactionArgument, priceResult?: TransactionArgument, insertionPlace?: string): TransactionResult;
}

declare function getObjectNames(objectTypes: string[]): string[];
declare const getCoinType: (str: string) => string | null;
declare const getCoinTypeFromTank: (tankType: string) => string | null;
declare const getCoinTypeFromPipe: (pipeType: string) => string | null;
declare const getCoinSymbol: (coinType: string) => COIN | undefined;
declare function U64FromBytes(x: number[]): bigint;
declare const formatUnits: (value: bigint, decimals: number) => string;
declare const parseUnits: (value: number | string, decimals: number) => bigint;
declare const getPriceResultType: (coinSymbol: COLLATERAL_COIN) => string;

declare function coinIntoBalance(tx: Transaction, coinType: string, coinInput: TransactionArgument | undefined): TransactionResult;
declare function coinFromBalance(tx: Transaction, coinType: string, balanceInput: TransactionArgument): TransactionResult;
declare function getInputCoins(tx: Transaction, client: IotaClient, owner: string, coinType: string, ...amounts: string[]): Promise<TransactionResult>;
declare function getMainCoin(tx: Transaction, client: IotaClient, owner: string, coinType: string): Promise<TransactionResult | {
    $kind: "Input";
    Input: number;
    type?: "object";
} | undefined>;

declare const ObjectContentFields: superstruct.Struct<Record<string, any>, null>;
type ObjectContentFields = Infer<typeof ObjectContentFields>;
interface IotaObjectDataWithContent extends IotaObjectData {
    content: IotaParsedData;
}
declare function getIotaObjectData(resp: IotaObjectResponse): IotaObjectData | null | undefined;
declare function getMoveObject(data: IotaObjectResponse | IotaObjectData): IotaMoveObject | undefined;
declare function getObjectFields(resp: IotaObjectResponse | IotaMoveObject | IotaObjectData): ObjectContentFields | undefined;
declare const getObjectGenerics: (resp: IotaObjectResponse) => string[];

declare const parseVaultObject: (coinSymbol: COLLATERAL_COIN, fields: VaultResponse) => {
    token: COLLATERAL_COIN;
    baseFeeRate: number;
    bottleTableSize: string;
    bottleTableId: string;
    collateralDecimal: number;
    collateralVault: string;
    latestRedemptionTime: number;
    minCollateralRatio: string;
    mintedBuckAmount: string;
    maxMintAmount: string;
    recoveryModeThreshold: string;
    minBottleSize: string;
};
declare const parsePositionObject: (coinSymbol: COLLATERAL_COIN, fields: PositionResponse) => {
    token: COLLATERAL_COIN;
    collAmount: string;
    debtAmount: string;
};

declare function buildManagePositionTx(client: VirtueClient, tx: Transaction, sender: string, collateralSymbol: COLLATERAL_COIN, collateralAmount: string, borrowAmount: string, repaymentAmount: string, withrawAmount: string, insertionPlace?: string, accountObjId?: string, recipient?: string): Promise<void>;

declare const COINS_TYPE_LIST: Record<COIN, string>;
declare const COIN_DECIMALS: Record<COIN, number>;

declare const ORIGINAL_FRAMEWORK_PACKAGE_ID = "0x6f8dd0377fe5469cd3456350ca13ae1799655fda06e90191b73ab1c0c0165e8f";
declare const ORIGINAL_VUSD_PACKAGE_ID = "0x929065320c756b8a4a841deeed013bd748ee45a28629c4aaafc56d8948ebb081";
declare const ORIGINAL_ORACLE_PACKAGE_ID = "0x3eb4e0b2c57fe9844db30c6bb2b775ed18fd775dd9d48955b78bcd0ac0ba8954";
declare const ORIGINAL_CDP_PACKAGE_ID = "0x0731a9f5cbdb0a4aea3f540280a1a266502017867734240e29edc813074e7f60";
declare const FRAMEWORK_PACKAGE_ID = "0x6f8dd0377fe5469cd3456350ca13ae1799655fda06e90191b73ab1c0c0165e8f";
declare const VUSD_PACKAGE_ID = "0x929065320c756b8a4a841deeed013bd748ee45a28629c4aaafc56d8948ebb081";
declare const ORACLE_PACKAGE_ID = "0xbc672e6330ab22078715f86e952ef1353d9f9b217c4579e47ce29eaec6f92655";
declare const CDP_PACKAGE_ID = "0x047ea5037499b28cc3e51d9d92af2962679cb5453fcec710dd9db36af0e2100e";
declare const CLOCK_OBJ: {
    objectId: string;
    mutable: boolean;
    initialSharedVersion: number;
};
declare const TREASURY_OBJ: {
    objectId: string;
    mutable: boolean;
    initialSharedVersion: number;
};
declare const CDP_VERSION_OBJ: {
    objectId: string;
    mutable: boolean;
    initialSharedVersion: number;
};
type VaultObjectInfo = {
    priceAggregater: SharedObjectRef;
    vault: SharedObjectRef;
};
declare const VAULT_MAP: Record<COLLATERAL_COIN, VaultObjectInfo>;
declare const TESTNET_PRICE_PACKAGE_ID = "0x2de2d918f5940978dc53aae2ea0687a4ca8a6736bd525f15ee17e9529048fa92";
declare const TESTNET_PRICE_FEED_OBJ: {
    objectId: string;
    mutable: boolean;
    initialSharedVersion: number;
};

export { CDP_PACKAGE_ID, CDP_VERSION_OBJ, CLOCK_OBJ, type COIN, COINS_TYPE_LIST, COIN_DECIMALS, type COLLATERAL_COIN, FRAMEWORK_PACKAGE_ID, type Float, type IotaObjectDataWithContent, ORACLE_PACKAGE_ID, ORIGINAL_CDP_PACKAGE_ID, ORIGINAL_FRAMEWORK_PACKAGE_ID, ORIGINAL_ORACLE_PACKAGE_ID, ORIGINAL_VUSD_PACKAGE_ID, ObjectContentFields, type Position, type PositionResponse, TESTNET_PRICE_FEED_OBJ, TESTNET_PRICE_PACKAGE_ID, TREASURY_OBJ, U64FromBytes, VAULT_MAP, VUSD_PACKAGE_ID, type VaultInfo, type VaultInfoList, type VaultObjectInfo, type VaultResponse, VirtueClient, buildManagePositionTx, coinFromBalance, coinIntoBalance, formatUnits, getCoinSymbol, getCoinType, getCoinTypeFromPipe, getCoinTypeFromTank, getInputCoins, getIotaObjectData, getMainCoin, getMoveObject, getObjectFields, getObjectGenerics, getObjectNames, getPriceResultType, parsePositionObject, parseUnits, parseVaultObject };
