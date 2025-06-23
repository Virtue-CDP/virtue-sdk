import {
  COLLATERAL_COIN,
  // PositionInfo,
  // PositionResponse,
  // StabilityPoolInfo,
  // StabilityPoolResponse,
  VaultInfo,
  VaultResponse,
} from "@/types";
import { formatBigInt } from "./format";

// Convert response into vault object
export const parseVaultObject = (
  coinSymbol: COLLATERAL_COIN,
  fields: VaultResponse,
): VaultInfo => {
  return {
    token: coinSymbol,
    positionTableSize: fields.position_table.fields.size,
    collateralDecimal: Number(fields.decimal),
    collateralBalance: fields.balance,
    supply: fields.limited_supply.fields.supply,
    maxSupply: fields.limited_supply.fields.limit,
    interestRate: formatBigInt(fields.interest_rate.fields.value, 18),
    minCollateralRatio: formatBigInt(fields.min_collateral_ratio.fields.value),
  };
};

// Convert response into position object
// export const parsePositionObject = (
//   resp: PositionResponse,
// ): PositionInfo | undefined => {
//   const collateral = getCoinSymbol(getCoinType(resp.type) ?? "");
//   if (!collateral) {
//     return;
//   }

//   return {
//     collateral: collateral as COLLATERAL_COIN,
//     collAmount: resp.fields.coll_amount,
//     debtAmount: (
//       BigInt(resp.fields.debt_amount) + BigInt(resp.fields.interest_buffer)
//     ).toString(),
//   };
// };

// export const parseStabilityPoolObject = (
//   fields: StabilityPoolResponse,
// ): StabilityPoolInfo => {
//   return {
//     vusdBalance: formatBigInt(fields.balance, COIN_DECIMALS.VUSD),
//   };
// };
