import { normalizeIotaAddress } from "@iota/iota-sdk/utils";

import { COIN_DECIMALS } from "@/constants";
import { PsmPoolInfo } from "@/types";

/** `virtue_framework::float` scale: a Float's `value` is the number times 1e9. */
const WAD = 10n ** 9n;

export type PsmSwapDirection = "in" | "out";

/**
 * Why the chain would refuse a swap: a swap in that mints past the PSM's VUSD
 * supply limit, or a swap out larger than the pool's coin balance, the VUSD
 * minted through this pool, or the VUSD the PSM module has outstanding across
 * all its pools (the treasury's burn or the pool's `EPoolNotEnough` aborts).
 */
export type PsmQuoteError = "SUPPLY_LIMIT" | "POOL_NOT_ENOUGH";

export type PsmQuote = {
  direction: PsmSwapDirection;
  /** Raw units of what is paid: the pool's coin for "in", VUSD for "out". */
  amountIn: bigint;
  /** Raw units of what is received, after the fee. */
  amountOut: bigint;
  /** Raw units of the fee, in the received coin. */
  fee: bigint;
  error?: PsmQuoteError;
};

/** A fee rate fraction as the Float `value` the pool stores. */
const feeRateValue = (rate: number): bigint => BigInt(Math.round(rate * 1e9));

/** `Float::mul_u64(...).ceil()`. */
const ceilMul = (rateValue: bigint, amount: bigint): bigint =>
  (rateValue * amount + WAD - 1n) / WAD;

/** `pool::new` aborts above this (`EInvalidDecimal`), so no pool exceeds it. */
const MAX_POOL_DECIMAL = 9;

/**
 * `pool::conversion_rate`, as a Float `value`: VUSD units per pool-coin unit.
 * The same truncating Float division as on chain, which is exact for every
 * decimal a pool may have.
 */
const conversionValue = (poolDecimal: number): bigint => {
  if (
    !Number.isInteger(poolDecimal) ||
    poolDecimal < 0 ||
    poolDecimal > MAX_POOL_DECIMAL
  ) {
    throw new Error(`Unsupported PSM pool decimal: ${poolDecimal}`);
  }
  const vusdDecimal = COIN_DECIMALS.VUSD;
  return vusdDecimal >= poolDecimal
    ? 10n ** BigInt(vusdDecimal - poolDecimal) * WAD
    : WAD / 10n ** BigInt(poolDecimal - vusdDecimal);
};

/** The fee rates a swap pays: the partner's if it has its own, else the default. */
const feeRatesFor = (pool: PsmPoolInfo, partner?: string) =>
  (partner && pool.partnerFeeRates[normalizeIotaAddress(partner)]) || pool;

/**
 * The exact result of `pool::swap_in` / `pool::swap_out` for `amountIn` raw
 * units, with the chain's rounding: the converted amount is floored and the
 * fee, taken from the output, is rounded up.
 * @param partner (optional) the address of the partner `AccountRequest` the
 * swap carries (see `buildPsmSwapTransaction`'s `accountObj`). Without it the
 * quote uses the default fee rates, as the chain does for a swap with none.
 */
export const quotePsmSwap = (
  pool: PsmPoolInfo,
  direction: PsmSwapDirection,
  amountIn: bigint,
  partner?: string,
): PsmQuote => {
  const conversion = conversionValue(pool.decimal);
  const rates = feeRatesFor(pool, partner);
  if (direction === "in") {
    const minted = (amountIn * conversion) / WAD;
    const fee = ceilMul(feeRateValue(rates.swapInFeeRate), minted);
    const error =
      minted > BigInt(pool.mintableVusd) ? "SUPPLY_LIMIT" : undefined;
    return { direction, amountIn, amountOut: minted - fee, fee, error };
  }
  const assetOut = (amountIn * WAD) / conversion;
  const fee = ceilMul(feeRateValue(rates.swapOutFeeRate), assetOut);
  // The burn runs first against the module's supply (shared by every pool),
  // then the pool checks its own balance and VUSD supply.
  const error =
    amountIn > BigInt(pool.moduleVusdSupply) ||
    assetOut > BigInt(pool.balance) ||
    amountIn > BigInt(pool.vusdSupply)
      ? "POOL_NOT_ENOUGH"
      : undefined;
  return { direction, amountIn, amountOut: assetOut - fee, fee, error };
};

/**
 * The smallest input whose swap pays out at least `amountOut` raw units, for
 * a form where the user types what they want to receive. Rounding makes the
 * output a step function of the input, so this searches rather than inverts.
 */
export const quotePsmSwapExactOut = (
  pool: PsmPoolInfo,
  direction: PsmSwapDirection,
  amountOut: bigint,
  partner?: string,
): PsmQuote => {
  const quote = (amountIn: bigint) =>
    quotePsmSwap(pool, direction, amountIn, partner);
  if (amountOut <= 0n) return quote(0n);
  const conversion = conversionValue(pool.decimal);
  const feeFree =
    direction === "in"
      ? (amountOut * WAD) / conversion
      : (amountOut * conversion) / WAD;
  // Grow an upper bound from the fee-free input; a 100% fee never gets there.
  let hi = feeFree + 1n;
  for (let i = 0; quote(hi).amountOut < amountOut; i++) {
    if (i >= 64) return { ...quote(hi), amountOut: 0n };
    hi *= 2n;
  }
  let lo = 0n;
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    if (quote(mid).amountOut >= amountOut) hi = mid;
    else lo = mid + 1n;
  }
  return quote(lo);
};
