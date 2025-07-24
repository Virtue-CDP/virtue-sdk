import { Transaction, TransactionResult, TransactionArgument } from '@iota/iota-sdk/transactions';
import { IotaClient, IotaObjectData, IotaParsedData, IotaObjectResponse, IotaMoveObject } from '@iota/iota-sdk/client';
import { IotaPriceServiceConnection, IotaPythClient } from '@pythnetwork/pyth-iota-js';
import * as superstruct from 'superstruct';
import { Infer } from 'superstruct';

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
    collBalances: Partial<Record<COLLATERAL_COIN, number>>;
};
type VaultInfoList = Partial<Record<COLLATERAL_COIN, VaultInfo>>;
type StabilityPoolInfo = {
    vusdBalance: number;
};

declare class VirtueClient {
    /**
     * @description a TS wrapper over Virtue CDP client.
     * @param network connection to fullnode: 'mainnet' | 'testnet' | 'devnet' | 'localnet' | string
     * @param owner (optional) address of the current user (default: DUMMY_ADDRESS)
     */
    private rpcEndpoint;
    private iotaClient;
    private pythConnection;
    private pythClient;
    transaction: Transaction;
    sender: string;
    constructor(inputs: {
        rpcUrl?: string;
        sender: string;
    });
    /**
     * @description Get this.iotaClient
     */
    getIotaClient(): IotaClient;
    /**
     * @description Get this.pythConnection
     */
    getPythConnection(): IotaPriceServiceConnection;
    /**
     * @description Get this.pythClient
     */
    getPythClient(): IotaPythClient;
    /**
     * @description Get all vault objects
     */
    getAllVaults(): Promise<VaultInfoList>;
    /**
     * @description Get Vault<token> object
     */
    getVault(token: COLLATERAL_COIN): Promise<VaultInfo>;
    /**
     * @description Get debtor's position data
     */
    getDebtorPositions(debtor?: string): Promise<PositionInfo[]>;
    getStabilityPool(): Promise<StabilityPoolInfo>;
    getStabilityPoolBalances(account?: string): Promise<StabilityPoolBalances>;
    /**
     * @description new zero coin
     */
    zeroCoin(coinSymbol: COIN): TransactionResult;
    /**
     * @description split the needed coins
     */
    splitInputCoins(coinSymbol: COIN, ...amounts: (string | TransactionArgument)[]): Promise<TransactionResult>;
    /**
     * @description Reset this.transaction
     */
    resetTransaction(): void;
    /**
     * @description return Transaction
     * @returns Transaction
     */
    getTransaction(): Transaction;
    /**
     * @description Create a AccountRequest
     * @param accountObj (optional): Account object or EOA if undefined
     * @return [AccountRequest]
     */
    newAccountRequest(accountObj?: string | TransactionArgument): TransactionResult;
    /**
     * @description Create a price collector
     * @param collateral coin symbol, e.g "IOTA"
     * @return [PriceCollector]
     */
    newPriceCollector(collateralSymbol: COLLATERAL_COIN): TransactionResult;
    /**
     * @description Get a price result
     * @param collateral coin symbol, e.g "IOTA"
     * @return [PriceResult]
     */
    aggregatePrice(collateralSymbol: COLLATERAL_COIN): Promise<TransactionResult>;
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
    }): TransactionResult;
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
    }): TransactionResult;
    /**
     * @description check and destroy UpdateResponse
     * @param collateralSymbol: "IOTA" or "stIOTA"
     * @param response: UpdateResponse generated by update_position
     */
    checkResponse(inputs: {
        collateralSymbol: COLLATERAL_COIN;
        response: TransactionArgument;
    }): void;
    /**
     * @description deposit to stability pool
     * @param vusdCoin: coin of VUSD
     * @param recipient (optional): deposit for recipient instead of sender
     * @returns [PositionResponse]
     */
    depositStabilityPool(inputs: {
        vusdCoin: TransactionArgument;
        recipient?: string;
    }): TransactionResult;
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
    }): TransactionResult;
    /**
     * @description claim from stability pool
     */
    claimStabilityPool(inputs: {
        accountRequest?: TransactionArgument;
        accountObj?: string | TransactionArgument;
    }): TransactionArgument[];
    /**
     * @description check response for stability pool
     * @param response: PositionResponse
     */
    checkResponseForStabilityPool(response: TransactionArgument): void;
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
    buildManagePositionTransaction(inputs: {
        collateralSymbol: COLLATERAL_COIN;
        depositAmount: string;
        borrowAmount: string;
        repaymentAmount: string;
        withdrawAmount: string;
        accountObjId?: string;
        recipient?: string;
    }): Promise<Transaction>;
    /**
     * @description build and return Transaction of close position
     * @param collateralSymbol: collateral coin symbol , e.g "IOTA"
     * @param accountObjId: the Account object to hold position (undefined if just use EOA)
     * @param recipient (optional): the recipient of the output coins
     * @returns Transaction
     */
    buildClosePositionTransaction(inputs: {
        collateralSymbol: COLLATERAL_COIN;
        accountObjId?: string;
        recipient?: string;
    }): Promise<Transaction>;
    /**
     * @description build and return Transaction of deposit stability pool
     * @param depositAmount: how much amount to deposit (collateral)
     * @returns Transaction
     */
    buildDepositStabilityPoolTransaction(inputs: {
        depositAmount: string;
        recipient?: string;
    }): Promise<Transaction>;
    /**
     * @description build and return Transaction of withdraw stability pool
     * @param withdrawAmount: how much amount to withdraw (collateral)
     * @returns Transaction
     */
    buildWithdrawStabilityPoolTransaction(inputs: {
        withdrawAmount: string;
        accountObj?: string;
    }): Promise<Transaction>;
    /**
     * @description build and return Transaction of withdraw stability pool
     * @param withdrawAmount: how much amount to withdraw (collateral)
     * @returns Transaction
     */
    buildClaimStabilityPoolTransaction(inputs: {
        accountObj?: string;
    }): Promise<Transaction>;
}

