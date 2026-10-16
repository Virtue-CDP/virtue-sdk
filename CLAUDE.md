# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`@virtue/sdk` is a TypeScript SDK that wraps the **Virtue CDP protocol** (a collateralized-debt-position / stablecoin protocol minting `VUSD`) deployed on the **IOTA** network. It is a library, not an app — it builds and reads IOTA Move transactions. The entire public surface is the `VirtueClient` class plus exported types/constants/utils.

## Commands

```bash
yarn build          # bundle with tsup -> dist/ (esm + cjs + .d.ts)
yarn test           # run vitest (watch mode by default)
yarn test run       # single non-watch run
yarn test -t "test getVault"   # run one test by name
yarn clean          # rm -rf dist/
```

There is no separate lint script; ESLint (`.eslintrc.cjs`, `@typescript-eslint`) and Prettier are configured but invoked via editor/`npx eslint`. The `@/*` path alias maps to `src/*` (configured in both `tsconfig.json` and `vitest.config.ts`).

**Tests hit live mainnet RPC and Pyth Lazer.** Export `PYTH_LAZER_TOKEN` before running them; without it the oracle suite is skipped and price assertions fail. `test/client.test.ts` dry-runs real transactions and asserts against live on-chain state (prices, pool balances), so they require network access and can fail for reasons unrelated to code (RPC downtime, the test wallet's balances, price relationships). They are integration tests, not hermetic unit tests.

## Architecture

Everything flows through `src/client.ts` (`VirtueClient`). The rest of `src/` is supporting data and parsing:

- **`src/constants/object.ts`** — the source of truth for all deployed addresses. `CONFIG` is keyed by `"mainnet" | "testnet"` and holds every package ID, shared object ref, and the per-collateral `VAULT_MAP`. **When the protocol upgrades on-chain, this is the file that changes** (see git history: "upgrade POINT_PACKAGE_ID", etc.). Note the distinction between `XXX_PACKAGE_ID` (current, used for move-call targets) and `ORIGINAL_XXX_PACKAGE_ID` (the package's original/v1 ID, used for type tags that must reference the original module, e.g. `PriceResult` in `updatePosition`).
- **`src/types/`** — `coin.ts` defines the two enums everything keys off: `COIN` (all coins incl. `VUSD`) and `COLLATERAL_COIN` (subset usable as collateral). `structs.ts` holds the parsed-shape types; `response.ts` the raw on-chain field shapes.
- **`src/utils/`** — `getObjectFields`/`getMoveObject` safely extract Move object fields from RPC responses; `parseVaultObject` converts a raw vault response into a typed `VaultInfo`.

### How VirtueClient works

The client holds **one mutable `this.transaction`** (`Transaction`) that builder methods accumulate move-calls into. Key conventions:

- `resetTransaction()` swaps in a fresh `Transaction`. Most `buildXxxTransaction` methods call it at the start unless `keepTransaction: true` is passed — this flag is how multiple build steps are composed into one tx (e.g. `buildClaimTotalRewards` chains borrow + pool reward claims).
- `sender` defaults to `DUMMY_ADDRESS` (`0x0`) when no address is given. Read methods that need a real address throw if it's still `0x0`.
- **Reads** use `devInspectTransactionBlock` / `dryRunTransactionBlock` and parse `returnValues`/`events` with `bcs` structs (see `CDP_POSITION_DATA`, `POOL_POSITION_DATA` at the top of `client.ts`). `getCollateralPrices` works by dev-inspecting each collateral's aggregation on its own and reading the emitted `PriceAggregated` event.
- **Prices** come from oracle *rules* feeding a shared collector, which `aggregater::aggregate` reduces to a single `PriceResult`. **Pyth Lazer is currently the only source** (`pyth_lazer_rule`: IOTA = Lazer feed 70, iBTC = feed 1). It replaced Switchboard, which was retired after the 2026-08-28 oracle manipulation (see the contracts repo's `docs/incidents/`). See `prepareOracleUpdates`/`prepareLazer` in `client.ts`. That makes the Lazer fetch load-bearing: there is no second opinion to fall back on, so a Lazer outage means no price at all, and the SDK has to say so rather than build a transaction that aborts on chain.
  **No rule may throw out of the SDK**: each degrades to contributing nothing, and whether a usable price results is decided on chain. Rules differ in how they fail, so check before assuming — `pyth_lazer_rule::feed` abstains on a stale update, or one missing `confidence` or `feedUpdateTimestamp`, but aborts on a coin type it has no feed id for. A symbol nothing can price is omitted from the transaction entirely (`aggregate` needs one source to meet its threshold), which is why `aggregatePrices` returns a `Partial<Record<...>>`. Prices are organised around **basic symbols** (`IOTA`, `iBTC`) and the symbols derived from them (`DERIVED_FROM`: `stIOTA` and `vIOTA` come from the IOTA price via the cert/vcert rules). A PTB is all-or-nothing, so prices are kept independent: each basic symbol has its own Lazer request and its own verify; `aggregatePrices()` and `getCollateralPrices()` dev-inspect each collateral on its own (a derived one together with the basic price it needs) and keep only those that price; and a position build prices only its own collateral (`aggregatePricesWith(prepared, tx, [symbol])`). An iBTC outage must never take IOTA down, nor a broken vIOTA pool IOTA or stIOTA. Both reads leave out a collateral whose inspection hit an RPC failure; `getCollateralPrices()` throws only when every inspection did. Adding a collateral means extending `BASIC_PRICE_SYMBOLS`/`DERIVED_FROM` and `aggregatePricesWith`, not just `VAULT_MAP`.
  - **Lazer is pull-based and token-gated.** Nothing is stored on chain: the SDK fetches one signed update per basic symbol (`POST /v1/latest_price`, `leEcdsa`, channel `PYTH_LAZER_CHANNEL`) and verifies it *in the same PTB* with `pyth_lazer::parse_and_verify_le_ecdsa_update` before `pyth_lazer_rule::feed` reads it. Separate requests matter: Lazer rejects a whole request when any one feed in it is not entitled. There is no separate verify probe; the group's aggregation dev-inspect runs the verify, which keeps round trips out of the freshness window. Endpoints are tried in order (`DEFAULT_LAZER_ENDPOINTS`: `pyth-lazer-0/1/2.dourolabs.app`), and `pythLazer.endpoint` accepts a list. Access comes from the constructor's `pythLazer: { apiKey?, endpoint? }`; the SDK never reads `process.env`. The token is a secret, so a browser dApp must point `endpoint` at its own server route that adds the `Authorization: Bearer` header, and pass no `apiKey`. Without access, Lazer answers 401 and nothing is priced.
  - **The requested properties are part of the security configuration.** `pyth_lazer_rule` fails closed on an update missing `confidence` or `feedUpdateTimestamp` (the caller picks the properties, so a gate that passed on absence could be skipped), so `LAZER_PROPERTIES` must keep them.
  - **The work is split by whether it can fail.** `prepareOracleUpdates()` does everything with a network boundary and returns validated data; applying it is pure transaction building that makes no RPC calls at all. That is what lets `buildManagePositionTransaction` settle priceability *before* writing anything — a `Transaction` cannot be rolled back, and rebuilding a replacement would change the identity the caller composes against and drop that instance's plugins. `canPriceCollateral()` answers by dev-inspecting the real aggregation, never by inferring from config.
  - **A debt-free position can withdraw without a price.** `update_position` only needs a price for a borrow or a withdrawal that leaves debt, so an oracle outage must not lock collateral in. When `canPriceCollateral` says no, `canWithdrawWithoutPrice` dev-inspects the real withdrawal with `option::none` (built by a scratch client) and only a successful inspection lets it through; the SDK never re-derives the vault's rule. It is narrowed to a plain withdrawal (no deposit, repayment or borrow), a real sender, and an otherwise empty transaction, since commands composed ahead of it change the state it would execute against.
  - **A built transaction expires.** `pyth_lazer_rule` accepts an update only within its freshness tolerance of Pyth's signing time (30s by default). Past that the rule abstains and `aggregate` aborts, so a transaction held too long must be rebuilt rather than resubmitted.

### The CDP position flow (most important to understand)

Mutating a position is a multi-step Move "hot-potato" pattern, orchestrated by `buildManagePositionTransaction`:

1. `debtorRequest` (or `donorRequest`) → an `UpdateRequest`
2. `checkRequest` → wraps it through the borrow-incentive program (only if `INCENTIVE_PACKAGE_ID` is configured)
3. `updatePosition` → consumes the request, returns `[collCoin, vusdCoin, response]`
4. `checkResponse` → emits points (`emitPoint`) and destroys the response

Deposit/borrow/repay/withdraw are all the same call with different non-zero amounts. Zero-value coins are created with `zeroCoin` and cleaned up with `destroyZeroCoin`. `recipient: "StabilityPool"` is a special sentinel that routes borrowed VUSD straight into the stability pool instead of transferring to the user.

The stability pool has a parallel flow (`depositStabilityPool` / `withdrawStabilityPool` / `claimStabilityPool` → `checkResponseForStabilityPool`), also gated on the optional incentive program.

### Optional, config-gated features

Several parts of `ConfigType` are optional and testnet omits them, so the code paths that use them are guarded by `if (this.config.XXX)` and become no-ops there. Preserve these guards when editing.

- `INCENTIVE_PACKAGE_ID` / `POINT_PACKAGE_ID` gate `checkRequest`, `checkResponseForStabilityPool`, and `emitPoint`.
- `PYTH_LAZER_PACKAGE_ID`, `PYTH_LAZER_STATE_OBJ`, `PYTH_LAZER_RULE_PACKAGE_ID`, `PYTH_LAZER_RULE_CONFIG_OBJ`, `PYTH_LAZER_FEED_IDS` and `PYTH_LAZER_CHANNEL` gate the verify and the `feed` call in `aggregatePrices`. **testnet has no `pyth_lazer_rule` deployment and so no oracle at all** — `aggregatePrices` there returns an empty record, borrowing refuses to build, and so does withdrawing from a position with debt.
