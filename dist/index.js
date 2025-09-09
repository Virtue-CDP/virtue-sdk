"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// src/client.ts


var _transactions = require('@iota/iota-sdk/transactions');



var _client = require('@iota/iota-sdk/client');

// src/constants/coin.ts
var COIN_DECIMALS = {
  VUSD: 6,
  IOTA: 9,
  stIOTA: 9,
  iBTC: 10
};

// src/constants/object.ts
var CONFIG = {
  mainnet: {
    COIN_TYPES: {
      VUSD: "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f::vusd::VUSD",
      IOTA: "0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA",
      stIOTA: "0x346778989a9f57480ec3fee15f2cd68409c73a62112d40a3efd13987997be68c::cert::CERT",
      iBTC: "0x387c459c5c947aac7404e53ba69541c5d64f3cf96f3bc515e7f8a067fb725b54::ibtc::IBTC"
    },
    ORIGINAL_FRAMEWORK_PACKAGE_ID: "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b",
    ORIGINAL_VUSD_PACKAGE_ID: "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f",
    ORIGINAL_ORACLE_PACKAGE_ID: "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf",
    ORIGINAL_CDP_PACKAGE_ID: "0xcdeeb40cd7ffd7c3b741f40a8e11cb784a5c9b588ce993d4ab86479072386ba1",
    ORIGINAL_STABILITY_POOL_PACKAGE_ID: "0xc7ab9b9353e23c6a3a15181eb51bf7145ddeff1a5642280394cd4d6a0d37d83b",
    ORIGINAL_INCENTIVE_PACKAGE_ID: "0xe66a8a84964f758fd1b2154d68247277a14983c90a810c8fd9e6263116f15019",
    ORIGINAL_POINT_PACKAGE_ID: "0x745a1c670fd04d9e71b43a3593a855c79af5e6aa6979d1029f35ec9baa344c1e",
    FRAMEWORK_PACKAGE_ID: "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b",
    VUSD_PACKAGE_ID: "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f",
    ORACLE_PACKAGE_ID: "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf",
    CDP_PACKAGE_ID: "0x34fa327ee4bb581d81d85a8c40b6a6b4260630a0ef663acfe6de0e8ca471dd22",
    STABILITY_POOL_PACKAGE_ID: "0xb80b111f3dfb35ea26bd288e187af349c4e5b74a5fda143066f5ff9de84f34bf",
    INCENTIVE_PACKAGE_ID: "0xfd50d23504c5a3ad290357f9cbce4a0a3645ab25fc3a11e939126d331267fe29",
    POINT_PACKAGE_ID: "0x745a1c670fd04d9e71b43a3593a855c79af5e6aa6979d1029f35ec9baa344c1e",
    CLOCK_OBJ: {
      objectId: "0x0000000000000000000000000000000000000000000000000000000000000006",
      initialSharedVersion: 1,
      mutable: false
    },
    TREASURY_OBJ: {
      objectId: "0x81f525f4fa5b2d3cf58677d3e39aabc4b0a1ca25cbba605033cfe417e47b0a16",
      initialSharedVersion: 22329876,
      mutable: true
    },
    STABILITY_POOL_OBJ: {
      objectId: "0x6101272394511caf38ce5a6d120d3b4d009b6efabae8faac43aa9ac938cec558",
      initialSharedVersion: 22329903,
      mutable: true
    },
    INCENTIVE_GLOBAL_CONFIG_OBJ: {
      objectId: "0xc30c82b96429c2c215dbc994e73250c8b29e747c9540a547c7bc95e6d7e098d8",
      initialSharedVersion: 120165683,
      mutable: false
    },
    VAULT_REWARDER_REGISTRY_OBJ: {
      objectId: "0x3b5a6649ce2c4348ae7d2dc72bc8e42cecfc6c24b9edb701635f9c49c765ff69",
      initialSharedVersion: 120165683,
      mutable: false
    },
    POOL_REWARDER_REGISTRY_OBJ: {
      objectId: "0xc043719e2da72c1182466bbccf01b966d500337749cd6a06e042714444d2852c",
      initialSharedVersion: 120165683,
      mutable: false
    },
    PYTH_STATE_ID: "0x6bc33855c7675e006f55609f61eebb1c8a104d8973a698ee9efd3127c210b37f",
    WORMHOLE_STATE_ID: "0xd43b448afc9dd01deb18273ec39d8f27ddd4dd46b0922383874331771b70df73",
    PYTH_RULE_PACKAGE_ID: "0xed5a8dac2ca41ae9bdc1c7f778b0949d3e26c18c51ed284c4cfa4030d0bb64c2",
    PYTH_RULE_CONFIG_OBJ: {
      objectId: "0xbcc4f6e3ca3d4a83eac39282ab7d1cb086924c58bef825d69c33b00fea1105b8",
      initialSharedVersion: 22329882,
      mutable: false
    },
    CERT_RULE_PACKAGE_ID: "0x01edb9afe0663b8762d2e0a18923df8bee98d28f3a60ac56ff67a27bbf53a7ac",
    CERT_NATIVE_POOL_OBJ: {
      objectId: "0x02d641d7b021b1cd7a2c361ac35b415ae8263be0641f9475ec32af4b9d8a8056",
      initialSharedVersion: 19,
      mutable: false
    },
    CERT_METADATA_OBJ: {
      objectId: "0x8c25ec843c12fbfddc7e25d66869f8639e20021758cac1a3db0f6de3c9fda2ed",
      initialSharedVersion: 19,
      mutable: false
    },
    POINT_PACKAGE_ADMIN_CAP_OBJECT_ID: "0x2bc471bd479eac37891f3ad6641142960478d6f1724a038e2fe56f7fd28e0091",
    POINT_GLOBAL_CONFIG_SHARED_OBJECT_REF: {
      objectId: "0x86f95e88bcc50edbd930153079db969e92f050c887d7d4b4642a08cbb04d8787",
      initialSharedVersion: 126182186,
      mutable: false
    },
    POINT_HANDLER_MAP: {
      stIOTA: {
        objectId: "0xcd096080bca84ea1c60dfe2b8efcad1eceb41acbe69de1c71f867dd2d3b51dd1",
        initialSharedVersion: 126182187,
        mutable: false
      }
    },
    STABILITY_POOL_TABLE_ID: "0x6dd808c50bab98757f7523562bdef7d33d506bb447ea9e708072bf13a5e29f02",
    STABILITY_POOL_REWARDERS: [
      {
        objectId: "0xb295972b5c978ebb96339b81a762cbc047be78747c2f7d19e661281560394c2b",
        mutable: true,
        initialSharedVersion: 121322519,
        rewardSymbol: "stIOTA"
      }
    ],
    VAULT_MAP: {
      IOTA: {
        priceAggregater: {
          objectId: "0x052c40b4e8f16df5238457f3a7b3b0eeaa49c6bc8acc22f6a7790ab32495b2c6",
          initialSharedVersion: 22329880,
          mutable: false
        },
        vault: {
          objectId: "0xaf306be8419cf059642acdba3b4e79a5ae893101ae62c8331cefede779ef48d5",
          initialSharedVersion: 22329895,
          mutable: true
        },
        pythPriceId: "0xc7b72e5d860034288c9335d4d325da4272fe50c92ab72249d58f6cbba30e4c44"
      },
      stIOTA: {
        priceAggregater: {
          objectId: "0x8c730f64aa369eed69ddf7eea39c78bf0afd3f9fbb4ee0dfe457f6dea5a0f4ed",
          initialSharedVersion: 22329881,
          mutable: false
        },
        vault: {
          objectId: "0xc9cb494657425f350af0948b8509efdd621626922e9337fd65eb161ec33de259",
          initialSharedVersion: 22329896,
          mutable: true
        }
        // rewarders: [
        //   {
        //     objectId:
        //       "0xf9ac7f70f1e364cd31734f5a3ebf5c580d3da11c06ca6d7832e82cc417e022eb",
        //     initialSharedVersion: 121322517,
        //     mutable: true,
        //     rewardSymbol: "stIOTA",
        //   },
        // ],
      },
      iBTC: {
        priceAggregater: {
          objectId: "0x8a00ca5bae51c5d001e92e5b2188b7ec20a1c530aeac327b3ab86049bf9540ed",
          initialSharedVersion: 172291113,
          mutable: false
        },
        vault: {
          objectId: "0xcc094d9e3b491b0c943bb18daf07a49bd951f34688f9610d90982de06fc0c5c9",
          initialSharedVersion: 172291112,
          mutable: true
        },
        pythPriceId: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"
      }
    }
  },
  testnet: {
    COIN_TYPES: {
      VUSD: "0x3fbd238eea1f4ce7d797148954518fce853f24a8be01b47388bfa2262602fefa::vusd::VUSD",
      IOTA: "0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA",
      stIOTA: "0x14f9e69c0076955d5a056260c9667edab184650dba9919f168a37030dd956dc6::cert::CERT",
      iBTC: ""
    },
    ORIGINAL_FRAMEWORK_PACKAGE_ID: "0x5e1fb08bd2360286cd13dd174f6d17aa8871b08906aa8001079199ad62ad81b1",
    ORIGINAL_VUSD_PACKAGE_ID: "0x3fbd238eea1f4ce7d797148954518fce853f24a8be01b47388bfa2262602fefa",
    ORIGINAL_ORACLE_PACKAGE_ID: "0x2cac3390862418a4db51e868d1edc9b08688121434042209e70c6f88ace13de2",
    ORIGINAL_CDP_PACKAGE_ID: "0x718a06666424bd031790eb421a2ac1e0b4e0c3ff7a84e455124d65109b1a6a74",
    ORIGINAL_STABILITY_POOL_PACKAGE_ID: "0x8a1cdc065cbd8f59e182dd72d4cb653adcec29e29b8204e8c3f0289cf8eb5a8f",
    FRAMEWORK_PACKAGE_ID: "0x5e1fb08bd2360286cd13dd174f6d17aa8871b08906aa8001079199ad62ad81b1",
    VUSD_PACKAGE_ID: "0x3fbd238eea1f4ce7d797148954518fce853f24a8be01b47388bfa2262602fefa",
    ORACLE_PACKAGE_ID: "0x2cac3390862418a4db51e868d1edc9b08688121434042209e70c6f88ace13de2",
    CDP_PACKAGE_ID: "0x718a06666424bd031790eb421a2ac1e0b4e0c3ff7a84e455124d65109b1a6a74",
    STABILITY_POOL_PACKAGE_ID: "0x8a1cdc065cbd8f59e182dd72d4cb653adcec29e29b8204e8c3f0289cf8eb5a8f",
    CLOCK_OBJ: {
      objectId: "0x0000000000000000000000000000000000000000000000000000000000000006",
      initialSharedVersion: 1,
      mutable: false
    },
    TREASURY_OBJ: {
      objectId: "0x47ad134052f120a1153e1f83346d6972ceb5088c1e09b936c816f0f5a26f887b",
      initialSharedVersion: 265495161,
      mutable: true
    },
    STABILITY_POOL_OBJ: {
      objectId: "0xcdc4dca9a7a481d5f9f586177ca75d34a62d9c9371c97a3f4fb330a13d8995b4",
      initialSharedVersion: 265495176,
      mutable: true
    },
    INCENTIVE_GLOBAL_CONFIG_OBJ: {
      objectId: "",
      initialSharedVersion: 0,
      mutable: false
    },
    VAULT_REWARDER_REGISTRY_OBJ: {
      objectId: "",
      initialSharedVersion: 0,
      mutable: false
    },
    POOL_REWARDER_REGISTRY_OBJ: {
      objectId: "",
      initialSharedVersion: 0,
      mutable: false
    },
    PYTH_STATE_ID: "0x68dda579251917b3db28e35c4df495c6e664ccc085ede867a9b773c8ebedc2c1",
    WORMHOLE_STATE_ID: "0x8bc490f69520a97ca1b3de864c96aa2265a0cf5d90f5f3f016b2eddf0cf2af2b",
    PYTH_RULE_PACKAGE_ID: "0xa4cbdbf0f287b616284aafb75bbc6192fcb8362a4c3cc57a4df41a865e6ca338",
    PYTH_RULE_CONFIG_OBJ: {
      objectId: "0x1258041fbe82bd343456101402a51ce3146157297f2f5273621a1d32c9098c36",
      initialSharedVersion: 265495170,
      mutable: false
    },
    CERT_RULE_PACKAGE_ID: "0x5bf6e3d810d19ceb4fa03d750e8e2785357cfddb58089cd78acf9a309b9b72ec",
    CERT_NATIVE_POOL_OBJ: {
      objectId: "0xe9d03191a150269de0740c9194f0de45a560432dbc972bcb2460813ce843dcaa",
      initialSharedVersion: 241105314,
      mutable: false
    },
    CERT_METADATA_OBJ: {
      objectId: "0xf77ffe15ad2dfd2f24553f8e94b0e7dc85450326e60e62546adb80998f56de46",
      initialSharedVersion: 241105314,
      mutable: false
    },
    POINT_PACKAGE_ADMIN_CAP_OBJECT_ID: "",
    POINT_GLOBAL_CONFIG_SHARED_OBJECT_REF: {
      objectId: "",
      initialSharedVersion: 0,
      mutable: false
    },
    POINT_HANDLER_MAP: {
      stIOTA: {
        objectId: "",
        initialSharedVersion: 0,
        mutable: false
      }
    },
    STABILITY_POOL_TABLE_ID: "0xde5e356ae1dbe072f5fec0c006c29ff99c04647233e2e8bb6a295f3418a5c386",
    STABILITY_POOL_REWARDERS: [],
    VAULT_MAP: {
      IOTA: {
        priceAggregater: {
          objectId: "0xcbad09b5520711d5d56032e079daabaf672b794508af338b1d02b746864d9d0f",
          initialSharedVersion: 265495168,
          mutable: false
        },
        vault: {
          objectId: "0xa499e1273f818acb344c688843edee6a1fec2527c83e557a05fa686111815e24",
          initialSharedVersion: 265495180,
          mutable: true
        },
        pythPriceId: "0xc7b72e5d860034288c9335d4d325da4272fe50c92ab72249d58f6cbba30e4c44"
      },
      stIOTA: {
        priceAggregater: {
          objectId: "0x049ead4145f6152fbdea6f26bfddccb89ef25b2f5920ef6d667bce0eb7b7bdd5",
          initialSharedVersion: 265495169,
          mutable: false
        },
        vault: {
          objectId: "0x729bf70da0e17a8c1caefbf6c1f9f09c04c6075f22250500b8fc7efe97cd7afb",
          initialSharedVersion: 265495181,
          mutable: true
        },
        rewarders: []
      },
      iBTC: {
        priceAggregater: {
          objectId: "0x8a00ca5bae51c5d001e92e5b2188b7ec20a1c530aeac327b3ab86049bf9540ed",
          initialSharedVersion: 172291113,
          mutable: false
        },
        vault: {
          objectId: "0xcc094d9e3b491b0c943bb18daf07a49bd951f34688f9610d90982de06fc0c5c9",
          initialSharedVersion: 172291112,
          mutable: true
        },
        pythPriceId: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43"
      }
    }
  }
};

