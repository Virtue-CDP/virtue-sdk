import { COLLATERAL_COIN } from "@/types";

/// Original Package IDs

export const ORIGINAL_FRAMEWORK_PACKAGE_ID =
  "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b";
export const ORIGINAL_VUSD_PACKAGE_ID =
  "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f";
export const ORIGINAL_ORACLE_PACKAGE_ID =
  "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf";
export const ORIGINAL_CDP_PACKAGE_ID =
  "0xcdeeb40cd7ffd7c3b741f40a8e11cb784a5c9b588ce993d4ab86479072386ba1";
// export const ORIGINAL_LIQUIDATION_PACKAGE_ID =
//   "0x3b79a39a58128d94bbf2021e36b31485898851909c8167ab0df10fb2824a0f83";

/// Latest Package IDs

export const FRAMEWORK_PACKAGE_ID =
  "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b";
export const VUSD_PACKAGE_ID =
  "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f";
export const ORACLE_PACKAGE_ID =
  "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf";
export const CDP_PACKAGE_ID =
  "0x34fa327ee4bb581d81d85a8c40b6a6b4260630a0ef663acfe6de0e8ca471dd22 ";
// export const LIQUIDATION_PACKAGE_ID =
//   "0x3b79a39a58128d94bbf2021e36b31485898851909c8167ab0df10fb2824a0f83";

/// Shared Objects

export const CLOCK_OBJ = {
  objectId:
    "0x0000000000000000000000000000000000000000000000000000000000000006",
  mutable: false,
  initialSharedVersion: 1,
};

export const TREASURY_OBJ = {
  objectId:
    "0x81f525f4fa5b2d3cf58677d3e39aabc4b0a1ca25cbba605033cfe417e47b0a16",
  mutable: true,
  initialSharedVersion: 22329876,
};

export type SharedObjectRef = {
  objectId: string;
  mutable: boolean;
  initialSharedVersion: number;
};

export type VaultObjectInfo = {
  // symbol: COIN;
  priceAggregater: SharedObjectRef;
  vault: SharedObjectRef;
  pythPriceId?: string;
};

export const VAULT_MAP: Record<COLLATERAL_COIN, VaultObjectInfo> = {
  IOTA: {
    priceAggregater: {
      objectId:
        "0x052c40b4e8f16df5238457f3a7b3b0eeaa49c6bc8acc22f6a7790ab32495b2c6",
      mutable: false,
      initialSharedVersion: 22329880,
    },
    vault: {
      objectId:
        "0xaf306be8419cf059642acdba3b4e79a5ae893101ae62c8331cefede779ef48d5",
      mutable: true,
      initialSharedVersion: 22329895,
    },
    pythPriceId:
      "0xc7b72e5d860034288c9335d4d325da4272fe50c92ab72249d58f6cbba30e4c44",
  },
  stIOTA: {
    priceAggregater: {
      objectId:
        "0x8c730f64aa369eed69ddf7eea39c78bf0afd3f9fbb4ee0dfe457f6dea5a0f4ed",
      mutable: false,
      initialSharedVersion: 22329881,
    },
    vault: {
      objectId:
        "0xc9cb494657425f350af0948b8509efdd621626922e9337fd65eb161ec33de259",
      mutable: true,
      initialSharedVersion: 22329896,
    },
  },
};

export const PYTH_STATE_ID =
  "0x6bc33855c7675e006f55609f61eebb1c8a104d8973a698ee9efd3127c210b37f";
export const WORMHOLE_STATE_ID =
  "0xd43b448afc9dd01deb18273ec39d8f27ddd4dd46b0922383874331771b70df73";
export const PYTH_RULE_PACKAGE_ID =
  "0xed5a8dac2ca41ae9bdc1c7f778b0949d3e26c18c51ed284c4cfa4030d0bb64c2";
export const PYTH_RULE_CONFIG_OBJ: SharedObjectRef = {
  objectId:
    "0xbcc4f6e3ca3d4a83eac39282ab7d1cb086924c58bef825d69c33b00fea1105b8",
  initialSharedVersion: 22329882,
  mutable: false,
};
// export const STABILITY_POOL_OBJ: SharedObjectRef = {
//   objectId:
//     "0x963b3d757dcd5ad14773a503eb481143b64d3686aebdf6a90443d908582188e0",
//   initialSharedVersion: 252695564,
//   mutable: true,
// };
