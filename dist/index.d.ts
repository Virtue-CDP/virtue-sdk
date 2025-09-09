import { Transaction, TransactionResult, TransactionArgument } from '@iota/iota-sdk/transactions';
import { IotaClient, DryRunTransactionBlockResponse, IotaTransactionBlockResponseOptions, IotaTransactionBlockResponse, IotaObjectData, IotaParsedData, IotaObjectResponse, IotaMoveObject } from '@iota/iota-sdk/client';
import { IotaPriceServiceConnection, IotaPythClient } from '@pythnetwork/pyth-iota-js';
import { Keypair } from '@iota/iota-sdk/cryptography';
import * as superstruct from 'superstruct';
import { Infer } from 'superstruct';

type COIN = "VUSD" | "IOTA" | "stIOTA" | "iBTC";
type COLLATERAL_COIN = "IOTA" | "stIOTA" | "iBTC";
type DEPOSIT_POINT_BONUS_COIN = Extract<COIN, "stIOTA">;
declare function isDepositPointBonusCoin(coin: COIN): coin is DEPOSIT_POINT_BONUS_COIN;

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
type Rewards = Partial<Record<COIN, number>>;
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
    rewarders?: Rewarder[];
};
type Rewarder = SharedObjectRef & {
    rewardSymbol: COIN;
};
type CdpPositionsResponse = {
    positions: {
        debtor: string;
        collAmount: number;
        debtAmount: number;
    }[];
    nextCursor: string | null;
};
type PoolPositionsResponse = {
    positions: {
        account: string;
        vusdAmount: number;
        collAmounts: Record<string, number>;
        timestamp: number;
    }[];
    nextCursor: string | null;
};

declare const COIN_DECIMALS: Record<COIN, number>;

type ConfigType = {
    COIN_TYPES: Record<COIN, string>;
    ORIGINAL_FRAMEWORK_PACKAGE_ID: string;
    ORIGINAL_VUSD_PACKAGE_ID: string;
    ORIGINAL_ORACLE_PACKAGE_ID: string;
    ORIGINAL_CDP_PACKAGE_ID: string;
    ORIGINAL_STABILITY_POOL_PACKAGE_ID: string;
    ORIGINAL_INCENTIVE_PACKAGE_ID?: string;
    ORIGINAL_POINT_PACKAGE_ID?: string;
    FRAMEWORK_PACKAGE_ID: string;
    VUSD_PACKAGE_ID: string;
    ORACLE_PACKAGE_ID: string;
    CDP_PACKAGE_ID: string;
    STABILITY_POOL_PACKAGE_ID: string;
    INCENTIVE_PACKAGE_ID?: string;
    POINT_PACKAGE_ID?: string;
    CLOCK_OBJ: SharedObjectRef;
    TREASURY_OBJ: SharedObjectRef;
    STABILITY_POOL_OBJ: SharedObjectRef;
    INCENTIVE_GLOBAL_CONFIG_OBJ: SharedObjectRef;
    VAULT_REWARDER_REGISTRY_OBJ: SharedObjectRef;
    POOL_REWARDER_REGISTRY_OBJ: SharedObjectRef;
    PYTH_STATE_ID: string;
    WORMHOLE_STATE_ID: string;
    PYTH_RULE_PACKAGE_ID: string;
    PYTH_RULE_CONFIG_OBJ: SharedObjectRef;
    CERT_RULE_PACKAGE_ID: string;
    CERT_NATIVE_POOL_OBJ: SharedObjectRef;
    CERT_METADATA_OBJ: SharedObjectRef;
    POINT_PACKAGE_ADMIN_CAP_OBJECT_ID: string;
    POINT_GLOBAL_CONFIG_SHARED_OBJECT_REF: SharedObjectRef;
    POINT_HANDLER_MAP: Record<DEPOSIT_POINT_BONUS_COIN, SharedObjectRef>;
    STABILITY_POOL_TABLE_ID: string;
    STABILITY_POOL_REWARDERS: Rewarder[];
    VAULT_MAP: Record<COLLATERAL_COIN, VaultObjectInfo>;
};
declare const CONFIG: Record<"mainnet" | "testnet", ConfigType>;

