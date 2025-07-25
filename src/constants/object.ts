import { COIN, COLLATERAL_COIN } from "@/types";

/// Original Package IDs

export const ORIGINAL_FRAMEWORK_PACKAGE_ID =
  "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b";
export const ORIGINAL_VUSD_PACKAGE_ID =
  "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f";
export const ORIGINAL_ORACLE_PACKAGE_ID =
  "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf";
export const ORIGINAL_CDP_PACKAGE_ID =
  "0xcdeeb40cd7ffd7c3b741f40a8e11cb784a5c9b588ce993d4ab86479072386ba1";
export const ORIGINAL_STABILITY_POOL_PACKAGE_ID =
  "0xc7ab9b9353e23c6a3a15181eb51bf7145ddeff1a5642280394cd4d6a0d37d83b";
export const ORIGINAL_INCENTIVE_PACKAGE_ID =
  "0xe66a8a84964f758fd1b2154d68247277a14983c90a810c8fd9e6263116f15019";

/// Latest Package IDs

export const FRAMEWORK_PACKAGE_ID =
  "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b";
export const VUSD_PACKAGE_ID =
  "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f";
export const ORACLE_PACKAGE_ID =
  "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf";
export const CDP_PACKAGE_ID =
  "0x34fa327ee4bb581d81d85a8c40b6a6b4260630a0ef663acfe6de0e8ca471dd22";
export const STABILITY_POOL_PACKAGE_ID =
  "0xc7ab9b9353e23c6a3a15181eb51bf7145ddeff1a5642280394cd4d6a0d37d83b";
export const INCENTIVE_PACKAGE_ID =
  "0x12d5c2472d63a22f32ed632c13682afd29f81e67e271a73253392e2a5bf0dc90";

/// Shared Objects

export const CLOCK_OBJ: SharedObjectRef = {
  objectId:
    "0x0000000000000000000000000000000000000000000000000000000000000006",
  mutable: false,
  initialSharedVersion: 1,
};

export const TREASURY_OBJ: SharedObjectRef = {
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
    rewarders: [
      {
        objectId:
          "0xf9ac7f70f1e364cd31734f5a3ebf5c580d3da11c06ca6d7832e82cc417e022eb",
        mutable: true,
        initialSharedVersion: 121322517,
        rewardSymbol: "stIOTA",
      },
    ],
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

export const CERT_RULE_PACKAGE_ID =
  "0x01edb9afe0663b8762d2e0a18923df8bee98d28f3a60ac56ff67a27bbf53a7ac";
export const CERT_NATIVE_POOL_OBJ: SharedObjectRef = {
  objectId:
    "0x02d641d7b021b1cd7a2c361ac35b415ae8263be0641f9475ec32af4b9d8a8056",
  initialSharedVersion: 19,
  mutable: false,
};
export const CERT_METADATA_OBJ: SharedObjectRef = {
  objectId:
    "0x8c25ec843c12fbfddc7e25d66869f8639e20021758cac1a3db0f6de3c9fda2ed",
  initialSharedVersion: 19,
  mutable: false,
};

export const STABILITY_POOL_OBJ: SharedObjectRef = {
  objectId:
    "0x6101272394511caf38ce5a6d120d3b4d009b6efabae8faac43aa9ac938cec558",
  initialSharedVersion: 22329903,
  mutable: true,
};

export const STABILITY_POOL_TABLE_ID =
  "0x6dd808c50bab98757f7523562bdef7d33d506bb447ea9e708072bf13a5e29f02";

export const INCENTIVE_GLOBAL_CONFIG_OBJ: SharedObjectRef = {
  objectId:
    "0xc30c82b96429c2c215dbc994e73250c8b29e747c9540a547c7bc95e6d7e098d8",
  mutable: false,
  initialSharedVersion: 120165683,
};

export const VAULT_REWARDER_REGISTRY_OBJ: SharedObjectRef = {
  objectId:
    "0x3b5a6649ce2c4348ae7d2dc72bc8e42cecfc6c24b9edb701635f9c49c765ff69",
  mutable: false,
  initialSharedVersion: 120165683,
};

export const POOL_REWARDER_REGISTRY_OBJ: SharedObjectRef = {
  objectId:
    "0xc043719e2da72c1182466bbccf01b966d500337749cd6a06e042714444d2852c",
  mutable: false,
  initialSharedVersion: 120165683,
};

export const STABILITY_POOL_REWARDERS: Rewarder[] = [
  {
    objectId:
      "0xb295972b5c978ebb96339b81a762cbc047be78747c2f7d19e661281560394c2b",
    mutable: true,
    initialSharedVersion: 121322519,
    rewardSymbol: "stIOTA",
  },
];
