import {
  COLLATERAL_COIN,
  PositionInfo,
  PositionResponse,
  StabilityPoolInfo,
  StabilityPoolResponse,
  VaultInfo,
  VaultResponse,
} from "@/types";
import { formatBigInt, getCoinSymbol, getCoinType } from "./format";
import { COIN_DECIMALS } from "@/constants";

// Convert response into vault object
export const parseVaultObject = (
  coinSymbol: COLLATERAL_COIN,
  fields: VaultResponse,
): VaultInfo => {
  const vault = {
    token: coinSymbol,
    bottleTableSize: fields.position_table.fields.table.fields.size,
    bottleTableId: fields.position_table.fields.table.fields.id.id,
    collateralDecimal: Number(fields.decimal),
    collateralVault: fields.balance,
    latestRedemptionTime: Number(fields.position_table.fields.timestamp),
    mintedAmount: fields.limited_supply.fields.supply,
    maxMintAmount: fields.limited_supply.fields.limit,
    baseFeeRate: formatBigInt(
      fields.position_table.fields.fee_rate.fields.value ?? 3_000_000,
    ),
    interestRate: formatBigInt(
      fields.position_table.fields.interest_rate.fields.value,
    ),
    minCollateralRatio: formatBigInt(
      fields.liquidation_config.fields.mcr.fields.value,
    ),
    recoveryModeThreshold: formatBigInt(
      fields.liquidation_config.fields.ccr.fields.value,
    ),
    minBottleSize: fields.min_debt_amount,
  };

  return vault;
};

// Convert response into position object
export const parsePositionObject = (
  resp: PositionResponse,
): PositionInfo | undefined => {
  const collateral = getCoinSymbol(getCoinType(resp.type) ?? "");
  if (!collateral) {
    return;
  }

  return {
    collateral: collateral as COLLATERAL_COIN,
    collAmount: resp.fields.coll_amount,
    debtAmount: (
      BigInt(resp.fields.debt_amount) + BigInt(resp.fields.interest_buffer)
    ).toString(),
  };
};

export const parseStabilityPoolObject = (
  fields: StabilityPoolResponse,
): StabilityPoolInfo => {
  return {
    vusdBalance: formatBigInt(fields.balance, COIN_DECIMALS.VUSD),
  };
};