declare function getObjectNames(objectTypes: string[]): string[];
declare const getCoinType: (str: string) => string | null;
declare const getCoinSymbol: (coinType: string) => COIN | undefined;
declare function U64FromBytes(x: number[]): bigint;
declare const formatUnits: (value: bigint, decimals: number) => string;
declare const formatBigInt: (value: string, decimals?: number) => number;
declare const parseUnits: (value: number | string, decimals: number) => bigint;
declare const getPriceResultType: (coinSymbol: COLLATERAL_COIN) => string;

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

declare const COIN_TYPES: Record<COIN, string>;
declare const COIN_DECIMALS: Record<COIN, number>;

declare const ORIGINAL_FRAMEWORK_PACKAGE_ID = "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b";
declare const ORIGINAL_VUSD_PACKAGE_ID = "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f";
declare const ORIGINAL_ORACLE_PACKAGE_ID = "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf";
declare const ORIGINAL_CDP_PACKAGE_ID = "0xcdeeb40cd7ffd7c3b741f40a8e11cb784a5c9b588ce993d4ab86479072386ba1";
declare const ORIGINAL_STABILITY_POOL_PACKAGE_ID = "0xc7ab9b9353e23c6a3a15181eb51bf7145ddeff1a5642280394cd4d6a0d37d83b";
declare const ORIGINAL_INCENTIVE_PACKAGE_ID = "0x66db06be17b524806ce0872883f1ca2557a3e8d2a299c53676a29a1d37ae571e";
declare const FRAMEWORK_PACKAGE_ID = "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b";
declare const VUSD_PACKAGE_ID = "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f";
declare const ORACLE_PACKAGE_ID = "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf";
declare const CDP_PACKAGE_ID = "0x34fa327ee4bb581d81d85a8c40b6a6b4260630a0ef663acfe6de0e8ca471dd22";
declare const STABILITY_POOL_PACKAGE_ID = "0xc7ab9b9353e23c6a3a15181eb51bf7145ddeff1a5642280394cd4d6a0d37d83b";
declare const INCENTIVE_PACKAGE_ID = "0x728ba0d8cc3ac19814442f4f626f463ebd1a0b9492c5ad756d717bff72dda1de";
declare const CLOCK_OBJ: SharedObjectRef;
declare const TREASURY_OBJ: SharedObjectRef;
type SharedObjectRef = {
    objectId: string;
    mutable: boolean;
    initialSharedVersion: number;
};
type RewarderInfo = {
    rewarder: SharedObjectRef;
    rewardSymbol: COIN;
};
type VaultObjectInfo = {
    priceAggregater: SharedObjectRef;
    vault: SharedObjectRef;
    pythPriceId?: string;
    rewarders?: (SharedObjectRef & {
        rewardSymbol: COIN;
    })[];
};
declare const VAULT_MAP: Record<COLLATERAL_COIN, VaultObjectInfo>;
declare const PYTH_STATE_ID = "0x6bc33855c7675e006f55609f61eebb1c8a104d8973a698ee9efd3127c210b37f";
declare const WORMHOLE_STATE_ID = "0xd43b448afc9dd01deb18273ec39d8f27ddd4dd46b0922383874331771b70df73";
declare const PYTH_RULE_PACKAGE_ID = "0xed5a8dac2ca41ae9bdc1c7f778b0949d3e26c18c51ed284c4cfa4030d0bb64c2";
declare const PYTH_RULE_CONFIG_OBJ: SharedObjectRef;
declare const CERT_RULE_PACKAGE_ID = "0x01edb9afe0663b8762d2e0a18923df8bee98d28f3a60ac56ff67a27bbf53a7ac";
declare const CERT_NATIVE_POOL_OBJ: SharedObjectRef;
declare const CERT_METADATA_OBJ: SharedObjectRef;
declare const STABILITY_POOL_OBJ: SharedObjectRef;
declare const STABILITY_POOL_TABLE_ID = "0x6dd808c50bab98757f7523562bdef7d33d506bb447ea9e708072bf13a5e29f02";
declare const VAULT_REWARDER_REGISTRY_OBJ: SharedObjectRef;
declare const INCENTIVE_GLOBAL_CONFIG_OBJ: SharedObjectRef;

