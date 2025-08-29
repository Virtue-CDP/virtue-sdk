export type COIN = "VUSD" | "IOTA" | "stIOTA" | "iBTC";
export type COLLATERAL_COIN = "IOTA" | "stIOTA" | "iBTC";

export type DEPOSIT_POINT_BONUS_COIN = Extract<COIN, "stIOTA">;

export function isDepositPointBonusCoin(
  coin: COIN,
): coin is DEPOSIT_POINT_BONUS_COIN {
  return coin === "stIOTA";
}
