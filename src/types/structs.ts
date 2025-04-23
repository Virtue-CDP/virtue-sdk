import { COLLATERAL_COIN } from "./coin";

export type VaultInfo = {
  token: COLLATERAL_COIN;
  baseFeeRate: number;
  bottleTableSize: string;
  bottleTableId: string;
  collateralDecimal: number;
  collateralVault: string;
  latestRedemptionTime: number;
  minCollateralRatio: string;
  mintedBuckAmount: string;
  minBottleSize: string;
  maxMintAmount: string;
  recoveryModeThreshold: string;
};

export type PositionInfo = {
  collateral: COLLATERAL_COIN;
  collAmount: string;
  debtAmount: string;
};

export type VaultInfoList = Partial<Record<COLLATERAL_COIN, VaultInfo>>;