export { CDP_PACKAGE_ID, CERT_METADATA_OBJ, CERT_NATIVE_POOL_OBJ, CERT_RULE_PACKAGE_ID, CLOCK_OBJ, type COIN, COIN_DECIMALS, COIN_TYPES, type COLLATERAL_COIN, type Double, FRAMEWORK_PACKAGE_ID, type Float, INCENTIVE_GLOBAL_CONFIG_OBJ, INCENTIVE_PACKAGE_ID, type IotaObjectDataWithContent, ORACLE_PACKAGE_ID, ORIGINAL_CDP_PACKAGE_ID, ORIGINAL_FRAMEWORK_PACKAGE_ID, ORIGINAL_INCENTIVE_PACKAGE_ID, ORIGINAL_ORACLE_PACKAGE_ID, ORIGINAL_STABILITY_POOL_PACKAGE_ID, ORIGINAL_VUSD_PACKAGE_ID, ObjectContentFields, PYTH_RULE_CONFIG_OBJ, PYTH_RULE_PACKAGE_ID, PYTH_STATE_ID, type PositionInfo, type RewarderInfo, STABILITY_POOL_OBJ, STABILITY_POOL_PACKAGE_ID, STABILITY_POOL_TABLE_ID, type SharedObjectRef, type StabilityPoolBalances, type StabilityPoolInfo, TREASURY_OBJ, U64FromBytes, VAULT_MAP, VAULT_REWARDER_REGISTRY_OBJ, VUSD_PACKAGE_ID, type VaultInfo, type VaultInfoList, type VaultObjectInfo, type VaultResponse, VirtueClient, WORMHOLE_STATE_ID, formatBigInt, formatUnits, getCoinSymbol, getCoinType, getIotaObjectData, getMoveObject, getObjectFields, getObjectGenerics, getObjectNames, getPriceResultType, parseUnits, parseVaultObject };