// src/types/coin.ts
function isDepositPointBonusCoin(coin) {
  return coin === "stIOTA";
}

// src/utils/format.ts
var _utils = require('@iota/iota-sdk/utils');
function getObjectNames(objectTypes, coinTypes) {
  const accept_coin_type = Object.values(coinTypes);
  const accept_coin_name = Object.keys(coinTypes);
  const coinTypeList = objectTypes.map(
    (type) => _nullishCoalesce(_optionalChain([type, 'access', _ => _.split, 'call', _2 => _2("<"), 'access', _3 => _3.pop, 'call', _4 => _4(), 'optionalAccess', _5 => _5.replace, 'call', _6 => _6(">", "")]), () => ( ""))
  );
  const objectNameList = [];
  coinTypeList.forEach((type) => {
    const typeIndex = accept_coin_type.indexOf(type);
    const coinName = accept_coin_name[typeIndex];
    objectNameList.push(_nullishCoalesce(coinName, () => ( "")));
  });
  return objectNameList;
}
var getCoinType = (str, coinTypes) => {
  const startIndex = str.indexOf("<");
  const endIndex = str.lastIndexOf(">");
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const coinType = str.slice(startIndex + 1, endIndex);
    return coinType === "0x2::iota::IOTA" ? coinTypes.IOTA : coinType;
  }
  return null;
};
var getCoinSymbol = (coinType, coinTypes) => {
  const coin = Object.keys(coinTypes).find(
    (key) => _utils.normalizeIotaAddress.call(void 0, coinTypes[key]) === _utils.normalizeIotaAddress.call(void 0, coinType)
  );
  if (coin) {
    return coin;
  }
  return void 0;
};
function U64FromBytes(x) {
  let u64 = BigInt(0);
  for (let i = x.length - 1; i >= 0; i--) {
    u64 = u64 << BigInt(8) | BigInt(_nullishCoalesce(x[i], () => ( 0)));
  }
  return u64;
}
var formatUnits = (value, decimals) => {
  let display = value.toString();
  const negative = display.startsWith("-");
  if (negative) display = display.slice(1);
  display = display.padStart(decimals, "0");
  const integer = display.slice(0, display.length - decimals);
  let fraction = display.slice(display.length - decimals);
  fraction = fraction.replace(/(0+)$/, "");
  return `${negative ? "-" : ""}${integer || "0"}${fraction ? `.${fraction}` : ""}`;
};
var formatBigInt = (value, decimals = 9) => {
  const formatted = formatUnits(BigInt(value), decimals);
  return Number(formatted);
};
var parseUnits = (value, decimals) => {
  let [integer, fraction = "0"] = typeof value == "string" ? value.split(".") : value.toString().split(".");
  if (integer === void 0) {
    return BigInt(0);
  }
  const negative = integer.startsWith("-");
  if (negative) integer = integer.slice(1);
  fraction = fraction.replace(/(0+)$/, "");
  if (decimals === 0) {
    integer = `${Math.round(Number(`${integer}.${fraction}`))}`;
    fraction = "";
  } else if (fraction.length > decimals) {
    const [before, after] = [
      fraction.slice(0, decimals),
      fraction.slice(decimals)
    ];
    fraction = `${/^0+$/.test(before) ? before.slice(0, before.length - 1) : ""}${Math.round(Number(`${before}.${after}`))}`;
  } else {
    fraction = fraction.padEnd(decimals, "0");
  }
  return BigInt(`${negative ? "-" : ""}${integer}${fraction}`);
};

