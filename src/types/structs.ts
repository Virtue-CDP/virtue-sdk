import { COIN } from "./coin";

export type BucketInfo = {
  token: COIN;
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

export type BucketList = Partial<Record<COIN, BucketInfo>>;
