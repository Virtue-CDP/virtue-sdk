import { COLLATERAL_COIN } from "@/types";
import { SharedObjectRef } from "@iota/iota-sdk/dist/cjs/bcs/types";

/// Original Package IDs

export const ORIGINAL_FRAMEWORK_PACKAGE_ID =
  "0x6f8dd0377fe5469cd3456350ca13ae1799655fda06e90191b73ab1c0c0165e8f";
export const ORIGINAL_VUSD_PACKAGE_ID =
  "0x929065320c756b8a4a841deeed013bd748ee45a28629c4aaafc56d8948ebb081";
export const ORIGINAL_ORACLE_PACKAGE_ID =
  "0xbc672e6330ab22078715f86e952ef1353d9f9b217c4579e47ce29eaec6f92655";
export const ORIGINAL_CDP_PACKAGE_ID =
  "0x0731a9f5cbdb0a4aea3f540280a1a266502017867734240e29edc813074e7f60";

/// Latest Package IDs

export const FRAMEWORK_PACKAGE_ID =
  "0x6f8dd0377fe5469cd3456350ca13ae1799655fda06e90191b73ab1c0c0165e8f";
export const VUSD_PACKAGE_ID =
  "0x929065320c756b8a4a841deeed013bd748ee45a28629c4aaafc56d8948ebb081";
export const ORACLE_PACKAGE_ID =
  "0xbc672e6330ab22078715f86e952ef1353d9f9b217c4579e47ce29eaec6f92655";
export const CDP_PACKAGE_ID =
  "0x0731a9f5cbdb0a4aea3f540280a1a266502017867734240e29edc813074e7f60";

/// Shared Objects

export const CLOCK_OBJ = {
  objectId:
    "0x0000000000000000000000000000000000000000000000000000000000000006",
  mutable: false,
  initialSharedVersion: 1,
};

export const TREASURY_OBJ = {
  objectId:
    "0x4e2e41f0158bce26c8e8ccc62be3ab5326d8b294a2bcccfbe0e7298885f66eb7",
  mutable: true,
  initialSharedVersion: 190869396,
};

export const CDP_VERSION_OBJ = {
  objectId:
    "0xb67e79921b2b71e77e5bd1adf28c9d47a8ad5bd22e024bbd90797514c39b068d",
  mutable: false,
  initialSharedVersion: 190869403,
};

export type VaultObjectInfo = {
  // symbol: COIN;
  priceAggregater: SharedObjectRef;
  vault: SharedObjectRef;
};

export const VAULT_MAP: Record<COLLATERAL_COIN, VaultObjectInfo> = {
  IOTA: {
    priceAggregater: {
      objectId:
        "0x9f3c9d72993efd5e2e543ad69bdc0bbe1bd9873c3a61fdf32c0cf48660a5f2c8",
      mutable: false,
      initialSharedVersion: 190869399,
    },
    vault: {
      objectId:
        "0xbbf7b7667aca64405e8756f6974f41bd648bd1bc40dfc2b1cfe2d6ec419eedb1",
      mutable: true,
      initialSharedVersion: 237544284,
    },
  },
};

// only on testnet
export const TESTNET_PRICE_PACKAGE_ID =
  "0x2de2d918f5940978dc53aae2ea0687a4ca8a6736bd525f15ee17e9529048fa92";
export const TESTNET_PRICE_FEED_OBJ = {
  objectId:
    "0x05cc35b8d331a3893f80b9ca6c70c3b75298e9cbf1b5d707b6d18c40b0b3da5d",
  mutable: true,
  initialSharedVersion: 190869400,
};
