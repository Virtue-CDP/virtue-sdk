import {
  COIN,
  COLLATERAL_COIN,
  DEPOSIT_POINT_BONUS_COIN,
  Rewarder,
  SharedObjectRef,
  VaultObjectInfo,
} from "@/types";

export type ConfigType = {
  COIN_TYPES: Record<COIN, string>;
  ORIGINAL_FRAMEWORK_PACKAGE_ID: string;
  ORIGINAL_VUSD_PACKAGE_ID: string;
  ORIGINAL_ORACLE_PACKAGE_ID: string;
  ORIGINAL_CDP_PACKAGE_ID: string;
  ORIGINAL_STABILITY_POOL_PACKAGE_ID: string;
  ORIGINAL_INCENTIVE_PACKAGE_ID?: string;
  ORIGINAL_POINT_PACKAGE_ID?: string;

  FRAMEWORK_PACKAGE_ID: string;
  VUSD_PACKAGE_ID: string;
  ORACLE_PACKAGE_ID: string;
  CDP_PACKAGE_ID: string;
  STABILITY_POOL_PACKAGE_ID: string;
  INCENTIVE_PACKAGE_ID?: string;
  POINT_PACKAGE_ID?: string;

  CLOCK_OBJ: SharedObjectRef;
  TREASURY_OBJ: SharedObjectRef;
  STABILITY_POOL_OBJ: SharedObjectRef;
  INCENTIVE_GLOBAL_CONFIG_OBJ: SharedObjectRef;
  VAULT_REWARDER_REGISTRY_OBJ: SharedObjectRef;
  POOL_REWARDER_REGISTRY_OBJ: SharedObjectRef;

  PYTH_STATE_ID: string;
  WORMHOLE_STATE_ID: string;
  PYTH_RULE_PACKAGE_ID: string;
  PYTH_RULE_CONFIG_OBJ: SharedObjectRef;

  CERT_RULE_PACKAGE_ID: string;
  CERT_NATIVE_POOL_OBJ: SharedObjectRef;
  CERT_METADATA_OBJ: SharedObjectRef;

  POINT_PACKAGE_ADMIN_CAP_OBJECT_ID: string;
  POINT_GLOBAL_CONFIG_SHARED_OBJECT_REF: SharedObjectRef;
  POINT_HANDLER_MAP: Record<DEPOSIT_POINT_BONUS_COIN, SharedObjectRef>;

  STABILITY_POOL_TABLE_ID: string;
  STABILITY_POOL_REWARDERS: Rewarder[];

  VAULT_MAP: Record<COLLATERAL_COIN, VaultObjectInfo>;
};

