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

**Tests hit live mainnet RPC.** `test/client.test.ts` dry-runs real transactions and asserts against live on-chain state (prices, pool balances), so they require network access and can fail for reasons unrelated to code (RPC downtime, the test wallet's balances, price relationships). They are integration tests, not hermetic unit tests.

## Architecture

Everything flows through `src/client.ts` (`VirtueClient`). The rest of `src/` is supporting data and parsing:

- **`src/constants/object.ts`** — the source of truth for all deployed addresses. `CONFIG` is keyed by `"mainnet" | "testnet"` and holds every package ID, shared object ref, and the per-collateral `VAULT_MAP`. **When the protocol upgrades on-chain, this is the file that changes** (see git history: "upgrade POINT_PACKAGE_ID", etc.). Note the distinction between `XXX_PACKAGE_ID` (current, used for move-call targets) and `ORIGINAL_XXX_PACKAGE_ID` (the package's original/v1 ID, used for type tags that must reference the original module, e.g. `PriceResult` in `updatePosition`).
- **`src/types/`** — `coin.ts` defines the two enums everything keys off: `COIN` (all coins incl. `VUSD`) and `COLLATERAL_COIN` (subset usable as collateral). `structs.ts` holds the parsed-shape types; `response.ts` the raw on-chain field shapes.
- **`src/utils/`** — `getObjectFields`/`getMoveObject` safely extract Move object fields from RPC responses; `parseVaultObject` converts a raw vault response into a typed `VaultInfo`.

### How VirtueClient works

The client holds **one mutable `this.transaction`** (`Transaction`) that builder methods accumulate move-calls into. Key conventions:

- `resetTransaction()` swaps in a fresh `Transaction`. Most `buildXxxTransaction` methods call it at the start unless `keepTransaction: true` is passed — this flag is how multiple build steps are composed into one tx (e.g. `buildClaimTotalRewards` chains borrow + pool reward claims).
- `sender` defaults to `DUMMY_ADDRESS` (`0x0`) when no address is given. Read methods that need a real address throw if it's still `0x0`.
- **Reads** use `devInspectTransactionBlock` / `dryRunTransactionBlock` and parse `returnValues`/`events` with `bcs` structs (see `CDP_POSITION_DATA`, `POOL_POSITION_DATA` at the top of `client.ts`). `getCollateralPrices` works by dry-running `aggregatePrices` and reading emitted price events.
- **Prices** come from one or more oracle *rules* feeding a shared collector, which `aggregater::aggregate` reduces to a single `PriceResult`. **No rule may throw out of the SDK**: each one degrades to contributing nothing, so an outage at one source cannot take down a price read — or the position build depending on it — that the others could have served. Whether a usable price results is then decided on chain. Rules differ in how they fail, so check before assuming: Pyth **aborts** on a stale price, Switchboard **abstains**. A symbol that no rule can price is omitted from the transaction entirely — `aggregate` needs at least one source to meet its threshold — which is why `aggregatePrices` returns a `Partial<Record<...>>`. Preserve all of this when adding a source; `test/oracle-resilience.test.ts` pins it against dry-run `PriceAggregated` events, since a PTB that looks right can still abort. `aggregatePrices()` runs the rules for the "basic" symbols (`IOTA`, `iBTC`), then derives `stIOTA` and `vIOTA` prices from the `IOTA` price via cert/vcert rules. Adding a new collateral type means extending this method, not just `VAULT_MAP`.
  - **Pyth** (`@pythnetwork/pyth-iota-js`) is push-based: feed the update data, then call `pyth_rule::feed`. `updatePythPriceFeeds()` devInspects the update on its own before applying it — a Pyth update carries a Wormhole VAA, and `vaa::parse_and_verify` aborts (taking the whole PTB with it) whenever the guardian set registered on IOTA trails Hermes. If the update can't be applied, the rule is **dropped for that symbol**. It cannot be pointed at the un-updated `PriceInfoObject` instead: `pyth_rule::feed` does not abstain on a stale price, it aborts through `pyth::check_price_is_fresh` (abort code 3), which kills the PTB exactly the way a failed update does.
  - **Switchboard** is on-demand — `Aggregator.current_result` only moves when someone submits a signed response — so `crankSwitchboard()` fetches signed responses from crossbar and submits them *in the same PTB* before `switchboard_rule::feed` reads it. Most oracles on the IOTA queues fail `validate` (their signature no longer recovers to their on-chain `secp256k1_key`), and a PTB is all-or-nothing, so each response is devInspected alone first and only survivors are added. If none survive, the rule abstains rather than quoting a stale price.

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
- `SWITCHBOARD_PACKAGE_ID`, `SWITCHBOARD_RULE_PACKAGE_ID`, `SWITCHBOARD_RULE_CONFIG_OBJ`, and `SWITCHBOARD_AGGREGATORS` gate the Switchboard crank and its `feed` call in `aggregatePrices` — there is no Switchboard deployment on testnet. `SWITCHBOARD_AGGREGATORS` is per-symbol, so a collateral with no aggregator registered simply gets Pyth alone.
