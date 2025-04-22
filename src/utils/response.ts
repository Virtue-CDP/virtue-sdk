import { COLLATERAL_COIN, PositionResponse, VaultResponse } from "@/types";


// Convert response into vault object
export const parseVaultObject = (coinSymbol: COLLATERAL_COIN, fields: VaultResponse) => {
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

  return vault
}

// Convert response into position object
export const parsePositionObject = (coinSymbol: COLLATERAL_COIN, fields: PositionResponse) => {
  const position = {
    token: coinSymbol,
    collAmount: fields.coll_amount,
    debtAmount: fields.debt_amount,
  };

  return position
}