export const CONFIG: Record<"mainnet" | "testnet", ConfigType> = {
  mainnet: {
    COIN_TYPES: {
      VUSD: "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f::vusd::VUSD",
      IOTA: "0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA",
      stIOTA:
        "0x346778989a9f57480ec3fee15f2cd68409c73a62112d40a3efd13987997be68c::cert::CERT",
      iBTC: "0x387c459c5c947aac7404e53ba69541c5d64f3cf96f3bc515e7f8a067fb725b54::ibtc::IBTC",
    },
    ORIGINAL_FRAMEWORK_PACKAGE_ID:
      "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b",
    ORIGINAL_VUSD_PACKAGE_ID:
      "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f",
    ORIGINAL_ORACLE_PACKAGE_ID:
      "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf",
    ORIGINAL_CDP_PACKAGE_ID:
      "0xcdeeb40cd7ffd7c3b741f40a8e11cb784a5c9b588ce993d4ab86479072386ba1",
    ORIGINAL_STABILITY_POOL_PACKAGE_ID:
      "0xc7ab9b9353e23c6a3a15181eb51bf7145ddeff1a5642280394cd4d6a0d37d83b",
    ORIGINAL_INCENTIVE_PACKAGE_ID:
      "0xe66a8a84964f758fd1b2154d68247277a14983c90a810c8fd9e6263116f15019",
    ORIGINAL_POINT_PACKAGE_ID:
      "0x745a1c670fd04d9e71b43a3593a855c79af5e6aa6979d1029f35ec9baa344c1e",

    FRAMEWORK_PACKAGE_ID:
      "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b",
    VUSD_PACKAGE_ID:
      "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f",
    ORACLE_PACKAGE_ID:
      "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf",
    CDP_PACKAGE_ID:
      "0x34fa327ee4bb581d81d85a8c40b6a6b4260630a0ef663acfe6de0e8ca471dd22",
    STABILITY_POOL_PACKAGE_ID:
      "0xb80b111f3dfb35ea26bd288e187af349c4e5b74a5fda143066f5ff9de84f34bf",
    INCENTIVE_PACKAGE_ID:
      "0xfd50d23504c5a3ad290357f9cbce4a0a3645ab25fc3a11e939126d331267fe29",
    POINT_PACKAGE_ID:
      "0x745a1c670fd04d9e71b43a3593a855c79af5e6aa6979d1029f35ec9baa344c1e",

    CLOCK_OBJ: {
      objectId:
        "0x0000000000000000000000000000000000000000000000000000000000000006",
      initialSharedVersion: 1,
      mutable: false,
    },
    TREASURY_OBJ: {
      objectId:
        "0x81f525f4fa5b2d3cf58677d3e39aabc4b0a1ca25cbba605033cfe417e47b0a16",
      initialSharedVersion: 22329876,
      mutable: true,
    },
    STABILITY_POOL_OBJ: {
      objectId:
        "0x6101272394511caf38ce5a6d120d3b4d009b6efabae8faac43aa9ac938cec558",
      initialSharedVersion: 22329903,
      mutable: true,
    },
    INCENTIVE_GLOBAL_CONFIG_OBJ: {
      objectId:
        "0xc30c82b96429c2c215dbc994e73250c8b29e747c9540a547c7bc95e6d7e098d8",
      initialSharedVersion: 120165683,
      mutable: false,
    },
    VAULT_REWARDER_REGISTRY_OBJ: {
      objectId:
        "0x3b5a6649ce2c4348ae7d2dc72bc8e42cecfc6c24b9edb701635f9c49c765ff69",
      initialSharedVersion: 120165683,
      mutable: false,
    },
    POOL_REWARDER_REGISTRY_OBJ: {
      objectId:
        "0xc043719e2da72c1182466bbccf01b966d500337749cd6a06e042714444d2852c",
      initialSharedVersion: 120165683,
      mutable: false,
    },
    PYTH_STATE_ID:
      "0x6bc33855c7675e006f55609f61eebb1c8a104d8973a698ee9efd3127c210b37f",
    WORMHOLE_STATE_ID:
      "0xd43b448afc9dd01deb18273ec39d8f27ddd4dd46b0922383874331771b70df73",
    PYTH_RULE_PACKAGE_ID:
      "0xed5a8dac2ca41ae9bdc1c7f778b0949d3e26c18c51ed284c4cfa4030d0bb64c2",
    PYTH_RULE_CONFIG_OBJ: {
      objectId:
        "0xbcc4f6e3ca3d4a83eac39282ab7d1cb086924c58bef825d69c33b00fea1105b8",
      initialSharedVersion: 22329882,
      mutable: false,
    },
    CERT_RULE_PACKAGE_ID:
      "0x01edb9afe0663b8762d2e0a18923df8bee98d28f3a60ac56ff67a27bbf53a7ac",
    CERT_NATIVE_POOL_OBJ: {
      objectId:
        "0x02d641d7b021b1cd7a2c361ac35b415ae8263be0641f9475ec32af4b9d8a8056",
      initialSharedVersion: 19,
      mutable: false,
    },
    CERT_METADATA_OBJ: {
      objectId:
        "0x8c25ec843c12fbfddc7e25d66869f8639e20021758cac1a3db0f6de3c9fda2ed",
      initialSharedVersion: 19,
      mutable: false,
    },
    POINT_PACKAGE_ADMIN_CAP_OBJECT_ID:
      "0x2bc471bd479eac37891f3ad6641142960478d6f1724a038e2fe56f7fd28e0091",
    POINT_GLOBAL_CONFIG_SHARED_OBJECT_REF: {
      objectId:
        "0x86f95e88bcc50edbd930153079db969e92f050c887d7d4b4642a08cbb04d8787",
      initialSharedVersion: 126182186,
      mutable: false,
    },
    POINT_HANDLER_MAP: {
      stIOTA: {
        objectId:
          "0xcd096080bca84ea1c60dfe2b8efcad1eceb41acbe69de1c71f867dd2d3b51dd1",
        initialSharedVersion: 126182187,
        mutable: false,
      },
    },
    STABILITY_POOL_TABLE_ID:
      "0x6dd808c50bab98757f7523562bdef7d33d506bb447ea9e708072bf13a5e29f02",
    STABILITY_POOL_REWARDERS: [
      {
        objectId:
          "0xb295972b5c978ebb96339b81a762cbc047be78747c2f7d19e661281560394c2b",
        mutable: true,
        initialSharedVersion: 121322519,
        rewardSymbol: "stIOTA",
      },
    ],

    VAULT_MAP: {
      IOTA: {
        priceAggregater: {
          objectId:
            "0x052c40b4e8f16df5238457f3a7b3b0eeaa49c6bc8acc22f6a7790ab32495b2c6",
          initialSharedVersion: 22329880,
          mutable: false,
        },
        vault: {
          objectId:
            "0xaf306be8419cf059642acdba3b4e79a5ae893101ae62c8331cefede779ef48d5",
          initialSharedVersion: 22329895,
          mutable: true,
        },
        pythPriceId:
          "0xc7b72e5d860034288c9335d4d325da4272fe50c92ab72249d58f6cbba30e4c44",
      },
      stIOTA: {
        priceAggregater: {
          objectId:
            "0x8c730f64aa369eed69ddf7eea39c78bf0afd3f9fbb4ee0dfe457f6dea5a0f4ed",
          initialSharedVersion: 22329881,
          mutable: false,
        },
        vault: {
          objectId:
            "0xc9cb494657425f350af0948b8509efdd621626922e9337fd65eb161ec33de259",
          initialSharedVersion: 22329896,
          mutable: true,
        },
        rewarders: [
          {
            objectId:
              "0xf9ac7f70f1e364cd31734f5a3ebf5c580d3da11c06ca6d7832e82cc417e022eb",
            initialSharedVersion: 121322517,
            mutable: true,
            rewardSymbol: "stIOTA",
          },
        ],
      },
      iBTC: {
        priceAggregater: {
          objectId:
            "0x8a00ca5bae51c5d001e92e5b2188b7ec20a1c530aeac327b3ab86049bf9540ed",
          initialSharedVersion: 172291113,
          mutable: false,
        },
        vault: {
          objectId:
            "0xcc094d9e3b491b0c943bb18daf07a49bd951f34688f9610d90982de06fc0c5c9",
          initialSharedVersion: 172291112,
          mutable: true,
        },
        pythPriceId:
          "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
      },
    },
  },
  testnet: {
    COIN_TYPES: {
      VUSD: "0x3fbd238eea1f4ce7d797148954518fce853f24a8be01b47388bfa2262602fefa::vusd::VUSD",
      IOTA: "0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA",
      stIOTA:
        "0x14f9e69c0076955d5a056260c9667edab184650dba9919f168a37030dd956dc6::cert::CERT",
      iBTC: "",
    },
    ORIGINAL_FRAMEWORK_PACKAGE_ID:
      "0x5e1fb08bd2360286cd13dd174f6d17aa8871b08906aa8001079199ad62ad81b1",
    ORIGINAL_VUSD_PACKAGE_ID:
      "0x3fbd238eea1f4ce7d797148954518fce853f24a8be01b47388bfa2262602fefa",
    ORIGINAL_ORACLE_PACKAGE_ID:
      "0x2cac3390862418a4db51e868d1edc9b08688121434042209e70c6f88ace13de2",
    ORIGINAL_CDP_PACKAGE_ID:
      "0x718a06666424bd031790eb421a2ac1e0b4e0c3ff7a84e455124d65109b1a6a74",
    ORIGINAL_STABILITY_POOL_PACKAGE_ID:
      "0x8a1cdc065cbd8f59e182dd72d4cb653adcec29e29b8204e8c3f0289cf8eb5a8f",

    FRAMEWORK_PACKAGE_ID:
      "0x5e1fb08bd2360286cd13dd174f6d17aa8871b08906aa8001079199ad62ad81b1",
    VUSD_PACKAGE_ID:
      "0x3fbd238eea1f4ce7d797148954518fce853f24a8be01b47388bfa2262602fefa",
    ORACLE_PACKAGE_ID:
      "0x2cac3390862418a4db51e868d1edc9b08688121434042209e70c6f88ace13de2",
    CDP_PACKAGE_ID:
      "0x718a06666424bd031790eb421a2ac1e0b4e0c3ff7a84e455124d65109b1a6a74",
    STABILITY_POOL_PACKAGE_ID:
      "0x8a1cdc065cbd8f59e182dd72d4cb653adcec29e29b8204e8c3f0289cf8eb5a8f",

    CLOCK_OBJ: {
      objectId:
        "0x0000000000000000000000000000000000000000000000000000000000000006",
      initialSharedVersion: 1,
      mutable: false,
    },
    TREASURY_OBJ: {
      objectId:
        "0x47ad134052f120a1153e1f83346d6972ceb5088c1e09b936c816f0f5a26f887b",
      initialSharedVersion: 265495161,
      mutable: true,
    },
    STABILITY_POOL_OBJ: {
      objectId:
        "0xcdc4dca9a7a481d5f9f586177ca75d34a62d9c9371c97a3f4fb330a13d8995b4",
      initialSharedVersion: 265495176,
      mutable: true,
    },
    INCENTIVE_GLOBAL_CONFIG_OBJ: {
      objectId: "",
      initialSharedVersion: 0,
      mutable: false,
    },
    VAULT_REWARDER_REGISTRY_OBJ: {
      objectId: "",
      initialSharedVersion: 0,
      mutable: false,
    },
    POOL_REWARDER_REGISTRY_OBJ: {
      objectId: "",
      initialSharedVersion: 0,
      mutable: false,
    },

    PYTH_STATE_ID:
      "0x68dda579251917b3db28e35c4df495c6e664ccc085ede867a9b773c8ebedc2c1",
    WORMHOLE_STATE_ID:
      "0x8bc490f69520a97ca1b3de864c96aa2265a0cf5d90f5f3f016b2eddf0cf2af2b",
    PYTH_RULE_PACKAGE_ID:
      "0xa4cbdbf0f287b616284aafb75bbc6192fcb8362a4c3cc57a4df41a865e6ca338",
    PYTH_RULE_CONFIG_OBJ: {
      objectId:
        "0x1258041fbe82bd343456101402a51ce3146157297f2f5273621a1d32c9098c36",
      initialSharedVersion: 265495170,
      mutable: false,
    },
    CERT_RULE_PACKAGE_ID:
      "0x5bf6e3d810d19ceb4fa03d750e8e2785357cfddb58089cd78acf9a309b9b72ec",
    CERT_NATIVE_POOL_OBJ: {
      objectId:
        "0xe9d03191a150269de0740c9194f0de45a560432dbc972bcb2460813ce843dcaa",
      initialSharedVersion: 241105314,
      mutable: false,
    },
    CERT_METADATA_OBJ: {
      objectId:
        "0xf77ffe15ad2dfd2f24553f8e94b0e7dc85450326e60e62546adb80998f56de46",
      initialSharedVersion: 241105314,
      mutable: false,
    },
    POINT_PACKAGE_ADMIN_CAP_OBJECT_ID: "",
    POINT_GLOBAL_CONFIG_SHARED_OBJECT_REF: {
      objectId: "",
      initialSharedVersion: 0,
      mutable: false,
    },
    POINT_HANDLER_MAP: {
      stIOTA: {
        objectId: "",
        initialSharedVersion: 0,
        mutable: false,
      },
    },
    STABILITY_POOL_TABLE_ID:
      "0xde5e356ae1dbe072f5fec0c006c29ff99c04647233e2e8bb6a295f3418a5c386",
    STABILITY_POOL_REWARDERS: [],
    VAULT_MAP: {
      IOTA: {
        priceAggregater: {
          objectId:
            "0xcbad09b5520711d5d56032e079daabaf672b794508af338b1d02b746864d9d0f",
          initialSharedVersion: 265495168,
          mutable: false,
        },
        vault: {
          objectId:
            "0xa499e1273f818acb344c688843edee6a1fec2527c83e557a05fa686111815e24",
          initialSharedVersion: 265495180,
          mutable: true,
        },
        pythPriceId:
          "0xc7b72e5d860034288c9335d4d325da4272fe50c92ab72249d58f6cbba30e4c44",
      },
      stIOTA: {
        priceAggregater: {
          objectId:
            "0x049ead4145f6152fbdea6f26bfddccb89ef25b2f5920ef6d667bce0eb7b7bdd5",
          initialSharedVersion: 265495169,
          mutable: false,
        },
        vault: {
          objectId:
            "0x729bf70da0e17a8c1caefbf6c1f9f09c04c6075f22250500b8fc7efe97cd7afb",
          initialSharedVersion: 265495181,
          mutable: true,
        },
        rewarders: [],
      },
      iBTC: {
        priceAggregater: {
          objectId:
            "0x8a00ca5bae51c5d001e92e5b2188b7ec20a1c530aeac327b3ab86049bf9540ed",
          initialSharedVersion: 172291113,
          mutable: false,
        },
        vault: {
          objectId:
            "0xcc094d9e3b491b0c943bb18daf07a49bd951f34688f9610d90982de06fc0c5c9",
          initialSharedVersion: 172291112,
          mutable: true,
        },
        pythPriceId:
          "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
      },
    },
  },
};
