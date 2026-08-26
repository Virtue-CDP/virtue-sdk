import { Transaction, TransactionResult, TransactionArgument } from '@iota/iota-sdk/transactions';
import { IotaClient, DryRunTransactionBlockResponse, IotaTransactionBlockResponseOptions, IotaTransactionBlockResponse, IotaObjectData, IotaParsedData, IotaObjectResponse, IotaMoveObject } from '@iota/iota-sdk/client';
import { IotaPriceServiceConnection, IotaPythClient } from '@pythnetwork/pyth-iota-js';
import { Keypair } from '@iota/iota-sdk/cryptography';
import * as superstruct from 'superstruct';
import { Infer } from 'superstruct';

type COIN = "VUSD" | "IOTA" | "stIOTA" | "iBTC" | "vIOTA";
type COLLATERAL_COIN = "IOTA" | "stIOTA" | "iBTC" | "vIOTA";

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
        collateralType: string;
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
    VAULT_REWARDER_REGISTRY_OBJ: SharedObjectRef;
    POOL_REWARDER_REGISTRY_OBJ: SharedObjectRef;
    PYTH_STATE_ID: string;
    WORMHOLE_STATE_ID: string;
    PYTH_RULE_PACKAGE_ID: string;
    PYTH_RULE_CONFIG_OBJ: SharedObjectRef;
    CERT_RULE_PACKAGE_ID: string;
    CERT_NATIVE_POOL_OBJ: SharedObjectRef;
    CERT_METADATA_OBJ: SharedObjectRef;
    VCERT_RULE_PACKAGE_ID: string;
    VCERT_NATIVE_POOL_OBJ: SharedObjectRef;
    VCERT_METADATA_OBJ: SharedObjectRef;
    /**
     * Switchboard On-Demand. Optional: where these are absent `aggregatePrices`
     * skips the crank and the `switchboard_rule::feed` call entirely, which is what
     * testnet does — there is no deployment there.
     */
    SWITCHBOARD_PACKAGE_ID?: string;
    SWITCHBOARD_RULE_PACKAGE_ID?: string;
    SWITCHBOARD_RULE_CONFIG_OBJ?: SharedObjectRef;
    /** Coin symbol -> the one `Aggregator` object `feed<T>` accepts for it. */
    SWITCHBOARD_AGGREGATORS?: Partial<Record<COLLATERAL_COIN, string>>;
    POINT_GLOBAL_CONFIG_OBJ: SharedObjectRef;
    POINT_MANAGER_OBJ: SharedObjectRef;
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
    getAllCollateralSymbol(): COLLATERAL_COIN[];
    /**
     * @description Price every collateral by dry-running `aggregatePrices` and
     * reading the emitted `PriceAggregated` events.
     *
     * A symbol is **absent** from the result when no oracle rule could price it —
     * `aggregatePrices` leaves such a symbol out of the transaction, so it emits
     * no event. iBTC is the live example: it is fed by Pyth alone, so it drops out
     * whenever the Pyth update cannot be applied, while IOTA carries on through
     * Switchboard. The return type is `Partial` to say so; treat a missing entry
     * as "no price available right now", never as zero.
     */
    getCollateralPrices(): Promise<Partial<Record<COLLATERAL_COIN, number>>>;
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
     * @description Whether any oracle rule can currently price this collateral —
     * i.e. whether `aggregatePrices` will return a result for it.
     *
     * This exists to be asked *before* anything is written to the transaction.
     * The answer is only knowable by probing Pyth, and `aggregatePrices` learns it
     * as a side effect of building; acting on it afterwards would mean unwinding
     * commands already appended, and `Transaction` cannot be rolled back in place.
     * Rebuilding a replacement is not a substitute — it changes object identity and
     * silently drops the instance's build/serialization plugins and intent
     * resolvers, which a caller composing with `keepTransaction` may depend on.
     *
     * Cheap in the common case: a collateral with a Switchboard aggregator is
     * priceable by configuration alone and costs no network call. Only a
     * Pyth-only collateral pays for the probe.
     */
    private canPriceCollateral;
    /**
     * @description Add Pyth's price-feed update to the current transaction and
     * return the `PriceInfoObject` ids that `pyth_rule::feed` should read.
     *
     * Like the Switchboard crank this never throws, and it goes one step further:
     * it also refuses to leave an update in the transaction that would abort on
     * chain. A Pyth update carries a Wormhole VAA, and `vaa::parse_and_verify`
     * aborts outright once Hermes has moved to a guardian set newer than the one
     * registered on IOTA — which is the state mainnet is in. That abort is not an
     * SDK error; it takes down the entire PTB, borrow or liquidation included. So
     * the update is devInspected on its own first and only applied if it passes.
     *
     * When it does not pass — or Hermes is unreachable — every entry comes back
     * undefined and the caller drops `pyth_rule::feed` for that symbol. The rule
     * cannot be pointed at the un-updated `PriceInfoObject` as a consolation:
     * `pyth_rule::feed` does not abstain on a stale price, it aborts through
     * `pyth::check_price_is_fresh`, which would take the PTB down exactly the way
     * a failed update does. Not feeding is the only safe fallback.
     */
    private updatePythPriceFeeds;
    /**
     * @description Fetch signed Switchboard responses and add the ones that will
     * actually validate on chain to the current transaction.
     *
     * Switchboard is on-demand, not push: `Aggregator.current_result` only changes
     * when someone submits a signed oracle response. Left alone the IOTA mainnet
     * feed sat 330 days stale, so the crank belongs in the same PTB as the read.
     *
     * Two things make this awkward, both handled here:
     *
     * - Most oracles on the IOTA queues are broken — their signature no longer
     *   recovers to the `secp256k1_key` in their on-chain `Oracle` object, so
     *   `aggregator_submit_result_action::validate` aborts. Crossbar hands out one
     *   at random per request, so a plain crank succeeds about a quarter of the
     *   time. `numSignatures` asks for the whole set instead.
     * - A PTB is all-or-nothing, so one broken oracle would take the entire price
     *   read — and whatever borrow or liquidation is bundled with it — down too.
     *   Each response is therefore devInspected on its own first and only the
     *   survivors are added.
     *
     * Returns the number of submissions added, and **never throws**: a crossbar
     * outage, a slow endpoint, a malformed response, or an RPC failure all resolve
     * to `0`. Switchboard is one rule among several, so raising here would take
     * down price reads — and every position build that depends on them — that the
     * other rules could have served on their own. Contributing nothing is the
     * correct failure mode: the decision then belongs on chain, where `aggregate`
     * aborts by itself if no rule supplied a usable price.
     *
     * Zero also covers the case where every oracle simply failed validation, in
     * which case `switchboard_rule::feed` falls back to whatever result is already
     * on chain — which its freshness gate will reject if it is stale, making the
     * rule abstain rather than quoting a stale price.
     */
    private crankSwitchboard;
    /**
     * @description Get a price result
     * @param collateral coin symbol, e.g "IOTA"
     * @return [PriceResult]
     */
    aggregatePrices(): Promise<Partial<Record<COLLATERAL_COIN, TransactionResult>>>;
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
     * @description Get a request to Mange Position
     * @param collateralSymbol: collateral coin symbol , e.g "IOTA"
     * @param depositCoin: collateral input coin
     * @param borrowAmount: the amount to borrow
     * @param repaymentCoin: repyment input coin (always VUSD)
     * @param withdrawAmount: the amount to withdraw
     * @param accountObj (optional): account object id or transaction argument
     * @returns UpdateRequest
     */
    donorRequest(inputs: {
        collateralSymbol: COLLATERAL_COIN;
        debtor: string;
        depositCoin: TransactionArgument;
        repaymentCoin: TransactionArgument;
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
     * @description check and destroy UpdateRequest
     * @param collateralSymbol: "IOTA" or "stIOTA"
     * @param response: UpdateRequest generated by update_position
     */
    checkRequest(inputs: {
        collateralSymbol: COLLATERAL_COIN;
        request: TransactionArgument;
    }): TransactionArgument;
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
        accountRequest?: TransactionArgument;
        accountObj?: string | TransactionArgument;
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
     * @description The body of `buildManagePositionTransaction`, split out so the
     * entry point above can settle its preconditions before anything is written.
     */
    private buildManagePosition;
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
        accountObjId?: string;
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
    }): Transaction;
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
    emitPoint(collateralSymbol: COLLATERAL_COIN, response: TransactionArgument): void;
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

export { type COIN, COIN_DECIMALS, type COLLATERAL_COIN, CONFIG, type CdpPositionsResponse, type ConfigType, type Double, type Float, type IotaObjectDataWithContent, ObjectContentFields, type PoolPositionsResponse, type PositionInfo, type Rewarder, type RewarderInfo, type Rewards, type SharedObjectRef, type StabilityPoolBalances, type StabilityPoolInfo, U64FromBytes, type VaultInfo, type VaultInfoList, type VaultObjectInfo, type VaultResponse, VirtueClient, formatBigInt, formatUnits, getCoinSymbol, getCoinType, getIotaObjectData, getMoveObject, getObjectFields, getObjectGenerics, getObjectNames, parseUnits, parseVaultObject };