// src/utils/object.ts
var _superstruct = require('superstruct');
var ObjectContentFields = _superstruct.record.call(void 0, _superstruct.string.call(void 0, ), _superstruct.any.call(void 0, ));
function isIotaObjectDataWithContent(data) {
  return data.content !== void 0;
}
function getIotaObjectData(resp) {
  return resp.data;
}
function getMoveObject(data) {
  const obj = "data" in data ? getIotaObjectData(data) : data;
  if (!obj || !isIotaObjectDataWithContent(obj) || obj.content.dataType !== "moveObject") {
    return void 0;
  }
  return obj.content;
}
function getObjectFields(resp) {
  if ("fields" in resp) {
    return resp.fields;
  }
  return _optionalChain([getMoveObject, 'call', _7 => _7(resp), 'optionalAccess', _8 => _8.fields]);
}
var getObjectGenerics = (resp) => {
  const objType = _optionalChain([resp, 'access', _9 => _9.data, 'optionalAccess', _10 => _10.type]);
  const startIdx = _optionalChain([objType, 'optionalAccess', _11 => _11.indexOf, 'optionalCall', _12 => _12("<")]);
  const endIdx = _optionalChain([objType, 'optionalAccess', _13 => _13.lastIndexOf, 'optionalCall', _14 => _14(">")]);
  return startIdx ? objType.slice(startIdx + 1, endIdx).split(", ") : [];
};

// src/utils/response.ts
var parseVaultObject = (coinSymbol, fields) => {
  return {
    token: coinSymbol,
    positionTableSize: fields.position_table.fields.size,
    collateralDecimal: Number(fields.decimal),
    collateralBalance: fields.balance,
    supply: fields.limited_supply.fields.supply,
    maxSupply: fields.limited_supply.fields.limit,
    interestRate: formatBigInt(fields.interest_rate.fields.value, 18),
    minCollateralRatio: formatBigInt(fields.min_collateral_ratio.fields.value)
  };
};

// src/client.ts



var _pythiotajs = require('@pythnetwork/pyth-iota-js');
var _bcs = require('@iota/iota-sdk/bcs');

