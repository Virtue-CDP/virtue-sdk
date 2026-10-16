import { COIN, COLLATERAL_COIN, PSM_COIN } from "./coin";

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

export type PsmPoolObjectInfo = {
  coinType: string;
  decimal: number;
  pool: SharedObjectRef;
};

/**
 * A PSM pool's live state. Amounts are raw on-chain units as strings: `balance`
 * in the pool's coin, `vusdSupply` and the module limit in VUSD. Fee rates are
 * fractions (0.001 = 0.1%).
 */
export type PsmPoolInfo = {
  coin: PSM_COIN;
  coinType: string;
  decimal: number;
  /** The pool's coin it holds, so the most a swap out can pay. */
  balance: string;
  /** VUSD minted through this pool and not yet burned back. */
  vusdSupply: string;
  /** Default fee rates, paid by any swap without a partner `AccountRequest`. */
  swapInFeeRate: number;
  swapOutFeeRate: number;
  /** Fee rates for partners, keyed by their normalized `AccountRequest` address. */
  partnerFeeRates: Record<
    string,
    { swapInFeeRate: number; swapOutFeeRate: number }
  >;
  /**
   * VUSD the PSM module may still mint (`limit - supply` on the treasury),
   * shared by every PSM pool. A swap in that would mint past it aborts.
   */
  mintableVusd: string;
  /**
   * VUSD the PSM module has minted and not burned, across every PSM pool. A
   * swap out burns against it first, so it caps a swap out too.
   */
  moduleVusdSupply: string;
};

export type PsmPoolInfoList = Partial<Record<PSM_COIN, PsmPoolInfo>>;
