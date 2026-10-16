import { Transaction, TransactionResult, TransactionArgument } from '@iota/iota-sdk/transactions';
import { IotaClient, DryRunTransactionBlockResponse, IotaTransactionBlockResponseOptions, IotaTransactionBlockResponse, IotaObjectData, IotaParsedData, IotaObjectResponse, IotaMoveObject } from '@iota/iota-sdk/client';
import { Keypair } from '@iota/iota-sdk/cryptography';
import * as superstruct from 'superstruct';
import { Infer } from 'superstruct';

type COIN = "VUSD" | "IOTA" | "stIOTA" | "iBTC" | "vIOTA";
type COLLATERAL_COIN = "IOTA" | "stIOTA" | "iBTC" | "vIOTA";
/** Stablecoins the Virtue PSM swaps 1:1 with VUSD. */
type PSM_COIN = "USDT0";

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
type PsmPoolObjectInfo = {
    coinType: string;
    decimal: number;
    pool: SharedObjectRef;
};
/**
 * A PSM pool's live state. Amounts are raw on-chain units as strings: `balance`
 * in the pool's coin, `vusdSupply` and the module limit in VUSD. Fee rates are
 * fractions (0.001 = 0.1%).
 */
type PsmPoolInfo = {
    coin: PSM_COIN;
    coinType: string;
    decimal: number;
    /** The pool's coin it holds, so the most a swap out can pay. */
    balance: string;
    /** VUSD minted through this pool and not yet burned back. */
    vusdSupply: string;
    /** Default fee rates, paid by any swap without a partner `AccountRequest`. */
    swapInFeeRate: number;
    swapOutFeeRate: number;
    /** Fee rates for partners, keyed by their normalized `AccountRequest` address. */
    partnerFeeRates: Record<string, {
        swapInFeeRate: number;
        swapOutFeeRate: number;
    }>;
    /**
     * VUSD the PSM module may still mint (`limit - supply` on the treasury),
     * shared by every PSM pool. A swap in that would mint past it aborts.
     */
    mintableVusd: string;
    /**
     * VUSD the PSM module has minted and not burned, across every PSM pool. A
     * swap out burns against it first, so it caps a swap out too.
     */
    moduleVusdSupply: string;
};
type PsmPoolInfoList = Partial<Record<PSM_COIN, PsmPoolInfo>>;

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
     * Pyth Lazer. Optional: where these are absent `aggregatePrices` skips the
     * verify and the `pyth_lazer_rule::feed` call entirely, which is what testnet
     * does — there is no rule deployment there.
     */
    /** Pyth's `pyth_lazer` package; the verify entry is called here. */
    PYTH_LAZER_PACKAGE_ID?: string;
    /** Pyth's shared Lazer `State`, holding the trusted signer set. */
    PYTH_LAZER_STATE_OBJ?: SharedObjectRef;
    PYTH_LAZER_RULE_PACKAGE_ID?: string;
    PYTH_LAZER_RULE_CONFIG_OBJ?: SharedObjectRef;
    /** Coin symbol -> the Lazer feed id `pyth_lazer_rule` reads for it. */
    PYTH_LAZER_FEED_IDS?: Partial<Record<COLLATERAL_COIN, number>>;
    /**
     * The Lazer channel to request. Must be one the token is entitled to:
     * Virtue's grant allows nothing faster than `fixed_rate@1000ms`.
     */
    PYTH_LAZER_CHANNEL?: string;
    POINT_GLOBAL_CONFIG_OBJ: SharedObjectRef;
    POINT_MANAGER_OBJ: SharedObjectRef;
    STABILITY_POOL_TABLE_ID: string;
    STABILITY_POOL_REWARDERS: Rewarder[];
    VAULT_MAP: Record<COLLATERAL_COIN, VaultObjectInfo>;
    /**
     * Virtue PSM. Optional: testnet has no deployment, and the PSM methods throw
     * there rather than build a call to nothing.
     */
    PSM_PACKAGE_ID?: string;
    /**
     * The PSM module's witness type, keying its supply on the treasury. Must name
     * the package's original id: a `TypeName` keeps it across upgrades.
     */
    PSM_WITNESS_TYPE?: string;
    PSM_POOLS?: Partial<Record<PSM_COIN, PsmPoolObjectInfo>>;
};
declare const CONFIG: Record<"mainnet" | "testnet", ConfigType>;

/**
 * Pyth's Lazer HTTP API hosts, tried in order until one answers with an update.
 * Each serves the same signed data. Override with `pythLazer.endpoint` to go
 * through a proxy; exported so that proxy can use the same hosts.
 */