var getCoinSymbol2 = (coinType, coinTypes) => {
  const coin = Object.keys(coinTypes).find(
    (key) => coinTypes[key] === coinType
  );
  if (coin) {
    return coin;
  }
  return void 0;
};
var DUMMY_ADDRESS = _utils.normalizeIotaAddress.call(void 0, "0x0");
var TYPE_NAME_STRUCT = _bcs.bcs.struct("TypeName", {
  name: _bcs.bcs.String
});
var CDP_POSITION_DATA = _bcs.bcs.struct("CdpPositionData", {
  debtor: _bcs.bcs.Address,
  coll_amount: _bcs.bcs.U64,
  debt_amount: _bcs.bcs.U64
});
var POOL_POSITION_DATA = _bcs.bcs.struct("StabilityPoolPositionData", {
  account: _bcs.bcs.Address,
  vusd_balance: _bcs.bcs.U64,
  coll_types: _bcs.bcs.vector(TYPE_NAME_STRUCT),
  coll_amounts: _bcs.bcs.vector(_bcs.bcs.U64),
  timestamp: _bcs.bcs.U64
});
var VirtueClient = class {
  constructor(inputs) {
    const { network, rpcUrl, sender } = _nullishCoalesce(inputs, () => ( {}));
    this.config = CONFIG[_nullishCoalesce(network, () => ( "mainnet"))];
    this.rpcEndpoint = _nullishCoalesce(rpcUrl, () => ( _client.getFullnodeUrl.call(void 0, _nullishCoalesce(network, () => ( "mainnet")))));
    this.sender = sender ? _utils.normalizeIotaAddress.call(void 0, sender) : DUMMY_ADDRESS;
    this.iotaClient = new (0, _client.IotaClient)({ url: this.rpcEndpoint });
    this.pythConnection = new (0, _pythiotajs.IotaPriceServiceConnection)(
      "https://hermes.pyth.network"
    );
    this.pythClient = new (0, _pythiotajs.IotaPythClient)(
      this.iotaClient,
      this.config.PYTH_STATE_ID,
      this.config.WORMHOLE_STATE_ID
    );
    this.transaction = new (0, _transactions.Transaction)();
  }
  /* ----- Getter ----- */
  /**
   * @description Get this.iotaClient
   */
  getIotaClient() {
    return this.iotaClient;
  }
  /**
   * @description Get this.pythConnection
   */
  getPythConnection() {
    return this.pythConnection;
  }
  /**
   * @description Get this.pythClient
   */
  getPythClient() {
    return this.pythClient;
  }
  /* ----- Query ----- */
  /**
   * @description
   */
  async getPrice(symbol) {
    this.resetTransaction();
    await this.aggregatePrice(symbol);
    this.transaction.setSender(DUMMY_ADDRESS);
    const dryrunRes = await this.dryrunTransaction();
    this.resetTransaction();
    console.log(dryrunRes.events);
    const priceResult = dryrunRes.events.find(
      (e) => e.type.includes("PriceAggregated")
    );
    console.log(priceResult);
    const pricePrecision = 10 ** 9;
    if (priceResult) {
      return +priceResult.parsedJson.result / pricePrecision;
    } else {
      return 0;
    }
  }
  /**
   * @description Get all vault objects
   */
  async getAllVaults() {
    const vaultObjectIds = Object.values(this.config.VAULT_MAP).map(
      (v) => v.vault.objectId
    );
    const vaultResults = await this.iotaClient.multiGetObjects({
      ids: vaultObjectIds,
      options: {
        showContent: true
      }
    });
    const vaults = vaultResults.reduce((acc, res) => {
      const fields = getObjectFields(res);
      const token = Object.keys(this.config.VAULT_MAP).find(
        (key) => this.config.VAULT_MAP[key].vault.objectId === _optionalChain([res, 'access', _15 => _15.data, 'optionalAccess', _16 => _16.objectId])
      );
      if (!token) return acc;
      const vault = parseVaultObject(token, fields);
      acc[vault.token] = vault;
      return acc;
    }, {});
    return vaults;
  }
  /**
   * @description Get Vault<token> object
   */
  async getVault(token) {
    const res = await this.iotaClient.getObject({
      id: this.config.VAULT_MAP[token].vault.objectId,
      options: {
        showContent: true
      }
    });
    const fields = getObjectFields(res);
    return parseVaultObject(token, fields);
  }
  /**
   * @description Get debtor's position data
   */
  async getDebtorPositions(debtor) {
    const tx = new (0, _transactions.Transaction)();
    const clockObj = tx.sharedObjectRef(this.config.CLOCK_OBJ);
    const tokenList = Object.keys(this.config.VAULT_MAP);
    const debtorAddr = _nullishCoalesce(debtor, () => ( this.sender));
    if (debtorAddr === DUMMY_ADDRESS) {
      throw new Error("Invalid debtor address");
    }
    tokenList.map((token) => {
      tx.moveCall({
        target: `${this.config.CDP_PACKAGE_ID}::vault::try_get_position_data`,
        typeArguments: [this.config.COIN_TYPES[token]],
        arguments: [
          tx.sharedObjectRef(this.config.VAULT_MAP[token].vault),
          tx.pure.address(debtorAddr),
          clockObj
        ]
      });
    });
    const res = await this.iotaClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: _nullishCoalesce(debtor, () => ( this.sender))
    });
    if (!res.results) return [];
    return res.results.map((value, idx) => {
      const collateral = tokenList[idx];
      if (value.returnValues) {
        const [collReturn, debtReturn] = value.returnValues;
        return {
          collateral,
          collAmount: collReturn ? _bcs.bcs.u64().parse(Uint8Array.from(collReturn[0])) : "0",
          debtAmount: debtReturn ? _bcs.bcs.u64().parse(Uint8Array.from(debtReturn[0])) : "0"
        };
      } else {
        return {
          collateral: tokenList[idx],
          collAmount: "0",
          debtAmount: "0"
        };
      }
    });
  }
  /**
   * @description Get data from stability pool
   */
  async getStabilityPool() {
    const res = await this.iotaClient.getObject({
      id: this.config.STABILITY_POOL_OBJ.objectId,
      options: {
        showContent: true
      }
    });
    const fields = getObjectFields(res);
    if (!fields) {
      return { vusdBalance: 0 };
    }
    return { vusdBalance: fields.vusd_balance };
  }
  /**
   * @description Get user's balances in stability pool
   */
  async getStabilityPoolBalances(account) {
    const accountAddr = _nullishCoalesce(account, () => ( this.sender));
    if (accountAddr === DUMMY_ADDRESS) {
      throw new Error("Invalid account address");
    }
    const res = await this.iotaClient.getDynamicFieldObject({
      parentId: this.config.STABILITY_POOL_TABLE_ID,
      name: {
        type: "address",
        value: accountAddr
      }
    });
    const collBalances = {};
    Object.keys(this.config.VAULT_MAP).map((collSymbol) => {
      collBalances[collSymbol] = 0;
    });
    if (_optionalChain([res, 'access', _17 => _17.data, 'optionalAccess', _18 => _18.content, 'optionalAccess', _19 => _19.dataType]) !== "moveObject") {
      return { vusdBalance: 0, collBalances };
    }
    const fields = res.data.content.fields;
    const vusdBalance = fields.value.fields.value.fields.vusd_balance.fields.value;
    const vecMap = fields.value.fields.value.fields.coll_balances.fields.contents;
    vecMap.map((info) => {
      const coinType = "0x" + info.fields.key.fields.name;
      const coinSymbol = getCoinSymbol2(coinType, this.config.COIN_TYPES);
      if (coinSymbol) {
        const collBalance = info.fields.value.fields.value;
        collBalances[coinSymbol] = +collBalance;
      }
    });
    return { vusdBalance, collBalances };
  }
  /**
   * @description Get reward amounts from borrow incentive program
   */
  async getBorrowRewards(collateralSymbol, account) {
    const accountAddr = _nullishCoalesce(account, () => ( this.sender));
    if (accountAddr === DUMMY_ADDRESS) {
      throw new Error("Invalid debtor address");
    }
    const tx = new (0, _transactions.Transaction)();
    const vaultInfo = this.config.VAULT_MAP[collateralSymbol];
    const rewarders = vaultInfo.rewarders;
    const vaultObj = tx.sharedObjectRef(vaultInfo.vault);
    if (!rewarders) return {};
    rewarders.map((rewarder) => {
      tx.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::borrow_incentive::realtime_reward_amount`,
        typeArguments: [
          this.config.COIN_TYPES[collateralSymbol],
          this.config.COIN_TYPES[rewarder.rewardSymbol]
        ],
        arguments: [
          tx.sharedObjectRef(rewarder),
          vaultObj,
          tx.pure.address(accountAddr),
          tx.sharedObjectRef(this.config.CLOCK_OBJ)
        ]
      });
    });
    const res = await this.iotaClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: accountAddr
    });
    if (!res.results) return {};
    const rewards = {};
    res.results.map((value, idx) => {
      const rewarder = rewarders[idx];
      if (rewarder && value.returnValues) {
        const [rewardAmount] = value.returnValues;
        rewards[rewarder.rewardSymbol] = Number(
          rewardAmount ? _bcs.bcs.u64().parse(Uint8Array.from(rewardAmount[0])) : "0"
        );
      }
    });
    return rewards;
  }
  /**
   * @description Get reward amounts from stability pool incentive program
   */
  async getStabilityPoolRewards(account) {
    const tx = new (0, _transactions.Transaction)();
    const accountAddr = _nullishCoalesce(account, () => ( this.sender));
    if (accountAddr === DUMMY_ADDRESS) {
      throw new Error("Invalid debtor address");
    }
    this.config.STABILITY_POOL_REWARDERS.map((rewarder) => {
      tx.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::stability_pool_incentive::realtime_reward_amount`,
        typeArguments: [this.config.COIN_TYPES[rewarder.rewardSymbol]],
        arguments: [
          tx.sharedObjectRef(rewarder),
          tx.sharedObjectRef(this.config.STABILITY_POOL_OBJ),
          tx.pure.address(accountAddr),
          tx.sharedObjectRef(this.config.CLOCK_OBJ)
        ]
      });
    });
    const res = await this.iotaClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: accountAddr
    });
    if (!res.results) return {};
    const rewards = {};
    res.results.map((value, idx) => {
      const rewarder = this.config.STABILITY_POOL_REWARDERS[idx];
      if (rewarder && value.returnValues) {
        const [rewardAmount] = value.returnValues;
        rewards[rewarder.rewardSymbol] = Number(
          rewardAmount ? _bcs.bcs.u64().parse(Uint8Array.from(rewardAmount[0])) : "0"
        );
      }
    });
    return rewards;
  }
  /**
   * @description Get CDP Positions
   */
  async getCdpPositions({
    coinSymbol,
    pageSize,
    cursor
  }) {
    const tx = new (0, _transactions.Transaction)();
    const vaultInfo = this.config.VAULT_MAP[coinSymbol];
    const coinType = this.config.COIN_TYPES[coinSymbol];
    tx.moveCall({
      target: `${this.config.CDP_PACKAGE_ID}::vault::get_positions`,
      typeArguments: [coinType],
      arguments: [
        tx.sharedObjectRef(vaultInfo.vault),
        tx.sharedObjectRef(this.config.CLOCK_OBJ),
        tx.pure.option("address", cursor),
        tx.pure.u64(pageSize)
      ]
    });
    const res = await this.getIotaClient().devInspectTransactionBlock({
      transactionBlock: tx,
      sender: this.sender
    });
    if (!res.results || !_optionalChain([res, 'access', _20 => _20.results, 'access', _21 => _21[0], 'optionalAccess', _22 => _22.returnValues])) {
      return {
        positions: [],
        nextCursor: null
      };
    }
    const [positionBytes, nextCursorBytes] = res.results[0].returnValues;
    const positions = _bcs.bcs.vector(CDP_POSITION_DATA).parse(Uint8Array.from(positionBytes ? positionBytes[0] : [])).map((pos) => {
      return {
        debtor: pos.debtor,
        collAmount: Number(pos.coll_amount) / 10 ** COIN_DECIMALS[coinSymbol],
        debtAmount: Number(pos.debt_amount) / 10 ** COIN_DECIMALS.VUSD
      };
    });
    const nextCursor = _bcs.bcs.option(_bcs.bcs.Address).parse(Uint8Array.from(nextCursorBytes ? nextCursorBytes[0] : []));
    return {
      positions,
      nextCursor
    };
  }
  /**
   * @description Get CDP Positions
   */
  async getStabilityPoolPositions({
    pageSize,
    cursor
  }) {
    const tx = new (0, _transactions.Transaction)();
    tx.moveCall({
      target: `${this.config.STABILITY_POOL_PACKAGE_ID}::stability_pool::get_positions`,
      arguments: [
        tx.sharedObjectRef(this.config.STABILITY_POOL_OBJ),
        tx.pure.option("address", cursor),
        tx.pure.u64(pageSize)
      ]
    });
    const res = await this.getIotaClient().devInspectTransactionBlock({
      transactionBlock: tx,
      sender: this.sender
    });
    if (!res.results || !_optionalChain([res, 'access', _23 => _23.results, 'access', _24 => _24[0], 'optionalAccess', _25 => _25.returnValues])) {
      return {
        positions: [],
        nextCursor: null
      };
    }
    const [positionVec, nextCursorVec] = res.results[0].returnValues;
    const positions = _bcs.bcs.vector(POOL_POSITION_DATA).parse(Uint8Array.from(positionVec ? positionVec[0] : [])).map((pos) => {
      const collAmounts = {};
      pos.coll_types.map(
        (t, idx) => collAmounts["0x" + t.fields.name] = Number(pos.coll_amounts[idx])
      );
      return {
        account: pos.account,
        vusdAmount: Number(pos.vusd_balance),
        collAmounts,
        timestamp: Number(pos.timestamp)
      };
    });
    const nextCursor = _bcs.bcs.option(_bcs.bcs.Address).parse(Uint8Array.from(nextCursorVec ? nextCursorVec[0] : []));
    return { positions, nextCursor };
  }
  /* ----- Transaction Utils ----- */
  /**
   * @description new zero coin
   */
  zeroCoin(coinSymbol) {
    return this.transaction.moveCall({
      target: "0x2::coin::zero",
      typeArguments: [this.config.COIN_TYPES[coinSymbol]]
    });
  }
  /**
   * @description destroy zero coin
   */
  destroyZeroCoin(coinSymbol, coin) {
    this.transaction.moveCall({
      target: "0x2::coin::destroy_zero",
      typeArguments: [this.config.COIN_TYPES[coinSymbol]],
      arguments: [coin]
    });
  }
  /**
   * @description split the needed coins
   */
  async splitInputCoins(coinSymbol, ...amounts) {
    const totalAmount = amounts.reduce(
      (sum, amount) => sum + Number(amount),
      0
    );
    if (totalAmount === 0) {
      return this.zeroCoin(coinSymbol);
    } else {
      if (coinSymbol === "IOTA") {
        return this.transaction.splitCoins(
          this.transaction.gas,
          amounts.map(
            (amount) => typeof amount === "string" ? this.transaction.pure.u64(amount) : amount
          )
        );
      } else {
        const coinType = this.config.COIN_TYPES[coinSymbol];
        const { data: userCoins } = await this.iotaClient.getCoins({
          owner: this.sender,
          coinType
        });
        const [mainCoin, ...otherCoins] = userCoins.map(
          (coin) => this.transaction.objectRef({
            objectId: coin.coinObjectId,
            version: coin.version,
            digest: coin.digest
          })
        );
        if (!mainCoin) {
          throw new Error("Not enough balance");
        }
        const ifMerge = otherCoins.length > 0;
        if (ifMerge) {
          this.transaction.mergeCoins(mainCoin, otherCoins);
        }
        const out = this.transaction.splitCoins(
          mainCoin,
          amounts.map(
            (amount) => typeof amount === "string" ? this.transaction.pure.u64(amount) : amount
          )
        );
        if (ifMerge) {
          this.transaction.transferObjects([mainCoin], this.sender);
        }
        return out;
      }
    }
  }
  /* ----- Transaction Methods ----- */
  /**
   * @description Reset this.transaction
   */
  resetTransaction() {
    this.transaction = new (0, _transactions.Transaction)();
  }
  /**
   * @description return Transaction
   * @returns Transaction
   */
  getTransaction() {
    return this.transaction;
  }
  async dryrunTransaction() {
    this.transaction.setSender(this.sender);
    return this.iotaClient.dryRunTransactionBlock({
      transactionBlock: await this.transaction.build({
        client: this.iotaClient
      })
    });
  }
  async signAndExecuteTransaction(signer, options) {
    if (signer.toIotaAddress() !== this.sender) {
      throw new Error("Invalid signer");
    }
    return this.iotaClient.signAndExecuteTransaction({
      transaction: this.transaction,
      signer,
      options
    });
  }
  treasuryObj() {
    return this.transaction.sharedObjectRef(this.config.TREASURY_OBJ);
  }
  clockObj() {
    return this.transaction.sharedObjectRef(this.config.CLOCK_OBJ);
  }
  vaultObj(collateralSymbol) {
    return this.transaction.sharedObjectRef(
      this.config.VAULT_MAP[collateralSymbol].vault
    );
  }
  stabilityPoolObj() {
    return this.transaction.sharedObjectRef(this.config.STABILITY_POOL_OBJ);
  }
  /**
   * @description Create a AccountRequest
   * @param accountObj (optional): Account object or EOA if undefined
   * @return AccountRequest
   */
  newAccountRequest(accountObj) {
    return accountObj ? this.transaction.moveCall({
      target: `${this.config.FRAMEWORK_PACKAGE_ID}::account::request_with_account`,
      arguments: [
        typeof accountObj === "string" ? this.transaction.object(accountObj) : accountObj
      ]
    }) : this.transaction.moveCall({
      target: `${this.config.FRAMEWORK_PACKAGE_ID}::account::request`
    });
  }
  /**
   * @description Create a price collector
   * @param collateral coin symbol, e.g "IOTA"
   * @return PriceCollector
   */
  newPriceCollector(collateralSymbol) {
    return this.transaction.moveCall({
      target: `${this.config.ORACLE_PACKAGE_ID}::collector::new`,
      typeArguments: [this.config.COIN_TYPES[collateralSymbol]]
    });
  }
  /**
   * @description Get a price result
   * @param collateral coin symbol, e.g "IOTA"
   * @return [PriceResult]
   */
  async aggregatePrice(collateralSymbol) {
    const collector = this.newPriceCollector(collateralSymbol);
    const coinType = this.config.COIN_TYPES[collateralSymbol];
    const vaultInfo = this.config.VAULT_MAP[collateralSymbol];
    if (vaultInfo.pythPriceId) {
      const updateData = await this.pythConnection.getPriceFeedsUpdateData([
        vaultInfo.pythPriceId
      ]);
      const [priceInfoObjId] = await this.pythClient.updatePriceFeeds(
        this.transaction,
        updateData,
        [vaultInfo.pythPriceId]
      );
      this.transaction.moveCall({
        target: `${this.config.PYTH_RULE_PACKAGE_ID}::pyth_rule::feed`,
        typeArguments: [coinType],
        arguments: [
          collector,
          this.transaction.sharedObjectRef(this.config.PYTH_RULE_CONFIG_OBJ),
          this.clockObj(),
          this.transaction.object(this.config.PYTH_STATE_ID),
          this.transaction.object(priceInfoObjId)
        ]
      });
      return this.transaction.moveCall({
        target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
        typeArguments: [coinType],
        arguments: [
          this.transaction.sharedObjectRef(vaultInfo.priceAggregater),
          collector
        ]
      });
    } else if (collateralSymbol === "stIOTA") {
      const collector2 = this.newPriceCollector("stIOTA");
      const iotaPriceResult = await this.aggregatePrice("IOTA");
      this.transaction.moveCall({
        target: `${this.config.CERT_RULE_PACKAGE_ID}::cert_rule::feed`,
        arguments: [
          collector2,
          iotaPriceResult,
          this.transaction.sharedObjectRef(this.config.CERT_NATIVE_POOL_OBJ),
          this.transaction.sharedObjectRef(this.config.CERT_METADATA_OBJ)
        ]
      });
      return this.transaction.moveCall({
        target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
        typeArguments: [this.config.COIN_TYPES.stIOTA],
        arguments: [
          this.transaction.sharedObjectRef(vaultInfo.priceAggregater),
          collector2
        ]
      });
    } else {
      return this.aggregatePrice("IOTA");
    }
  }
  /**
   * @description Get a request to Mange Position
   * @param collateralSymbol: collateral coin symbol , e.g "IOTA"
   * @param depositCoin: collateral input coin
   * @param borrowAmount: the amount to borrow
   * @param repaymentCoin: repyment input coin (always VUSD)
   * @param withdrawAmount: the amount to withdraw
   * @param accountObj (optional): account object id or transaction argument
   * @returns UpdateRequest
   */
  debtorRequest(inputs) {
    const {
      collateralSymbol,
      depositCoin,
      borrowAmount,
      repaymentCoin,
      withdrawAmount,
      accountObj
    } = inputs;
    const coinType = this.config.COIN_TYPES[collateralSymbol];
    const vaultId = this.config.VAULT_MAP[collateralSymbol].vault.objectId;
    const accountReq = this.newAccountRequest(accountObj);
    return this.transaction.moveCall({
      target: `${this.config.CDP_PACKAGE_ID}::request::debtor_request`,
      typeArguments: [coinType],
      arguments: [
        accountReq,
        this.treasuryObj(),
        this.transaction.pure.id(vaultId),
        depositCoin,
        typeof borrowAmount === "string" ? this.transaction.pure.u64(borrowAmount) : borrowAmount,
        repaymentCoin,
        typeof withdrawAmount === "string" ? this.transaction.pure.u64(withdrawAmount) : withdrawAmount
      ]
    });
  }
  /**
   * @description Manage Position
   * @param collateralSymbol: collateral coin symbol , e.g "IOTA"
   * @param updateRequest: manager request, ex: see this.debtorRequest
   * @param priceResult: price result, see this.aggregatePrice
   * @returns [Coin<T>, COIN<VUSD>, UpdateResponse]
   */
  updatePosition(inputs) {
    const { collateralSymbol, updateRequest, priceResult } = inputs;
    const priceResultType = `${this.config.ORIGINAL_ORACLE_PACKAGE_ID}::result::PriceResult<${this.config.COIN_TYPES[collateralSymbol]}>`;
    const priceResultOpt = priceResult ? this.transaction.moveCall({
      target: `0x1::option::some`,
      typeArguments: [priceResultType],
      arguments: [priceResult]
    }) : this.transaction.moveCall({
      target: `0x1::option::none`,
      typeArguments: [priceResultType]
    });
    const [collCoin, vusdCoin, response] = this.transaction.moveCall({
      target: `${this.config.CDP_PACKAGE_ID}::vault::update_position`,
      typeArguments: [this.config.COIN_TYPES[collateralSymbol]],
      arguments: [
        this.vaultObj(collateralSymbol),
        this.treasuryObj(),
        this.clockObj(),
        priceResultOpt,
        updateRequest
      ]
    });
    return [collCoin, vusdCoin, response];
  }
  /**
   * @description check and destroy UpdateResponse
   * @param collateralSymbol: "IOTA" or "stIOTA"
   * @param response: UpdateResponse generated by update_position
   */
  checkResponse(inputs) {
    const { collateralSymbol, response } = inputs;
    let updateResponse = response;
    const vaultObj = this.vaultObj(collateralSymbol);
    if (this.config.INCENTIVE_PACKAGE_ID) {
      const collateralType = this.config.COIN_TYPES[collateralSymbol];
      const rewarders = this.config.VAULT_MAP[collateralSymbol].rewarders;
      const globalConfigObj = this.transaction.sharedObjectRef(
        this.config.INCENTIVE_GLOBAL_CONFIG_OBJ
      );
      const registryObj = this.transaction.sharedObjectRef(
        this.config.VAULT_REWARDER_REGISTRY_OBJ
      );
      const clockObj = this.clockObj();
      const checker = this.transaction.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::borrow_incentive::new_checker`,
        typeArguments: [collateralType],
        arguments: [registryObj, globalConfigObj, updateResponse]
      });
      (_nullishCoalesce(rewarders, () => ( []))).map((rewarder) => {
        const rewardType = this.config.COIN_TYPES[rewarder.rewardSymbol];
        this.transaction.moveCall({
          target: `${this.config.INCENTIVE_PACKAGE_ID}::borrow_incentive::update`,
          typeArguments: [collateralType, rewardType],
          arguments: [
            checker,
            globalConfigObj,
            vaultObj,
            this.transaction.sharedObjectRef(rewarder),
            clockObj
          ]
        });
      });
      const [responseAfterIncentive] = this.transaction.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::borrow_incentive::destroy_checker`,
        typeArguments: [collateralType],
        arguments: [checker, globalConfigObj]
      });
      updateResponse = responseAfterIncentive;
    }
    this.transaction.moveCall({
      target: `${this.config.CDP_PACKAGE_ID}::vault::destroy_response`,
      typeArguments: [this.config.COIN_TYPES[collateralSymbol]],
      arguments: [vaultObj, this.treasuryObj(), updateResponse]
    });
  }
  /**
   * @description deposit to stability pool
   * @param vusdCoin: coin of VUSD
   * @param recipient (optional): deposit for recipient instead of sender
   * @returns PositionResponse
   */
  depositStabilityPool(inputs) {
    const { vusdCoin, recipient } = inputs;
    return this.transaction.moveCall({
      target: `${this.config.STABILITY_POOL_PACKAGE_ID}::stability_pool::deposit`,
      arguments: [
        this.stabilityPoolObj(),
        this.clockObj(),
        this.transaction.pure.address(_nullishCoalesce(recipient, () => ( this.sender))),
        vusdCoin
      ]
    });
  }
  /**
   * @description withdraw from stability pool
   * @param amount: how much amount to withdraw
   * @param accountRequest: AccountRequest see this.accountRequest()
   * @param amount: how much amount to withdraw
   * @returns [Coin<VUSD>, PositionResponse]
   */
  withdrawStabilityPool(inputs) {
    const { amount, accountRequest, accountObj } = inputs;
    const accountReq = accountRequest ? accountRequest : this.newAccountRequest(accountObj);
    const [vusdCoin, response] = this.transaction.moveCall({
      target: `${this.config.STABILITY_POOL_PACKAGE_ID}::stability_pool::withdraw`,
      arguments: [
        this.stabilityPoolObj(),
        this.clockObj(),
        accountReq,
        this.transaction.pure.u64(amount)
      ]
    });
    return [vusdCoin, response];
  }
  /**
   * @description claim from stability pool
   */
  claimStabilityPool(inputs) {
    const { accountRequest, accountObj } = inputs;
    const accountReq = accountRequest ? accountRequest : this.newAccountRequest(accountObj);
    const collCoins = Object.keys(this.config.VAULT_MAP).map((collSymbol) => {
      const collType = this.config.COIN_TYPES[collSymbol];
      const [collCoin] = this.transaction.moveCall({
        target: `${this.config.STABILITY_POOL_PACKAGE_ID}::stability_pool::claim`,
        typeArguments: [collType],
        arguments: [this.stabilityPoolObj(), accountReq]
      });
      return collCoin;
    });
    return collCoins;
  }
  /**
   * @description check response for stability pool
   * @param response: PositionResponse
   */
  checkResponseForStabilityPool(response) {
    let positionResponse = response;
    if (this.config.INCENTIVE_PACKAGE_ID) {
      const globalConfigObj = this.transaction.sharedObjectRef(
        this.config.INCENTIVE_GLOBAL_CONFIG_OBJ
      );
      const registryObj = this.transaction.sharedObjectRef(
        this.config.POOL_REWARDER_REGISTRY_OBJ
      );
      const clockObj = this.clockObj();
      const checker = this.transaction.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::stability_pool_incentive::new_checker`,
        arguments: [registryObj, globalConfigObj, positionResponse]
      });
      (_nullishCoalesce(this.config.STABILITY_POOL_REWARDERS, () => ( []))).map((rewarder) => {
        const rewardType = this.config.COIN_TYPES[rewarder.rewardSymbol];
        this.transaction.moveCall({
          target: `${this.config.INCENTIVE_PACKAGE_ID}::stability_pool_incentive::update`,
          typeArguments: [rewardType],
          arguments: [
            checker,
            globalConfigObj,
            this.stabilityPoolObj(),
            this.transaction.sharedObjectRef(rewarder),
            clockObj
          ]
        });
      });
      const [responseAfterIncentive] = this.transaction.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::stability_pool_incentive::destroy_checker`,
        arguments: [checker, globalConfigObj]
      });
      positionResponse = responseAfterIncentive;
    }
    this.transaction.moveCall({
      target: `${this.config.STABILITY_POOL_PACKAGE_ID}::stability_pool::check_response`,
      arguments: [this.stabilityPoolObj(), positionResponse]
    });
  }
  /* ----- Transaction Methods ----- */
  /**
   * @description build and return Transaction of manage position
   * @param collateralSymbol: collateral coin symbol , e.g "IOTA"
   * @param depositAmount: how much amount to deposit (collateral)
   * @param borrowAmount: how much amout to borrow (VUSD)
   * @param repaymentAmount: how much amount to repay (VUSD)
   * @param withdrawAmount: how much amount to withdraw (collateral)
   * @param accountObjId: the Account object to hold position (undefined if just use EOA)
   * @param recipient (optional): the recipient of the output coins
   * @returns Transaction
   */
  async buildManagePositionTransaction(inputs) {
    const {
      collateralSymbol,
      depositAmount,
      borrowAmount,
      repaymentAmount,
      withdrawAmount,
      accountObjId,
      recipient,
      keepTransaction
    } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const [depositCoin] = await this.splitInputCoins(
      collateralSymbol,
      depositAmount
    );
    const [repaymentCoin] = await this.splitInputCoins("VUSD", repaymentAmount);
    if (Number(borrowAmount) > 0 || Number(withdrawAmount) > 0) {
      const priceResult = await this.aggregatePrice(collateralSymbol);
      const updateRequest = this.debtorRequest({
        collateralSymbol,
        depositCoin,
        borrowAmount,
        repaymentCoin,
        withdrawAmount,
        accountObj: accountObjId
      });
      const [collCoin, vusdCoin, response] = this.updatePosition({
        collateralSymbol,
        updateRequest,
        priceResult
      });
      if (isDepositPointBonusCoin(collateralSymbol))
        this.emitPointForDepositAction(collateralSymbol, response);
      this.checkResponse({ collateralSymbol, response });
      if (Number(withdrawAmount) > 0) {
        this.transaction.transferObjects([collCoin], _nullishCoalesce(recipient, () => ( this.sender)));
      } else {
        this.destroyZeroCoin(collateralSymbol, collCoin);
      }
      if (Number(borrowAmount) > 0) {
        if (recipient === "StabilityPool") {
          const response2 = this.depositStabilityPool({ vusdCoin, recipient });
          this.checkResponseForStabilityPool(response2);
        } else {
          this.transaction.transferObjects(
            [vusdCoin],
            _nullishCoalesce(recipient, () => ( this.sender))
          );
        }
      } else {
        this.destroyZeroCoin("VUSD", vusdCoin);
      }
      const tx = this.getTransaction();
      this.resetTransaction();
      return tx;
    } else {
      const updateRequest = this.debtorRequest({
        collateralSymbol,
        depositCoin,
        borrowAmount,
        repaymentCoin,
        withdrawAmount,
        accountObj: accountObjId
      });
      const [collCoin, vusdCoin, response] = this.updatePosition({
        collateralSymbol,
        updateRequest
      });
      if (isDepositPointBonusCoin(collateralSymbol))
        this.emitPointForDepositAction(collateralSymbol, response);
      this.checkResponse({ collateralSymbol, response });
      this.destroyZeroCoin(collateralSymbol, collCoin);
      this.destroyZeroCoin("VUSD", vusdCoin);
      const tx = this.getTransaction();
      if (!keepTransaction) this.resetTransaction();
      return tx;
    }
  }
  /**
   * @description build and return Transaction of close position
   * @param collateralSymbol: collateral coin symbol , e.g "IOTA"
   * @param accountObjId: the Account object to hold position (undefined if just use EOA)
   * @param recipient (optional): the recipient of the output coins
   * @returns Transaction
   */
  async buildClosePositionTransaction(inputs) {
    const { collateralSymbol, accountObjId, recipient, keepTransaction } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const collType = this.config.COIN_TYPES[collateralSymbol];
    const [collAmount, debtAmount] = this.transaction.moveCall({
      target: `${this.config.CDP_PACKAGE_ID}::vault::get_position_data`,
      typeArguments: [collType],
      arguments: [
        this.vaultObj(collateralSymbol),
        this.transaction.pure.address(this.sender),
        this.clockObj()
      ]
    });
    const repaymentCoin = await this.splitInputCoins("VUSD", debtAmount);
    const updateRequest = this.debtorRequest({
      collateralSymbol,
      depositCoin: this.zeroCoin(collateralSymbol),
      borrowAmount: "0",
      repaymentCoin,
      withdrawAmount: collAmount,
      accountObj: accountObjId
    });
    const [collCoin, vusdCoin, response] = this.updatePosition({
      collateralSymbol,
      updateRequest
    });
    if (isDepositPointBonusCoin(collateralSymbol))
      this.emitPointForDepositAction(collateralSymbol, response);
    this.checkResponse({ collateralSymbol, response });
    this.destroyZeroCoin("VUSD", vusdCoin);
    this.transaction.transferObjects(
      [collCoin],
      _nullishCoalesce(recipient, () => ( this.transaction.pure.address(this.sender)))
    );
    const tx = this.getTransaction();
    if (!keepTransaction) this.resetTransaction();
    return tx;
  }
  /**
   * @description build and return Transaction of deposit stability pool
   * @param depositAmount: how much amount to deposit (collateral)
   * @returns Transaction
   */
  async buildDepositStabilityPoolTransaction(inputs) {
    const { depositAmount, recipient, keepTransaction } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const [vusdCoin] = await this.splitInputCoins("VUSD", depositAmount);
    const response = this.depositStabilityPool({ vusdCoin, recipient });
    this.checkResponseForStabilityPool(response);
    const tx = this.getTransaction();
    if (!keepTransaction) this.resetTransaction();
    return tx;
  }
  /**
   * @description build and return Transaction of withdraw stability pool
   * @param withdrawAmount: how much amount to withdraw (collateral)
   * @returns Transaction
   */
  async buildWithdrawStabilityPoolTransaction(inputs) {
    const { withdrawAmount: amount, accountObj, keepTransaction } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const [vusdOut, response] = this.withdrawStabilityPool({
      amount,
      accountObj
    });
    this.checkResponseForStabilityPool(response);
    this.transaction.transferObjects([vusdOut], this.sender);
    const tx = this.getTransaction();
    if (!keepTransaction) this.resetTransaction();
    return tx;
  }
  /**
   * @description build and return Transaction of withdraw stability pool
   * @param withdrawAmount: how much amount to withdraw (collateral)
   * @returns Transaction
   */
  async buildClaimStabilityPoolTransaction(inputs) {
    const { keepTransaction } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const collCoins = this.claimStabilityPool(inputs);
    this.transaction.transferObjects(collCoins, this.sender);
    const tx = this.getTransaction();
    if (!keepTransaction) this.resetTransaction();
    return tx;
  }
  /**
   * @description claim the rewards from borrow incentive program
   */
  buildClaimBorrowRewards(inputs) {
    const { accountObj, keepTransaction } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    if (!this.config.INCENTIVE_PACKAGE_ID) {
      throw new Error("No rewards to claim");
    }
    this.transaction.setSender(this.sender);
    const accountReq = this.newAccountRequest(accountObj);
    const globalConfigObj = this.transaction.sharedObjectRef(
      this.config.INCENTIVE_GLOBAL_CONFIG_OBJ
    );
    const clockObj = this.clockObj();
    Object.keys(this.config.VAULT_MAP).map((collSymbol) => {
      const vaultInfo = this.config.VAULT_MAP[collSymbol];
      const rewarders = vaultInfo.rewarders;
      const vaultObj = this.vaultObj(collSymbol);
      if (rewarders) {
        rewarders.map((rewarder) => {
          const [reward] = this.transaction.moveCall({
            target: `${this.config.INCENTIVE_PACKAGE_ID}::borrow_incentive::claim`,
            typeArguments: [
              this.config.COIN_TYPES[collSymbol],
              this.config.COIN_TYPES[rewarder.rewardSymbol]
            ],
            arguments: [
              this.transaction.sharedObjectRef(rewarder),
              globalConfigObj,
              vaultObj,
              accountReq,
              clockObj
            ]
          });
          this.transaction.transferObjects([reward], this.sender);
        });
      }
    });
    const tx = this.getTransaction();
    if (!keepTransaction) this.resetTransaction();
    return tx;
  }
  /**
   * @description claim the rewards from stability pool incentive program
   */
  buildClaimStabilityPoolRewards(inputs) {
    const { accountObj, keepTransaction } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    if (!this.config.INCENTIVE_PACKAGE_ID) {
      throw new Error("No rewards to claim");
    }
    this.transaction.setSender(this.sender);
    const accountReq = this.newAccountRequest(accountObj);
    const globalConfigObj = this.transaction.sharedObjectRef(
      this.config.INCENTIVE_GLOBAL_CONFIG_OBJ
    );
    const clockObj = this.clockObj();
    const stabilityPoolObj = this.transaction.sharedObjectRef(
      this.config.STABILITY_POOL_OBJ
    );
    this.config.STABILITY_POOL_REWARDERS.map((rewarder) => {
      const [reward] = this.transaction.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::stability_pool_incentive::claim`,
        typeArguments: [this.config.COIN_TYPES[rewarder.rewardSymbol]],
        arguments: [
          this.transaction.sharedObjectRef(rewarder),
          globalConfigObj,
          stabilityPoolObj,
          accountReq,
          clockObj
        ]
      });
      this.transaction.transferObjects([reward], this.sender);
    });
    const tx = this.getTransaction();
    if (!keepTransaction) this.resetTransaction();
    return tx;
  }
  /**
   * @description claim total rewards
   */
  buildClaimTotalRewards(inputs) {
    this.resetTransaction();
    this.buildClaimBorrowRewards({ ...inputs, keepTransaction: true });
    this.buildClaimStabilityPoolRewards({ ...inputs, keepTransaction: true });
    const tx = this.getTransaction();
    this.resetTransaction();
    return tx;
  }
  /**
   * @description instruction for emitting point request
   */
  emitPointForDepositAction(collateralSymbol, response) {
    if (this.config.POINT_PACKAGE_ID) {
      this.transaction.moveCall({
        target: `${this.config.POINT_PACKAGE_ID}::point::emit_point_for_deposit_action`,
        typeArguments: [this.config.COIN_TYPES[collateralSymbol]],
        arguments: [
          this.transaction.sharedObjectRef(
            this.config.POINT_GLOBAL_CONFIG_SHARED_OBJECT_REF
          ),
          this.transaction.sharedObjectRef(
            this.config.POINT_HANDLER_MAP[collateralSymbol]
          ),
          this.transaction.sharedObjectRef(
            this.config.VAULT_MAP[collateralSymbol].vault
          ),
          response,
          this.transaction.object.clock()
        ]
      });
    }
  }
};


















exports.COIN_DECIMALS = COIN_DECIMALS; exports.CONFIG = CONFIG; exports.ObjectContentFields = ObjectContentFields; exports.U64FromBytes = U64FromBytes; exports.VirtueClient = VirtueClient; exports.formatBigInt = formatBigInt; exports.formatUnits = formatUnits; exports.getCoinSymbol = getCoinSymbol; exports.getCoinType = getCoinType; exports.getIotaObjectData = getIotaObjectData; exports.getMoveObject = getMoveObject; exports.getObjectFields = getObjectFields; exports.getObjectGenerics = getObjectGenerics; exports.getObjectNames = getObjectNames; exports.isDepositPointBonusCoin = isDepositPointBonusCoin; exports.parseUnits = parseUnits; exports.parseVaultObject = parseVaultObject;
//# sourceMappingURL=index.js.map