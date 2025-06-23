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
type Double = {
    fields: {
        value: string;
    };
};
type VaultResponse = {
    balance: string;
    decimal: number;
    interest_rate: Double;
    limited_supply: {
        fields: {
            limit: string;
            supply: string;
        };
    };
    min_collateral_ratio: Float;
    position_table: {
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

type VaultInfo = {
    token: COLLATERAL_COIN;
    interestRate: number;
    positionTableSize: string;
    collateralDecimal: number;
    collateralBalance: string;
    minCollateralRatio: number;
    supply: string;
    maxSupply: string;
};
type PositionInfo = {
    collateral: COLLATERAL_COIN;
    collAmount: string;
    debtAmount: string;
};
type StabilityPoolBalances = {
    vusdBalance: number;
    collBalances: Record<COLLATERAL_COIN, number>;
};
type VaultInfoList = Partial<Record<COLLATERAL_COIN, VaultInfo>>;
type StabilityPoolInfo = {
    vusdBalance: number;
};

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
    private pythConnection;
    private pythClient;
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
    getPositionsByDebtor(debtor: string): Promise<PositionInfo[]>;
    /**
     * @description Create a price collector
     * @param collateral coin symbol, e.g "IOTA"
     */
    newPriceCollector(tx: Transaction, collateralSymbol: COLLATERAL_COIN): TransactionResult;
    /**
     * @description Get a price result
     * @param collateral coin symbol, e.g "IOTA"
     */
    aggregatePrice(tx: Transaction, collateralSymbol: COLLATERAL_COIN): Promise<TransactionResult>;
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
    debtorRequest(tx: Transaction, inputs: {
        collateralSymbol: COLLATERAL_COIN;
        depositCoin: TransactionArgument;
        borrowAmount: string;
        repaymentCoin: TransactionArgument;
        withdrawAmount: string;
        accountObj?: string | TransactionArgument;
    }): TransactionResult;
    /**
     * @description Manage Position
     * @param tx
     * @param collateral coin symbol , e.g "IOTA"
     * @param manager request, ex: see this.debtorRequest
     * @param price result, see this.getPriceResult
     * @param the position place to insert
     * @returns [Coin<T>, COIN<VUSD>]
     */
    updatePosition(tx: Transaction, inputs: {
        collateralSymbol: COLLATERAL_COIN;
        manageRequest: TransactionArgument;
        priceResult?: TransactionArgument;
    }): TransactionResult;
}

declare function getObjectNames(objectTypes: string[]): string[];
declare const getCoinType: (str: string) => string | null;
declare const getCoinSymbol: (coinType: string) => COIN | undefined;
declare function U64FromBytes(x: number[]): bigint;
declare const formatUnits: (value: bigint, decimals: number) => string;
declare const formatBigInt: (value: string, decimals?: number) => number;
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

declare const parseVaultObject: (coinSymbol: COLLATERAL_COIN, fields: VaultResponse) => VaultInfo;

declare function buildManagePositionTx(client: VirtueClient, tx: Transaction, sender: string, collateralSymbol: COLLATERAL_COIN, collateralAmount: string, borrowAmount: string, repaymentAmount: string, withdrawAmount: string, accountObjId?: string, recipient?: string): Promise<void>;

declare const COINS_TYPE_LIST: Record<COIN, string>;
declare const COIN_DECIMALS: Record<COIN, number>;

declare const ORIGINAL_FRAMEWORK_PACKAGE_ID = "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b";
declare const ORIGINAL_VUSD_PACKAGE_ID = "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f";
declare const ORIGINAL_ORACLE_PACKAGE_ID = "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf";
declare const ORIGINAL_CDP_PACKAGE_ID = "0xcdeeb40cd7ffd7c3b741f40a8e11cb784a5c9b588ce993d4ab86479072386ba1";
declare const FRAMEWORK_PACKAGE_ID = "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b";
declare const VUSD_PACKAGE_ID = "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f";
declare const ORACLE_PACKAGE_ID = "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf";
declare const CDP_PACKAGE_ID = "0x34fa327ee4bb581d81d85a8c40b6a6b4260630a0ef663acfe6de0e8ca471dd22 ";
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
type VaultObjectInfo = {
    priceAggregater: SharedObjectRef;
    vault: SharedObjectRef;
    pythPriceId?: string;
};
declare const VAULT_MAP: Record<COLLATERAL_COIN, VaultObjectInfo>;
declare const PYTH_STATE_ID = "0x6bc33855c7675e006f55609f61eebb1c8a104d8973a698ee9efd3127c210b37f";
declare const WORMHOLE_STATE_ID = "0xd43b448afc9dd01deb18273ec39d8f27ddd4dd46b0922383874331771b70df73";
declare const PYTH_RULE_PACKAGE_ID = "0xed5a8dac2ca41ae9bdc1c7f778b0949d3e26c18c51ed284c4cfa4030d0bb64c2";
declare const PYTH_RULE_CONFIG_OBJ: SharedObjectRef;

export { CDP_PACKAGE_ID, CLOCK_OBJ, type COIN, COINS_TYPE_LIST, COIN_DECIMALS, type COLLATERAL_COIN, type Double, FRAMEWORK_PACKAGE_ID, type Float, type IotaObjectDataWithContent, ORACLE_PACKAGE_ID, ORIGINAL_CDP_PACKAGE_ID, ORIGINAL_FRAMEWORK_PACKAGE_ID, ORIGINAL_ORACLE_PACKAGE_ID, ORIGINAL_VUSD_PACKAGE_ID, ObjectContentFields, PYTH_RULE_CONFIG_OBJ, PYTH_RULE_PACKAGE_ID, PYTH_STATE_ID, type PositionInfo, type StabilityPoolBalances, type StabilityPoolInfo, TREASURY_OBJ, U64FromBytes, VAULT_MAP, VUSD_PACKAGE_ID, type VaultInfo, type VaultInfoList, type VaultObjectInfo, type VaultResponse, VirtueClient, WORMHOLE_STATE_ID, buildManagePositionTx, coinFromBalance, coinIntoBalance, formatBigInt, formatUnits, getCoinSymbol, getCoinType, getInputCoins, getIotaObjectData, getMainCoin, getMoveObject, getObjectFields, getObjectGenerics, getObjectNames, getPriceResultType, parseUnits, parseVaultObject };