declare const DEFAULT_LAZER_ENDPOINTS: readonly string[];
/**
 * Properties requested in every Lazer update. `pyth_lazer_rule` abstains on an
 * update missing `confidence` or `feedUpdateTimestamp`, and reads
 * `marketSession` when present, so trimming this list silently loses the price.
 *
 * Exported so a proxy in front of Lazer can request exactly this list rather
 * than keep a copy that drifts when the SDK needs another property.
 */
declare const LAZER_PROPERTIES: readonly ["price", "exponent", "confidence", "feedUpdateTimestamp", "marketSession"];
/**
 * Access to Pyth Lazer. Lazer is token-gated, and the token is a secret: a
 * browser must not hold it. A dApp should point `endpoint` at its own server
 * route that forwards `POST /v1/latest_price` with the token attached, and pass
 * no `apiKey`. A server-side caller can pass `apiKey` directly.
 */
type PythLazerAccess = {
    /** Sent as `Authorization: Bearer <apiKey>` when given. */
    apiKey?: string;
    /**
     * Base URL(s) serving `POST /v1/latest_price`, tried in order until one
     * returns an update. Defaults to Pyth's own hosts.
     */
    endpoint?: string | readonly string[];
};
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
    private network;
    private pythLazer;
    constructor(inputs?: {
        network?: "mainnet" | "testnet";
        rpcUrl?: string;
        sender?: string;
        /** Required to price anything: IOTA comes from Pyth Lazer alone. */
        pythLazer?: PythLazerAccess;
    });
    /**
     * @description Get this.iotaClient
     */
    getIotaClient(): IotaClient;
    getAllCollateralSymbol(): COLLATERAL_COIN[];
    /**
     * @description Price every collateral by dev-inspecting its aggregation and
     * reading the emitted `PriceAggregated` event.
     *
     * Each collateral is inspected on its own — a derived one together with the
     * basic price it needs — so nothing that fails to price can hide another
     * price: not iBTC hiding IOTA, and not a broken vIOTA pool hiding IOTA or
     * stIOTA.
     *
     * A symbol is **absent** from the result when no oracle rule could price it,
     * and the derived symbols go with it when their basic price is missing. The
     * return type is `Partial` to say so; treat a missing entry as "no price
     * available right now", never as zero.
     *
     * A symbol whose inspection could not be performed at all (an RPC failure) is
     * left out the same way, as in `aggregatePrices`. If every inspection that
     * actually reached the RPC failed that way, the RPC is unreachable, and that
     * is thrown rather than reported as an empty set of prices.
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
     * @description Get every PSM pool's live state, with the VUSD the PSM module
     * may still mint. Empty where the network has no PSM.
     */
    getPsmPools(): Promise<PsmPoolInfoList>;
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
     * @description split the needed coins of any non-IOTA coin type, merging the
     * sender's coins of that type first. Everything that can fail (the coin
     * reads, the balance check) runs before anything is written, since a
     * `Transaction` cannot be rolled back.
     */
    splitCoinsByType(coinType: string, ...amounts: (string | TransactionArgument)[]): Promise<TransactionResult>;
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
    /** The PSM package and `coin`'s pool, or a throw where there is no PSM. */
    private psmPool;
    /**
     * `&Option<AccountRequest>` for the PSM's partner fee lookup: `none` pays the
     * default rates.
     */
    private psmPartner;
    /**
     * @description PSM swap in: deposit `coin` and mint VUSD 1:1 after decimal
     * scaling, less the swap-in fee (taken in VUSD)
     * @param assetCoin: Coin<coin> to deposit
     * @param accountRequest (optional): a partner's AccountRequest for its fee rate
     * @returns Coin<VUSD>
     */
    psmSwapIn(inputs: {
        coin: PSM_COIN;
        assetCoin: TransactionArgument;
        accountRequest?: TransactionArgument;
    }): TransactionArgument;
    /**
     * @description PSM swap out: burn VUSD and withdraw `coin` 1:1 after decimal
     * scaling, less the swap-out fee (taken in `coin`)
     * @param vusdCoin: Coin<VUSD> to burn
     * @param accountRequest (optional): a partner's AccountRequest for its fee rate
     * @returns Coin<coin>
     */
    psmSwapOut(inputs: {
        coin: PSM_COIN;
        vusdCoin: TransactionArgument;
        accountRequest?: TransactionArgument;
    }): TransactionArgument;
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
     *
     * Each basic symbol gets its own Lazer request. Lazer rejects a whole request
     * when any one feed in it is not entitled, so a shared request would let one
     * feed's entitlement decide every price.
     */
    private prepareOracleUpdates;
    /**
     * @description The configured collaterals that have an oracle path at all:
     * the basic symbols, and the symbols derived from one of them.
     */
    private priceableSymbols;
    /**
     * @description Whether the Lazer rule is wired up for a symbol at all.
     *
     * Config alone decides whether the rule is *added*. The rule abstains on a
     * stale or incomplete update rather than aborting, but it aborts on a coin type
     * it has no feed id for (`EUnsupportedCoinType`). Live config is aligned today,
     * and `canPriceCollateral` dev-inspects the real aggregation rather than
     * trusting that, so a drifted rule config surfaces as "cannot price" instead
     * of a failed transaction.
     */
    private lazerRuleFeeds;
    /**
     * @description Build the aggregation for `symbols` on a transaction of its own
     * and dev-inspect it. Returns `null` when the prepared data cannot even build
     * a price for every symbol asked about (nothing to inspect).
     *
     * Built on a transaction of its own. Assigning a scratch transaction to
     * `this.transaction` for the duration would expose it through
     * `getTransaction()` and, worse, let a concurrent build or
     * `resetTransaction()` land in that window only to be overwritten when this
     * restored the old one.
     *
     * Transport failures propagate; callers decide what they mean.
     */
    private inspectAggregation;
    /**
     * @description Whether the prepared data can actually price this collateral.
     *
     * Answered by building the aggregation and dev-inspecting it, rather than by
     * reasoning about which rules are configured. Configuration is not the
     * question — having a Lazer update says nothing about whether the rule will
     * accept it. An update signed too long ago, or one whose confidence band is
     * wider than the rule's gate, makes the rule abstain, `aggregate` fails its
     * threshold with `err_total_weight_not_enough`, and a predicate that had said
     * "yes" would already have written a doomed position onto the caller's
     * transaction. The same inspection runs the on-chain verify, so an update the
     * verifier rejects is caught here too.
     *
     * Running the real thing also covers what a predicate would miss: a rule
     * config drifted from the coin types asked about, or any future rule with its
     * own abort conditions.
     *
     * A dev-inspection that *executes* and reports failure means no rule can
     * price this collateral. A dev-inspection that could not run at all means
     * nothing of the sort, so transport failures are raised rather than folded
     * into a `false` that would blame the oracles for a throttled RPC.
     */
    private canPriceCollateral;
    /**
     * @description Fetch one signed Lazer update for `feedId`, without touching
     * the current transaction.
     *
     * Lazer is pull-based: nothing is stored on chain, so the signed update has to
     * travel in the same PTB as the read, through
     * `pyth_lazer::parse_and_verify_le_ecdsa_update`.
     *
     * No on-chain check happens here. Whether the update verifies and prices is
     * settled by the single dev-inspection of the real aggregation that every
     * caller runs anyway, which includes the verify; probing the verify alone
     * first would only spend time inside the rule's freshness window.
     *
     * Endpoints are tried in order. Never throws: no access configured, an
     * endpoint outage, a slow or unauthorised response or malformed bytes all
     * move on to the next endpoint, and come back `null` when none answered.
     */
    private prepareLazer;
    /**
     * @description Pull the signed `leEcdsa` bytes out of a `/v1/latest_price`
     * response body, or `null` when it carries none. Pure — no I/O.
     *
     * `Buffer` is a Node global that browser bundles do not provide, and a
     * ReferenceError here would be swallowed by the fail-soft catch around
     * preparation — quietly disabling the only price source there is, for every
     * dApp consumer. `fromHEX` works in both runtimes.
     */
    private lazerUpdateFromResponse;
    /**
     * @description Append the Lazer verify call and return the verified `Update`.
     * Pure — no I/O.
     */
    private verifyLazerUpdate;
    /**
     * @description Price every collateral that can be priced right now, into the
     * current transaction.
     *
     * Each collateral is dev-inspected on its own first — a derived one together
     * with the basic price it needs — and only those that price are added,
     * because a PTB is all-or-nothing: one abort would otherwise take every other
     * price, and whatever the caller bundles with them, down too. A broken vIOTA
     * pool therefore leaves IOTA and stIOTA in place. Never throws — a collateral
     * whose inspection could not be performed is left out.
     *
     * @return PriceResult per collateral that could be priced
     */
    aggregatePrices(): Promise<Partial<Record<COLLATERAL_COIN, TransactionResult>>>;
    /**
     * @description The transaction-building half of the price calls, working only
     * from data already fetched by `prepareOracleUpdates`. Pure — no I/O.
     *
     * Builds only what `symbols` need: each requested symbol's basic symbol, then
     * the requested derived symbols. A borrow against IOTA therefore carries
     * nothing of iBTC's, and the reverse.
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
     * @description Whether this withdrawal can go ahead with no price at all.
     *
     * Answered by dev-inspecting the real withdrawal with `option::none`, never by
     * reasoning about the vault's rules: `update_position` decides when it needs a
     * price (today, a borrow or a withdrawal that leaves debt), and a copy of that
     * rule here would drift the moment the vault changed. Only a successful
     * inspection says yes. One that aborts, for any reason, says no; one that
     * could not run at all is a transport failure and is raised as one.
     *
     * Narrowed to what an inspection of committed state can vouch for: a plain
     * withdrawal (nothing deposited, repaid or borrowed), by a real sender, on a
     * transaction carrying nothing else. Commands already composed ahead of it,
     * a borrow on this same position say, would change the state it executes
     * against.
     *
     * The probe is built by a scratch client so it never touches this client's
     * transaction; a plain withdrawal builds without any RPC calls.
     */
    private canWithdrawWithoutPrice;
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
     * Pyth Lazer update, and `pyth_lazer_rule` only accepts one within its
     * freshness tolerance of the moment Pyth signed it — 30s by default, counted
     * from the signing time rather than from now. Past it the rule abstains,
     * `aggregate` aborts with `err_total_weight_not_enough`, and the whole
     * transaction goes with it. A transaction held that long must be rebuilt, not
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
     * @description build and return Transaction of a PSM swap, sending the
     * output to the sender. No oracle is involved: the PSM swaps at a fixed 1:1.
     * @param coin: the PSM stablecoin, e.g. "USDT0"
     * @param direction: "in" pays `coin` for VUSD, "out" pays VUSD for `coin`
     * @param amount: raw units of what is paid
     * @param accountObj (optional): pay a partner's fee rates. Quote it with the
     * account's address as `quotePsmSwap`'s `partner`, or the quote will not
     * match.
     * @returns Transaction
     */
    buildPsmSwapTransaction(inputs: {
        coin: PSM_COIN;
        direction: "in" | "out";
        amount: string;
        accountObj?: string | TransactionArgument;
        keepTransaction?: boolean;
    }): Promise<Transaction>;
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

