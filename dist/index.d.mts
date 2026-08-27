import { Transaction, TransactionResult, TransactionArgument } from '@iota/iota-sdk/transactions';
import { IotaClient, DryRunTransactionBlockResponse, IotaTransactionBlockResponseOptions, IotaTransactionBlockResponse, IotaObjectData, IotaParsedData, IotaObjectResponse, IotaMoveObject } from '@iota/iota-sdk/client';
import { Keypair } from '@iota/iota-sdk/cryptography';
import * as superstruct from 'superstruct';
import { Infer } from 'superstruct';

type COIN = "VUSD" | "IOTA" | "stIOTA" | "vIOTA";
type COLLATERAL_COIN = "IOTA" | "stIOTA" | "vIOTA";

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
    getAllCollateralSymbol(): COLLATERAL_COIN[];
    /**
     * @description Price every collateral by dry-running `aggregatePrices` and
     * reading the emitted `PriceAggregated` events.
     *
     * A symbol is **absent** from the result when no oracle rule could price it —
     * `aggregatePrices` leaves such a symbol out of the transaction, so it emits
     * no event, and the derived symbols go with it since they are computed from
     * the IOTA price. The return type is `Partial` to say so; treat a missing
     * entry as "no price available right now", never as zero.
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
    newPriceCollector(collateralSymbol: COLLATERAL_COIN, tx?: Transaction): TransactionArgument;
    /**
     * @description Resolve everything the oracle rules need from the network,
     * without writing anything to the transaction.
     *
     * Building a position is not reversible. Commands can only be appended to a
     * `Transaction`, never removed — `getData()` returns a snapshot and the
     * builder behind it is private — and swapping in a rebuilt object is no
     * substitute, since that changes the identity a caller is composing against
     * and drops that instance's plugins and intent resolvers. So everything that
     * can fail happens here, before the first command is written, and applying the
     * result afterwards is pure transaction building.
     *
     * The prepared data is then carried into the aggregation rather than fetched
     * again. Probing and refetching would leave a window where the preflight
     * passes and the real fetch fails, throwing only after the transaction had
     * been written to — and it would pay for the same work twice.
     */
    private prepareOracleUpdates;
    /**
     * @description Whether the Switchboard rule is wired up for a symbol at all.
     *
     * Config alone decides whether the rule is *added*. It abstains on a stale
     * aggregator rather than aborting, so adding it costs nothing — but note it is
     * not unconditionally fail-soft: the deployed rule aborts on a coin type it
     * has no mapping for (`err_unsupported_coin_type`) or an aggregator that is
     * not the one registered for that coin (`err_invalid_aggregator`). Live config
     * is aligned today, and `canPriceCollateral` dev-inspects the real aggregation
     * rather than trusting that, so a drifted rule config surfaces as "cannot
     * price" instead of a failed transaction.
     */
    private switchboardRuleFeeds;
    /**
     * @description Whether the prepared data can actually price this collateral.
     *
     * Answered by building the aggregation and dev-inspecting it, rather than by
     * reasoning about which rules are configured. Configuration is not the
     * question — being wired up to Switchboard says nothing about whether its
     * aggregator still holds a result the rule will accept. With nothing cranked
     * and a stale aggregator the rule abstains, `aggregate` fails its threshold
     * with `err_total_weight_not_enough`, and a predicate that had said "yes"
     * would already have written a doomed position onto the caller's transaction.
     *
     * Running the real thing also covers what a predicate would miss: a rule
     * config drifted from the aggregator it is asked about, or any future rule
     * with its own abort conditions.
     *
     * Built on a transaction of its own. Assigning a scratch transaction to
     * `this.transaction` for the duration would expose it through
     * `getTransaction()` and, worse, let a concurrent build or
     * `resetTransaction()` land in that window only to be overwritten when this
     * restored the old one.
     *
     * A dev-inspection that *executes* and reports failure means no rule can
     * price this collateral. A dev-inspection that could not run at all means
     * nothing of the sort, so transport failures are raised rather than folded
     * into a `false` that would blame the oracles for a throttled RPC.
     */
    private canPriceCollateral;
    /**
     * @description Fetch signed Switchboard responses and keep the ones that will
     * actually validate on chain, without touching the current transaction.
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
     *   Each response is therefore devInspected on its own and only the survivors
     *   are kept.
     *
     * Never throws: a crossbar outage, a slow endpoint, a malformed response or an
     * RPC failure all come back `null`. Switchboard is one rule among several, so
     * raising here would take down price reads that the others could have served.
     */
    private prepareSwitchboard;
    /**
     * @description Append one `aggregator_submit_result_action::run` call. Pure —
     * no I/O — so replaying a response that already passed its probe cannot fail.
     * Returns false for a signature that is not the 65 bytes the action expects.
     */
    private addSwitchboardSubmission;
    /**
     * @description Add the prepared Switchboard submissions to the current
     * transaction, so the aggregator is fresh before anything in this same PTB
     * reads it. Returns how many were added; zero simply means the rule will read
     * whatever is already on chain and abstain if that is stale.
     */
    private applySwitchboard;
    /**
     * @description Get a price result
     * @param collateral coin symbol, e.g "IOTA"
     * @return [PriceResult]
     */
    aggregatePrices(): Promise<Partial<Record<COLLATERAL_COIN, TransactionResult>>>;
    /**
     * @description The transaction-building half of `aggregatePrices`, working
     * only from data already fetched and validated by `prepareOracleUpdates`.
     *
     * Kept separate so a position build can settle whether its collateral is
     * priceable before writing anything, then build from that exact same prepared
     * data — no second fetch, and so no window for the answer to change in
     * between.
     */
    private aggregatePricesWith;
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
     *
     * **Sign and execute this promptly.** Borrowing or withdrawing embeds a signed
     * Switchboard response, and the queue only accepts one for
     * `max_staleness_seconds` after the oracle signed it — 150s on the configured
     * queue, counted from the signing time rather than from now, so the usable
     * window is shorter than that. Past it,
     * `aggregator_submit_result_action::validate` aborts and takes the whole
     * transaction with it. A transaction held that long must be rebuilt, not
     * resubmitted. This deadline is inherent to feeding a price on chain.
     *
     * Either the whole position is built or the transaction is left exactly as it
     * was found — including when the collateral turns out to be unpriceable, which
     * is settled before anything is written.
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
