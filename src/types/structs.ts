import { COIN, COLLATERAL_COIN } from "./coin";

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
  vusdBalance: number;
  collBalances: Partial<Record<COLLATERAL_COIN, number>>;
};

export type VaultInfoList = Partial<Record<COLLATERAL_COIN, VaultInfo>>;

export type StabilityPoolInfo = {
  vusdBalance: number;
};

export type Rewards = Partial<Record<COIN, number>>;

export type SharedObjectRef = {
  objectId: string;
  mutable: boolean;
  initialSharedVersion: number;
};

export type RewarderInfo = {
  rewarder: SharedObjectRef;
  rewardSymbol: COIN;
};

export type VaultObjectInfo = {
  // symbol: COIN;
  priceAggregater: SharedObjectRef;
  vault: SharedObjectRef;
  pythPriceId?: string;
  rewarders?: Rewarder[];
};

export type Rewarder = SharedObjectRef & { rewardSymbol: COIN };

export type CdpPositionsResponse = {
  positions: {
    collateralType: string;
    debtor: string;
    collAmount: number;
    debtAmount: number;
  }[];
  nextCursor: string | null;
};

export type PoolPositionsResponse = {
  positions: {
    account: string;
    vusdAmount: number;
    collAmounts: Record<string, number>;
    timestamp: number;
  }[];
  nextCursor: string | null;
};