type PsmSwapDirection = "in" | "out";
/**
 * Why the chain would refuse a swap: a swap in that mints past the PSM's VUSD
 * supply limit, or a swap out larger than the pool's coin balance, the VUSD
 * minted through this pool, or the VUSD the PSM module has outstanding across
 * all its pools (the treasury's burn or the pool's `EPoolNotEnough` aborts).
 */
type PsmQuoteError = "SUPPLY_LIMIT" | "POOL_NOT_ENOUGH";
type PsmQuote = {
    direction: PsmSwapDirection;
    /** Raw units of what is paid: the pool's coin for "in", VUSD for "out". */
    amountIn: bigint;
    /** Raw units of what is received, after the fee. */
    amountOut: bigint;
    /** Raw units of the fee, in the received coin. */
    fee: bigint;
    error?: PsmQuoteError;
};
/**
 * The exact result of `pool::swap_in` / `pool::swap_out` for `amountIn` raw
 * units, with the chain's rounding: the converted amount is floored and the
 * fee, taken from the output, is rounded up.
 * @param partner (optional) the address of the partner `AccountRequest` the
 * swap carries (see `buildPsmSwapTransaction`'s `accountObj`). Without it the
 * quote uses the default fee rates, as the chain does for a swap with none.
 */
declare const quotePsmSwap: (pool: PsmPoolInfo, direction: PsmSwapDirection, amountIn: bigint, partner?: string) => PsmQuote;
/**
 * The smallest input whose swap pays out at least `amountOut` raw units, for
 * a form where the user types what they want to receive. Rounding makes the
 * output a step function of the input, so this searches rather than inverts.
 */
declare const quotePsmSwapExactOut: (pool: PsmPoolInfo, direction: PsmSwapDirection, amountOut: bigint, partner?: string) => PsmQuote;

export { type COIN, COIN_DECIMALS, type COLLATERAL_COIN, CONFIG, type CdpPositionsResponse, type ConfigType, DEFAULT_LAZER_ENDPOINTS, type Double, type Float, type IotaObjectDataWithContent, LAZER_PROPERTIES, ObjectContentFields, type PSM_COIN, type PoolPositionsResponse, type PositionInfo, type PsmPoolInfo, type PsmPoolInfoList, type PsmPoolObjectInfo, type PsmQuote, type PsmQuoteError, type PsmSwapDirection, type PythLazerAccess, type Rewarder, type RewarderInfo, type Rewards, type SharedObjectRef, type StabilityPoolBalances, type StabilityPoolInfo, U64FromBytes, type VaultInfo, type VaultInfoList, type VaultObjectInfo, type VaultResponse, VirtueClient, formatBigInt, formatUnits, getCoinSymbol, getCoinType, getIotaObjectData, getMoveObject, getObjectFields, getObjectGenerics, getObjectNames, parseUnits, parseVaultObject, quotePsmSwap, quotePsmSwapExactOut };
