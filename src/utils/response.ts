import {
  COLLATERAL_COIN,
  PositionInfo,
  PositionResponse,
  VaultInfo,
  VaultResponse,
} from "@/types";
import { formatBigInt, getCoinSymbol, getCoinType } from "./format";

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
    debtAmount: resp.fields.debt_amount,
  };
};