declare class VirtueClient {
    /**
     * @description a TS wrapper over Virtue CDP client.
     * @param network connection to fullnode: 'mainnet' | 'testnet'
     * @param owner (optional) address of the current user (default: DUMMY_ADDRESS)
     */
    private rpcEndpoint;
    private iotaClient;
    private pythConnection;
    private pythClient;
    transaction: Transaction;
    sender: string;
    config: ConfigType;
    constructor(inputs?: {
        network?: "mainnet" | "testnet";
        rpcUrl?: string;
        sender?: string;
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
     * @description
     */
    getPrice(symbol: COLLATERAL_COIN): Promise<number>;
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
    /**
     * @description Get data from stability pool
     */
    getStabilityPool(): Promise<StabilityPoolInfo>;
    /**
     * @description Get user's balances in stability pool
     */
    getStabilityPoolBalances(account?: string): Promise<StabilityPoolBalances>;
    /**
     * @description Get reward amounts from borrow incentive program
     */
    getBorrowRewards(collateralSymbol: COLLATERAL_COIN, account?: string): Promise<Rewards>;
    /**
     * @description Get reward amounts from stability pool incentive program
     */
    getStabilityPoolRewards(account?: string): Promise<Rewards>;
    /**
     * @description Get CDP Positions
     */
    getCdpPositions({ coinSymbol, pageSize, cursor, }: {
        coinSymbol: COLLATERAL_COIN;
        pageSize: number;
        cursor?: string | null;
    }): Promise<CdpPositionsResponse>;
    /**
     * @description Get CDP Positions
     */
    getStabilityPoolPositions({ pageSize, cursor, }: {
        pageSize: number;
        cursor?: string | null;
    }): Promise<PoolPositionsResponse>;
    /**
     * @description new zero coin
     */
    zeroCoin(coinSymbol: COIN): TransactionResult;
    /**
     * @description destroy zero coin
     */
    destroyZeroCoin(coinSymbol: COIN, coin: TransactionArgument): void;
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
    dryrunTransaction(): Promise<DryRunTransactionBlockResponse>;
    signAndExecuteTransaction(signer: Keypair, options?: IotaTransactionBlockResponseOptions): Promise<IotaTransactionBlockResponse>;
    treasuryObj(): TransactionArgument;
    clockObj(): TransactionArgument;
    vaultObj(collateralSymbol: COLLATERAL_COIN): TransactionArgument;
    stabilityPoolObj(): TransactionArgument;
    /**
     * @description Create a AccountRequest
     * @param accountObj (optional): Account object or EOA if undefined
     * @return AccountRequest
     */
    newAccountRequest(accountObj?: string | TransactionArgument): TransactionArgument;
    /**
     * @description Create a price collector
     * @param collateral coin symbol, e.g "IOTA"
     * @return PriceCollector
     */
    newPriceCollector(collateralSymbol: COLLATERAL_COIN): TransactionArgument;
    /**
     * @description Get a price result
     * @param collateral coin symbol, e.g "IOTA"
     * @return [PriceResult]
     */
    aggregatePrice(collateralSymbol: COLLATERAL_COIN): Promise<TransactionArgument>;
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
    }): TransactionArgument;
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
    }): [TransactionArgument, TransactionArgument, TransactionArgument];
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
     * @returns PositionResponse
     */
    depositStabilityPool(inputs: {
        vusdCoin: TransactionArgument;
        recipient?: string;
    }): TransactionArgument;
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
    }): [TransactionArgument, TransactionArgument];
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
        keepTransaction?: boolean;
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
        keepTransaction?: boolean;
    }): Promise<Transaction>;
    /**
     * @description build and return Transaction of deposit stability pool
     * @param depositAmount: how much amount to deposit (collateral)
     * @returns Transaction
     */
    buildDepositStabilityPoolTransaction(inputs: {
        depositAmount: string;
        recipient?: string;
        keepTransaction?: boolean;
    }): Promise<Transaction>;
    /**
     * @description build and return Transaction of withdraw stability pool
     * @param withdrawAmount: how much amount to withdraw (collateral)
     * @returns Transaction
     */
    buildWithdrawStabilityPoolTransaction(inputs: {
        withdrawAmount: string;
        accountObj?: string;
        keepTransaction?: boolean;
    }): Promise<Transaction>;
    /**
     * @description build and return Transaction of withdraw stability pool
     * @param withdrawAmount: how much amount to withdraw (collateral)
     * @returns Transaction
     */
    buildClaimStabilityPoolTransaction(inputs: {
        accountObj?: string;
        keepTransaction?: boolean;
    }): Promise<Transaction>;
    /**
     * @description claim the rewards from borrow incentive program
     */
    buildClaimBorrowRewards(inputs: {
        accountObj?: string | TransactionArgument;
        keepTransaction?: boolean;
    }): Transaction;
    /**
     * @description claim the rewards from stability pool incentive program
     */
    buildClaimStabilityPoolRewards(inputs: {
        accountObj?: string | TransactionArgument;
        keepTransaction?: boolean;
    }): Transaction;
    /**
     * @description claim total rewards
     */
    buildClaimTotalRewards(inputs: {
        accountObj?: string | TransactionArgument;
    }): Transaction;
    /**
     * @description instruction for emitting point request
     */
    emitPointForDepositAction(collateralSymbol: DEPOSIT_POINT_BONUS_COIN, response: TransactionArgument): void;
}

declare function getObjectNames(objectTypes: string[], coinTypes: Record<COIN, string>): string[];
declare const getCoinType: (str: string, coinTypes: Record<COIN, string>) => string | null;
declare const getCoinSymbol: (coinType: string, coinTypes: Record<COIN, string>) => COIN | undefined;
declare function U64FromBytes(x: number[]): bigint;
declare const formatUnits: (value: bigint, decimals: number) => string;
declare const formatBigInt: (value: string, decimals?: number) => number;
declare const parseUnits: (value: number | string, decimals: number) => bigint;

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

export { type COIN, COIN_DECIMALS, type COLLATERAL_COIN, CONFIG, type CdpPositionsResponse, type ConfigType, type DEPOSIT_POINT_BONUS_COIN, type Double, type Float, type IotaObjectDataWithContent, ObjectContentFields, type PoolPositionsResponse, type PositionInfo, type Rewarder, type RewarderInfo, type Rewards, type SharedObjectRef, type StabilityPoolBalances, type StabilityPoolInfo, U64FromBytes, type VaultInfo, type VaultInfoList, type VaultObjectInfo, type VaultResponse, VirtueClient, formatBigInt, formatUnits, getCoinSymbol, getCoinType, getIotaObjectData, getMoveObject, getObjectFields, getObjectGenerics, getObjectNames, isDepositPointBonusCoin, parseUnits, parseVaultObject };
