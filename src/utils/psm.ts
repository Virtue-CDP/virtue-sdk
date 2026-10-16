import { COIN_DECIMALS } from "@/constants";
import { PsmPoolInfo } from "@/types";

/** `virtue_framework::float` scale: a Float's `value` is the number times 1e9. */
const WAD = 10n ** 9n;

export type PsmSwapDirection = "in" | "out";

/**
 * Why the chain would refuse a swap: a swap in that mints past the PSM's VUSD
 * supply limit, or a swap out larger than the pool's coin balance or the VUSD
 * minted through it (the treasury's burn or the pool's `EPoolNotEnough` aborts).
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

/** `pool::conversion_rate`, as a Float `value`: VUSD units per pool-coin unit. */
const conversionValue = (poolDecimal: number): bigint => {
  const vusdDecimal = COIN_DECIMALS.VUSD;
  return vusdDecimal >= poolDecimal
    ? 10n ** BigInt(vusdDecimal - poolDecimal) * WAD
    : WAD / 10n ** BigInt(poolDecimal - vusdDecimal);
};

/**
 * The exact result of `pool::swap_in` / `pool::swap_out` for `amountIn` raw
 * units, with the chain's rounding: the converted amount is floored and the
 * fee, taken from the output, is rounded up.
 */
export const quotePsmSwap = (
  pool: PsmPoolInfo,
  direction: PsmSwapDirection,
  amountIn: bigint,
): PsmQuote => {
  const conversion = conversionValue(pool.decimal);
  if (direction === "in") {
    const minted = (amountIn * conversion) / WAD;
    const fee = ceilMul(feeRateValue(pool.swapInFeeRate), minted);
    const error =
      minted > BigInt(pool.mintableVusd) ? "SUPPLY_LIMIT" : undefined;
    return { direction, amountIn, amountOut: minted - fee, fee, error };
  }
  const assetOut = (amountIn * WAD) / conversion;
  const fee = ceilMul(feeRateValue(pool.swapOutFeeRate), assetOut);
  const error =
    assetOut > BigInt(pool.balance) || amountIn > BigInt(pool.vusdSupply)
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
): PsmQuote => {
  if (amountOut <= 0n) return quotePsmSwap(pool, direction, 0n);
  const conversion = conversionValue(pool.decimal);
  const feeFree =
    direction === "in"
      ? (amountOut * WAD) / conversion
      : (amountOut * conversion) / WAD;
  // Grow an upper bound from the fee-free input; a 100% fee never gets there.
  let hi = feeFree + 1n;
  for (
    let i = 0;
    quotePsmSwap(pool, direction, hi).amountOut < amountOut;
    i++
  ) {
    if (i >= 64) return { ...quotePsmSwap(pool, direction, hi), amountOut: 0n };
    hi *= 2n;
  }
  let lo = 0n;
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    if (quotePsmSwap(pool, direction, mid).amountOut >= amountOut) hi = mid;
    else lo = mid + 1n;
  }
  return quotePsmSwap(pool, direction, lo);
};
