import {
  COLLATERAL_COIN,
  Position,
  PositionResponse,
  VaultInfo,
  VaultResponse,
} from "@/types";
import { getCoinSymbol, getCoinType } from "./format";

// Convert response into vault object
export const parseVaultObject = (
  coinSymbol: COLLATERAL_COIN,
  fields: VaultResponse,
): VaultInfo => {
  const vault = {
    token: coinSymbol,
    baseFeeRate:
      Number(fields.position_table.fields.fee_rate ?? 3_000_000) / 10 ** 9,
    bottleTableSize: fields.position_table.fields.table.fields.size,
    bottleTableId: fields.position_table.fields.table.fields.id.id,
    collateralDecimal: Number(fields.decimal),
    collateralVault: fields.balance,
    latestRedemptionTime: Number(fields.position_table.fields.timestamp),
    minCollateralRatio: fields.liquidation_config.fields.mcr.fields.value,
    mintedBuckAmount: fields.limited_supply.fields.supply,
    maxMintAmount: fields.limited_supply.fields.limit,
    recoveryModeThreshold: fields.liquidation_config.fields.ccr.fields.value,
    minBottleSize: fields.min_debt_amount,
  };

  return vault;
};

// Convert response into position object
export const parsePositionObject = (
  resp: PositionResponse,
): Position | undefined => {
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
