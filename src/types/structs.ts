import { COLLATERAL_COIN } from "./coin";

export type VaultInfo = {
  token: COLLATERAL_COIN;
  interestRate: number;
  positionTableSize: string;
  collateralDecimal: number;
  collateralBalance: string;
  minCollateralRatio: number;
  supply: string;
  maxSupply: string;
};

export type PositionInfo = {
  collateral: COLLATERAL_COIN;
  collAmount: string;
  debtAmount: string;
};

export type StabilityPoolBalances = {
  vusdBalance: string;
  collBalances: Partial<Record<COLLATERAL_COIN, string>>;
};

export type VaultInfoList = Partial<Record<COLLATERAL_COIN, VaultInfo>>;

export type StabilityPoolInfo = {
  vusdBalance: number;
};
