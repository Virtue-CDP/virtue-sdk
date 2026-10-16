"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// src/client.ts


var _transactions = require('@iota/iota-sdk/transactions');



var _client = require('@iota/iota-sdk/client');

// src/constants/coin.ts
var COIN_DECIMALS = {
  VUSD: 6,
  IOTA: 9,
  stIOTA: 9,
  iBTC: 10,
  vIOTA: 9
};

// src/constants/object.ts
var CONFIG = {
  mainnet: {
    COIN_TYPES: {
      VUSD: "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f::vusd::VUSD",
      IOTA: "0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA",
      stIOTA: "0x346778989a9f57480ec3fee15f2cd68409c73a62112d40a3efd13987997be68c::cert::CERT",
      iBTC: "0x387c459c5c947aac7404e53ba69541c5d64f3cf96f3bc515e7f8a067fb725b54::ibtc::IBTC",
      vIOTA: "0xe4abf8b6183c106282addbfb8483a043e1a60f1fd3dd91fb727fa284306a27fd::cert::CERT"
    },
    ORIGINAL_FRAMEWORK_PACKAGE_ID: "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b",
    ORIGINAL_VUSD_PACKAGE_ID: "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f",
    ORIGINAL_ORACLE_PACKAGE_ID: "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf",
    ORIGINAL_CDP_PACKAGE_ID: "0xcdeeb40cd7ffd7c3b741f40a8e11cb784a5c9b588ce993d4ab86479072386ba1",
    ORIGINAL_STABILITY_POOL_PACKAGE_ID: "0xc7ab9b9353e23c6a3a15181eb51bf7145ddeff1a5642280394cd4d6a0d37d83b",
    ORIGINAL_INCENTIVE_PACKAGE_ID: "0x86aa277cf34776edba2ccf29b2c61a1b49d652a34c5a2321e787ca717412fd10",
    ORIGINAL_POINT_PACKAGE_ID: "0x745a1c670fd04d9e71b43a3593a855c79af5e6aa6979d1029f35ec9baa344c1e",
    FRAMEWORK_PACKAGE_ID: "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b",
    VUSD_PACKAGE_ID: "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f",
    ORACLE_PACKAGE_ID: "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf",
    CDP_PACKAGE_ID: "0xb0ca01917f84a07774397395467fc2d56de377fab9d603cb79b82f062d1f6e9a",
    STABILITY_POOL_PACKAGE_ID: "0xe50fa492446245d9dd4bc61641a4ab2e72cd1276703d6ae8e41377a046b0929b",
    INCENTIVE_PACKAGE_ID: "0x86aa277cf34776edba2ccf29b2c61a1b49d652a34c5a2321e787ca717412fd10",
    POINT_PACKAGE_ID: "0x1fcc755517ad561839bcfe7cda75459b39881d9d54a75ba972ed00d0b635fc93",
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
    VAULT_REWARDER_REGISTRY_OBJ: {
      objectId: "0x453e1e9deb1873b3a79a9e60ce0c7ffe06b28387f4b1d9f8afaf7d4c8e1c7462",
      initialSharedVersion: 196734342,
      mutable: false
    },
    POOL_REWARDER_REGISTRY_OBJ: {
      objectId: "0x7e63835296d4585c98c29afcd9cb45fe96da04cf09c8235b26135ecac245515c",
      initialSharedVersion: 196734342,
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
    VCERT_RULE_PACKAGE_ID: "0x2c3317331b7a1daa69588fb0ab73c1335dba3cb29aa3d3fdc8e80985654312cc",
    VCERT_NATIVE_POOL_OBJ: {
      objectId: "0xb435fa61ee8d5473ab36de02c88756f8c74fcc031b4e3a2fe2a6647bb06b2872",
      initialSharedVersion: 427133775,
      mutable: false
    },
    VCERT_METADATA_OBJ: {
      objectId: "0xb45b32d8d58c6499795036faa92b0561c6df089cdd4fc6ae8a0543981a698bf1",
      initialSharedVersion: 427133775,
      mutable: false
    },
    PYTH_LAZER_PACKAGE_ID: "0x8aa43bd5c14eac8de636e2106f53a1cc9dc2bc0e1a1ad51c9846a0b167552e29",
    PYTH_LAZER_STATE_OBJ: {
      objectId: "0xbfaaf85f467dd5d9af0f064afb61ceb8c5f0f27c480d4a68ccd4d85cf1c634fb",
      initialSharedVersion: 698963331,
      mutable: false
    },
    PYTH_LAZER_RULE_PACKAGE_ID: "0x24e3bae5be0985b32336a5cea2ff95304b1d5cf99dc1f28d6e0acb3eb65209bd",
    PYTH_LAZER_RULE_CONFIG_OBJ: {
      objectId: "0xb37d447c7fa5ac24c740ef49abe828ce34c6d2bf227879034a97f94afbb0e6b4",
      initialSharedVersion: 821170473,
      mutable: false
    },
    PYTH_LAZER_FEED_IDS: {
      IOTA: 70,
      iBTC: 1
    },
    PYTH_LAZER_CHANNEL: "fixed_rate@1000ms",
    POINT_GLOBAL_CONFIG_OBJ: {
      objectId: "0x86f95e88bcc50edbd930153079db969e92f050c887d7d4b4642a08cbb04d8787",
      initialSharedVersion: 126182186,
      mutable: false
    },
    POINT_MANAGER_OBJ: {
      objectId: "0xc90ae64074625de2380317105548d930313766875eabfc3aa1a26e7d387dd45c",
      initialSharedVersion: 153071646,
      mutable: false
    },
    STABILITY_POOL_TABLE_ID: "0x6dd808c50bab98757f7523562bdef7d33d506bb447ea9e708072bf13a5e29f02",
    STABILITY_POOL_REWARDERS: [
      {
        objectId: "0xd34d8de1558ebd521382a92fa4824bb00cf97cdfaba2a0a9843f2e5a03b4e430",
        mutable: true,
        initialSharedVersion: 196762084,
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
        }
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
        },
        rewarders: [
          {
            objectId: "0x5752324b10b19792528af301bd65128f22dc30562e8a67b9e33da49bd7aff1d9",
            initialSharedVersion: 196762083,
            mutable: true,
            rewardSymbol: "stIOTA"
          }
        ]
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
        }
      },
      vIOTA: {
        priceAggregater: {
          objectId: "0xe5fbc659022066c53f8143e42c604b561719990a1eca76e06bb284f8791d8cc9",
          initialSharedVersion: 432886623,
          mutable: false
        },
        vault: {
          objectId: "0x53b6405d2672be1e73f8ddea1766dbda57f1fed677be58fbfedc9fdddaafdd26",
          initialSharedVersion: 437023773,
          mutable: true
        }
      }
    },
    PSM_PACKAGE_ID: "0x3553aff52bad6b066d76bfe0d7a397772a83eb9bea8a8c9ae6b72d75c52defe3",
    PSM_WITNESS_TYPE: "0x3553aff52bad6b066d76bfe0d7a397772a83eb9bea8a8c9ae6b72d75c52defe3::witness::VirtuePSM",
    PSM_POOLS: {
      USDT0: {
        coinType: "0x25afeacdd3b0e757ae40aa4b9852261003e1dffeeb37d2c4f2904bb809807ac9::usdt0::USDT0",
        decimal: 6,
        pool: {
          objectId: "0xaf5fe5146d22ae8521e7597d6933a11eff09886d7ed292145ab264b738084465",
          initialSharedVersion: 821170474,
          mutable: true
        }
      }
    }
  },
  testnet: {
    COIN_TYPES: {
      VUSD: "0x3fbd238eea1f4ce7d797148954518fce853f24a8be01b47388bfa2262602fefa::vusd::VUSD",
      IOTA: "0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA",
      stIOTA: "0x14f9e69c0076955d5a056260c9667edab184650dba9919f168a37030dd956dc6::cert::CERT",
      iBTC: "",
      vIOTA: ""
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
    POINT_GLOBAL_CONFIG_OBJ: {
      objectId: "",
      initialSharedVersion: 0,
      mutable: false
    },
    POINT_MANAGER_OBJ: {
      objectId: "",
      initialSharedVersion: 0,
      mutable: false
    },
    VCERT_RULE_PACKAGE_ID: "",
    VCERT_NATIVE_POOL_OBJ: {
      objectId: "",
      initialSharedVersion: 0,
      mutable: false
    },
    VCERT_METADATA_OBJ: {
      objectId: "",
      initialSharedVersion: 0,
      mutable: false
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
        }
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
      // No iBTC on testnet: empty refs, like vIOTA below. The ids iBTC used to
      // carry here were mainnet objects, which a testnet RPC cannot resolve.
      iBTC: {
        priceAggregater: {
          objectId: "",
          initialSharedVersion: 0,
          mutable: false
        },
        vault: {
          objectId: "0",
          initialSharedVersion: 0,
          mutable: false
        }
      },
      vIOTA: {
        priceAggregater: {
          objectId: "",
          initialSharedVersion: 0,
          mutable: false
        },
        vault: {
          objectId: "0",
          initialSharedVersion: 0,
          mutable: false
        },
        rewarders: []
      }
    }
  }
};

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

// src/utils/psm.ts

var WAD = 10n ** 9n;
var feeRateValue = (rate) => BigInt(Math.round(rate * 1e9));
var ceilMul = (rateValue, amount) => (rateValue * amount + WAD - 1n) / WAD;
var MAX_POOL_DECIMAL = 9;
var conversionValue = (poolDecimal) => {
  if (!Number.isInteger(poolDecimal) || poolDecimal < 0 || poolDecimal > MAX_POOL_DECIMAL) {
    throw new Error(`Unsupported PSM pool decimal: ${poolDecimal}`);
  }
  const vusdDecimal = COIN_DECIMALS.VUSD;
  return vusdDecimal >= poolDecimal ? 10n ** BigInt(vusdDecimal - poolDecimal) * WAD : WAD / 10n ** BigInt(poolDecimal - vusdDecimal);
};
var feeRatesFor = (pool, partner) => partner && pool.partnerFeeRates[_utils.normalizeIotaAddress.call(void 0, partner)] || pool;
var quotePsmSwap = (pool, direction, amountIn, partner) => {
  const conversion = conversionValue(pool.decimal);
  const rates = feeRatesFor(pool, partner);
  if (direction === "in") {
    const minted = amountIn * conversion / WAD;
    const fee2 = ceilMul(feeRateValue(rates.swapInFeeRate), minted);
    const error2 = minted > BigInt(pool.mintableVusd) ? "SUPPLY_LIMIT" : void 0;
    return { direction, amountIn, amountOut: minted - fee2, fee: fee2, error: error2 };
  }
  const assetOut = amountIn * WAD / conversion;
  const fee = ceilMul(feeRateValue(rates.swapOutFeeRate), assetOut);
  const error = amountIn > BigInt(pool.moduleVusdSupply) || assetOut > BigInt(pool.balance) || amountIn > BigInt(pool.vusdSupply) ? "POOL_NOT_ENOUGH" : void 0;
  return { direction, amountIn, amountOut: assetOut - fee, fee, error };
};
var quotePsmSwapExactOut = (pool, direction, amountOut, partner) => {
  const quote = (amountIn) => quotePsmSwap(pool, direction, amountIn, partner);
  if (amountOut <= 0n) return quote(0n);
  const conversion = conversionValue(pool.decimal);
  const feeFree = direction === "in" ? amountOut * WAD / conversion : amountOut * conversion / WAD;
  let hi = feeFree + 1n;
  for (let i = 0; quote(hi).amountOut < amountOut; i++) {
    if (i >= 64) return { ...quote(hi), amountOut: 0n };
    hi *= 2n;
  }
  let lo = 0n;
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    if (quote(mid).amountOut >= amountOut) hi = mid;
    else lo = mid + 1n;
  }
  return quote(lo);
};

// src/client.ts
var _bcs = require('@iota/iota-sdk/bcs');







var LAZER_FETCH_TIMEOUT_MS = 5e3;
var DEFAULT_LAZER_ENDPOINTS = Object.freeze([
  "https://pyth-lazer-0.dourolabs.app",
  "https://pyth-lazer-1.dourolabs.app",
  "https://pyth-lazer-2.dourolabs.app"
]);
var LAZER_PROPERTIES = Object.freeze([
  "price",
  "exponent",
  "confidence",
  "feedUpdateTimestamp",
  "marketSession"
]);
var BASIC_PRICE_SYMBOLS = ["IOTA", "iBTC"];
var DERIVED_FROM = {
  stIOTA: "IOTA",
  vIOTA: "IOTA"
};
var basicSymbolOf = (symbol) => _nullishCoalesce(DERIVED_FROM[symbol], () => ( symbol));
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
var normalizeTypeName = (type) => {
  const [address, ...rest] = type.split("::");
  return [_utils.normalizeIotaAddress.call(void 0, address).replace(/^0x/, ""), ...rest].join("::");
};
var noPriceError = (symbol, withoutPriceRejection) => new Error(
  `No oracle rule could price ${symbol}: borrowing, and withdrawing while in debt, require a price.` + (withoutPriceRejection ? ` A withdrawal without a price was rejected on chain: ${withoutPriceRejection}` : "")
);
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
var VirtueClient = class _VirtueClient {
  constructor(inputs) {
    const { network, rpcUrl, sender, pythLazer } = _nullishCoalesce(inputs, () => ( {}));
    this.pythLazer = _nullishCoalesce(pythLazer, () => ( {}));
    this.network = _nullishCoalesce(network, () => ( "mainnet"));
    this.config = CONFIG[this.network];
    this.rpcEndpoint = _nullishCoalesce(rpcUrl, () => ( _client.getFullnodeUrl.call(void 0, _nullishCoalesce(network, () => ( "mainnet")))));
    this.sender = sender ? _utils.normalizeIotaAddress.call(void 0, sender) : DUMMY_ADDRESS;
    this.iotaClient = new (0, _client.IotaClient)({ url: this.rpcEndpoint });
    this.transaction = new (0, _transactions.Transaction)();
  }
  /* ----- Getter ----- */
  /**
   * @description Get this.iotaClient
   */
  getIotaClient() {
    return this.iotaClient;
  }
  getAllCollateralSymbol() {
    return Object.keys(this.config.VAULT_MAP);
  }
  /* ----- Query ----- */
  /**
   * @description Price every collateral by dev-inspecting its aggregation and
   * reading the emitted `PriceAggregated` event.
   *
   * Each collateral is inspected on its own — a derived one together with the
   * basic price it needs — so nothing that fails to price can hide another
   * price: not iBTC hiding IOTA, and not a broken vIOTA pool hiding IOTA or
   * stIOTA.
   *
   * A symbol is **absent** from the result when no oracle rule could price it,
   * and the derived symbols go with it when their basic price is missing. The
   * return type is `Partial` to say so; treat a missing entry as "no price
   * available right now", never as zero.
   *
   * A symbol whose inspection could not be performed at all (an RPC failure) is
   * left out the same way, as in `aggregatePrices`. If every inspection that
   * actually reached the RPC failed that way, the RPC is unreachable, and that
   * is thrown rather than reported as an empty set of prices.
   */
  async getCollateralPrices() {
    const prepared = await this.prepareOracleUpdates();
    const pricePrecision = 10 ** 9;
    const symbols = this.priceableSymbols();
    const settled = await Promise.allSettled(
      symbols.map((symbol) => this.inspectAggregation(prepared, [symbol]))
    );
    const rejected = settled.filter((r) => r.status === "rejected");
    const reached = settled.filter(
      (r) => r.status === "fulfilled" && r.value !== null
    );
    if (rejected.length > 0 && reached.length === 0) {
      throw new Error(
        "Could not read collateral prices: no RPC dev-inspection could be performed. This is a transport failure, not an oracle one.",
        { cause: rejected[0].reason }
      );
    }
    return symbols.reduce(
      (result, coinSymbol, i) => {
        const outcome = settled[i];
        if (outcome.status !== "fulfilled") return result;
        const inspect = outcome.value;
        if (!inspect || inspect.effects.status.status !== "success") {
          return result;
        }
        const coinType = this.config.COIN_TYPES[coinSymbol];
        const priceEvent = (_nullishCoalesce(inspect.events, () => ( []))).findLast(
          (e) => _utils.normalizeStructTag.call(void 0, e.type).includes(_utils.normalizeStructTag.call(void 0, coinType))
        );
        return priceEvent ? {
          ...result,
          [coinSymbol]: +priceEvent.parsedJson.result / pricePrecision
        } : result;
      },
      {}
    );
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
    return { vusdBalance: Number(fields.vusd_balance) };
  }
  /**
   * @description Get every PSM pool's live state, with the VUSD the PSM module
   * may still mint. Empty where the network has no PSM.
   */
  async getPsmPools() {
    const pools = Object.entries(_nullishCoalesce(this.config.PSM_POOLS, () => ( {})));
    if (pools.length === 0 || !this.config.PSM_WITNESS_TYPE) return {};
    const [treasuryRes, ...poolRes] = await this.iotaClient.multiGetObjects({
      ids: [
        this.config.TREASURY_OBJ.objectId,
        ...pools.map(([, info]) => info.pool.objectId)
      ],
      options: { showContent: true }
    });
    const treasury = getObjectFields(treasuryRes);
    if (!treasury) throw new Error("Could not read the VUSD treasury");
    const witness = normalizeTypeName(this.config.PSM_WITNESS_TYPE);
    const supplyEntry = (_nullishCoalesce(_optionalChain([treasury, 'access', _17 => _17.module_supply_map, 'optionalAccess', _18 => _18.fields, 'optionalAccess', _19 => _19.contents]), () => ( []))).find((e) => normalizeTypeName(e.fields.key.fields.name) === witness);
    if (!supplyEntry) {
      throw new Error(
        `The VUSD treasury has no supply entry for ${this.config.PSM_WITNESS_TYPE}`
      );
    }
    const limit = BigInt(supplyEntry.fields.value.fields.limit);
    const supply = BigInt(supplyEntry.fields.value.fields.supply);
    const mintableVusd = (limit > supply ? limit - supply : 0n).toString();
    const feeRates = (feeConfig) => ({
      swapInFeeRate: Number(feeConfig.swap_in_fee_rate.fields.value) / 1e9,
      swapOutFeeRate: Number(feeConfig.swap_out_fee_rate.fields.value) / 1e9
    });
    const result = {};
    pools.forEach(([coin, info], i) => {
      const fields = getObjectFields(poolRes[i]);
      if (!fields) return;
      result[coin] = {
        coin,
        coinType: info.coinType,
        decimal: Number(fields.decimal),
        balance: String(fields.balance),
        vusdSupply: String(fields.vusd_supply),
        ...feeRates(fields.default_fee_config.fields),
        partnerFeeRates: Object.fromEntries(
          (_nullishCoalesce(_optionalChain([fields, 'access', _20 => _20.partner_fee_configs, 'optionalAccess', _21 => _21.fields, 'optionalAccess', _22 => _22.contents]), () => ( []))).map((e) => [
            _utils.normalizeIotaAddress.call(void 0, e.fields.key),
            feeRates(e.fields.value.fields)
          ])
        ),
        mintableVusd,
        moduleVusdSupply: supply.toString()
      };
    });
    if (Object.keys(result).length === 0) {
      throw new Error("Could not read any PSM pool");
    }
    return result;
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
    if (_optionalChain([res, 'access', _23 => _23.data, 'optionalAccess', _24 => _24.content, 'optionalAccess', _25 => _25.dataType]) !== "moveObject") {
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
        target: `${this.config.INCENTIVE_PACKAGE_ID}::pool_incentive::realtime_reward_amount`,
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
    if (!res.results || !_optionalChain([res, 'access', _26 => _26.results, 'access', _27 => _27[0], 'optionalAccess', _28 => _28.returnValues])) {
      return {
        positions: [],
        nextCursor: null
      };
    }
    const [positionBytes, nextCursorBytes] = res.results[0].returnValues;
    const positions = _bcs.bcs.vector(CDP_POSITION_DATA).parse(Uint8Array.from(positionBytes ? positionBytes[0] : [])).map((pos) => {
      return {
        collateralType: coinType,
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
    if (!res.results || !_optionalChain([res, 'access', _29 => _29.results, 'access', _30 => _30[0], 'optionalAccess', _31 => _31.returnValues])) {
      return {
        positions: [],
        nextCursor: null
      };
    }
    const [positionVec, nextCursorVec] = res.results[0].returnValues;
    const positions = _bcs.bcs.vector(POOL_POSITION_DATA).parse(Uint8Array.from(positionVec ? positionVec[0] : [])).map((pos) => {
      const collAmounts = {};
      pos.coll_types.map((t, idx) => {
        return collAmounts["0x" + t.name] = Number(pos.coll_amounts[idx]);
      });
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
        return this.splitCoinsByType(
          this.config.COIN_TYPES[coinSymbol],
          ...amounts
        );
      }
    }
  }
  /**
   * @description split the needed coins of any non-IOTA coin type, merging the
   * sender's coins of that type first. Everything that can fail (the coin
   * reads, the balance check) runs before anything is written, since a
   * `Transaction` cannot be rolled back.
   */
  async splitCoinsByType(coinType, ...amounts) {
    const total = amounts.every((a) => typeof a === "string") ? amounts.reduce((sum, a) => sum + BigInt(a), 0n) : void 0;
    if (total === 0n) {
      const zero = this.transaction.moveCall({
        target: "0x2::coin::zero",
        typeArguments: [coinType]
      });
      if (amounts.length <= 1) return zero;
      const out2 = this.transaction.splitCoins(
        zero,
        amounts.map(() => this.transaction.pure.u64(0))
      );
      this.transaction.moveCall({
        target: "0x2::coin::destroy_zero",
        typeArguments: [coinType],
        arguments: [zero]
      });
      return out2;
    }
    const userCoins = [];
    let held = 0n;
    let cursor = void 0;
    do {
      const page = await this.iotaClient.getCoins({
        owner: this.sender,
        coinType,
        cursor
      });
      userCoins.push(...page.data);
      held += page.data.reduce((sum, coin) => sum + BigInt(coin.balance), 0n);
      cursor = page.hasNextPage ? page.nextCursor : null;
    } while (cursor && (total === void 0 || held < total));
    if (userCoins.length === 0 || total !== void 0 && held < total) {
      throw new Error("Not enough balance");
    }
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
  vaultObj(collateralSymbol) {
    return this.transaction.sharedObjectRef(
      this.config.VAULT_MAP[collateralSymbol].vault
    );
  }
  stabilityPoolObj() {
    return this.transaction.sharedObjectRef(this.config.STABILITY_POOL_OBJ);
  }
  /** The PSM package and `coin`'s pool, or a throw where there is no PSM. */
  psmPool(coin) {
    const pool = _optionalChain([this, 'access', _32 => _32.config, 'access', _33 => _33.PSM_POOLS, 'optionalAccess', _34 => _34[coin]]);
    if (!this.config.PSM_PACKAGE_ID || !pool) {
      throw new Error(`No PSM pool for ${coin} on ${this.network}`);
    }
    return { packageId: this.config.PSM_PACKAGE_ID, ...pool };
  }
  /**
   * `&Option<AccountRequest>` for the PSM's partner fee lookup: `none` pays the
   * default rates.
   */
  psmPartner(accountRequest) {
    const type = `${this.config.ORIGINAL_FRAMEWORK_PACKAGE_ID}::account::AccountRequest`;
    return accountRequest ? this.transaction.moveCall({
      target: `0x1::option::some`,
      typeArguments: [type],
      arguments: [accountRequest]
    }) : this.transaction.moveCall({
      target: `0x1::option::none`,
      typeArguments: [type]
    });
  }
  /**
   * @description PSM swap in: deposit `coin` and mint VUSD 1:1 after decimal
   * scaling, less the swap-in fee (taken in VUSD)
   * @param assetCoin: Coin<coin> to deposit
   * @param accountRequest (optional): a partner's AccountRequest for its fee rate
   * @returns Coin<VUSD>
   */
  psmSwapIn(inputs) {
    const { coin, assetCoin, accountRequest } = inputs;
    const { packageId, coinType, pool } = this.psmPool(coin);
    const [vusdCoin] = this.transaction.moveCall({
      target: `${packageId}::pool::swap_in`,
      typeArguments: [coinType],
      arguments: [
        this.transaction.sharedObjectRef(pool),
        this.treasuryObj(),
        assetCoin,
        this.psmPartner(accountRequest)
      ]
    });
    return vusdCoin;
  }
  /**
   * @description PSM swap out: burn VUSD and withdraw `coin` 1:1 after decimal
   * scaling, less the swap-out fee (taken in `coin`)
   * @param vusdCoin: Coin<VUSD> to burn
   * @param accountRequest (optional): a partner's AccountRequest for its fee rate
   * @returns Coin<coin>
   */
  psmSwapOut(inputs) {
    const { coin, vusdCoin, accountRequest } = inputs;
    const { packageId, coinType, pool } = this.psmPool(coin);
    const [assetCoin] = this.transaction.moveCall({
      target: `${packageId}::pool::swap_out`,
      typeArguments: [coinType],
      arguments: [
        this.transaction.sharedObjectRef(pool),
        this.treasuryObj(),
        vusdCoin,
        this.psmPartner(accountRequest)
      ]
    });
    return assetCoin;
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
  newPriceCollector(collateralSymbol, tx = this.transaction) {
    return tx.moveCall({
      target: `${this.config.ORACLE_PACKAGE_ID}::collector::new`,
      typeArguments: [this.config.COIN_TYPES[collateralSymbol]]
    });
  }
  /**
   * @description Resolve everything the oracle rules need from the network,
   * without writing anything to the transaction.
   *
   * Building a position is not reversible. Commands can only be appended to a
   * `Transaction`, never removed — `getData()` returns a snapshot and the
   * builder behind it is private — and swapping in a rebuilt object is no
   * substitute, since that changes the identity a caller is composing against
   * and drops that instance's plugins and intent resolvers. So everything that
   * can fail happens here, before the first command is written, and applying the
   * result afterwards is pure transaction building.
   *
   * The prepared data is then carried into the aggregation rather than fetched
   * again. Probing and refetching would leave a window where the preflight
   * passes and the real fetch fails, throwing only after the transaction had
   * been written to — and it would pay for the same work twice.
   *
   * Each basic symbol gets its own Lazer request. Lazer rejects a whole request
   * when any one feed in it is not entitled, so a shared request would let one
   * feed's entitlement decide every price.
   */
  async prepareOracleUpdates(basicSymbols = BASIC_PRICE_SYMBOLS) {
    const entries = await Promise.all(
      basicSymbols.filter((symbol) => this.lazerRuleFeeds(symbol)).map(
        async (symbol) => [
          symbol,
          await this.prepareLazer(this.config.PYTH_LAZER_FEED_IDS[symbol])
        ]
      )
    );
    const lazer = {};
    for (const [symbol, update] of entries) {
      if (update) lazer[symbol] = update;
    }
    return { lazer };
  }
  /**
   * @description The configured collaterals that have an oracle path at all:
   * the basic symbols, and the symbols derived from one of them.
   */
  priceableSymbols() {
    return this.getAllCollateralSymbol().filter(
      (symbol) => BASIC_PRICE_SYMBOLS.includes(basicSymbolOf(symbol))
    );
  }
  /**
   * @description Whether the Lazer rule is wired up for a symbol at all.
   *
   * Config alone decides whether the rule is *added*. The rule abstains on a
   * stale or incomplete update rather than aborting, but it aborts on a coin type
   * it has no feed id for (`EUnsupportedCoinType`). Live config is aligned today,
   * and `canPriceCollateral` dev-inspects the real aggregation rather than
   * trusting that, so a drifted rule config surfaces as "cannot price" instead
   * of a failed transaction.
   */
  lazerRuleFeeds(symbol) {
    return _optionalChain([this, 'access', _35 => _35.config, 'access', _36 => _36.PYTH_LAZER_FEED_IDS, 'optionalAccess', _37 => _37[symbol]]) !== void 0 && !!this.config.PYTH_LAZER_PACKAGE_ID && !!this.config.PYTH_LAZER_STATE_OBJ && !!this.config.PYTH_LAZER_RULE_PACKAGE_ID && !!this.config.PYTH_LAZER_RULE_CONFIG_OBJ;
  }
  /**
   * @description Build the aggregation for `symbols` on a transaction of its own
   * and dev-inspect it. Returns `null` when the prepared data cannot even build
   * a price for every symbol asked about (nothing to inspect).
   *
   * Built on a transaction of its own. Assigning a scratch transaction to
   * `this.transaction` for the duration would expose it through
   * `getTransaction()` and, worse, let a concurrent build or
   * `resetTransaction()` land in that window only to be overwritten when this
   * restored the old one.
   *
   * Transport failures propagate; callers decide what they mean.
   */
  async inspectAggregation(prepared, symbols) {
    const probe = new (0, _transactions.Transaction)();
    const priceResults = this.aggregatePricesWith(prepared, probe, symbols);
    if (!symbols.every((symbol) => priceResults[symbol])) return null;
    return this.iotaClient.devInspectTransactionBlock({
      sender: DUMMY_ADDRESS,
      transactionBlock: probe
    });
  }
  /**
   * @description Whether the prepared data can actually price this collateral.
   *
   * Answered by building the aggregation and dev-inspecting it, rather than by
   * reasoning about which rules are configured. Configuration is not the
   * question — having a Lazer update says nothing about whether the rule will
   * accept it. An update signed too long ago, or one whose confidence band is
   * wider than the rule's gate, makes the rule abstain, `aggregate` fails its
   * threshold with `err_total_weight_not_enough`, and a predicate that had said
   * "yes" would already have written a doomed position onto the caller's
   * transaction. The same inspection runs the on-chain verify, so an update the
   * verifier rejects is caught here too.
   *
   * Running the real thing also covers what a predicate would miss: a rule
   * config drifted from the coin types asked about, or any future rule with its
   * own abort conditions.
   *
   * A dev-inspection that *executes* and reports failure means no rule can
   * price this collateral. A dev-inspection that could not run at all means
   * nothing of the sort, so transport failures are raised rather than folded
   * into a `false` that would blame the oracles for a throttled RPC.
   */
  async canPriceCollateral(collateralSymbol, prepared) {
    let inspect;
    try {
      inspect = await this.inspectAggregation(prepared, [collateralSymbol]);
    } catch (error) {
      throw new Error(
        `Could not determine whether ${collateralSymbol} is priceable: the RPC dev-inspection could not be performed. This is a transport failure, not an oracle one.`,
        { cause: error }
      );
    }
    return _optionalChain([inspect, 'optionalAccess', _38 => _38.effects, 'access', _39 => _39.status, 'access', _40 => _40.status]) === "success";
  }
  /**
   * @description Fetch one signed Lazer update for `feedId`, without touching
   * the current transaction.
   *
   * Lazer is pull-based: nothing is stored on chain, so the signed update has to
   * travel in the same PTB as the read, through
   * `pyth_lazer::parse_and_verify_le_ecdsa_update`.
   *
   * No on-chain check happens here. Whether the update verifies and prices is
   * settled by the single dev-inspection of the real aggregation that every
   * caller runs anyway, which includes the verify; probing the verify alone
   * first would only spend time inside the rule's freshness window.
   *
   * Endpoints are tried in order. Never throws: no access configured, an
   * endpoint outage, a slow or unauthorised response or malformed bytes all
   * move on to the next endpoint, and come back `null` when none answered.
   */
  async prepareLazer(feedId) {
    const channel = this.config.PYTH_LAZER_CHANNEL;
    if (!channel) return null;
    const configured = _nullishCoalesce(this.pythLazer.endpoint, () => ( DEFAULT_LAZER_ENDPOINTS));
    const endpoints = (Array.isArray(configured) ? configured : [configured]).map((endpoint) => endpoint.replace(/\/+$/, ""));
    const headers = {
      "Content-Type": "application/json"
    };
    if (this.pythLazer.apiKey) {
      headers.Authorization = `Bearer ${this.pythLazer.apiKey}`;
    }
    const body = JSON.stringify({
      priceFeedIds: [feedId],
      properties: LAZER_PROPERTIES,
      formats: ["leEcdsa"],
      jsonBinaryEncoding: "hex",
      channel
    });
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(`${endpoint}/v1/latest_price`, {
          method: "POST",
          headers,
          body,
          signal: AbortSignal.timeout(LAZER_FETCH_TIMEOUT_MS)
        });
        if (!res.ok) continue;
        const update = this.lazerUpdateFromResponse(await res.json());
        if (update) return update;
      } catch (e2) {
      }
    }
    return null;
  }
  /**
   * @description Pull the signed `leEcdsa` bytes out of a `/v1/latest_price`
   * response body, or `null` when it carries none. Pure — no I/O.
   *
   * `Buffer` is a Node global that browser bundles do not provide, and a
   * ReferenceError here would be swallowed by the fail-soft catch around
   * preparation — quietly disabling the only price source there is, for every
   * dApp consumer. `fromHEX` works in both runtimes.
   */
  lazerUpdateFromResponse(body) {
    const hex = _optionalChain([body, 'optionalAccess', _41 => _41.leEcdsa, 'optionalAccess', _42 => _42.data]);
    if (typeof hex !== "string" || hex.length === 0) return null;
    try {
      return _utils.fromHEX.call(void 0, hex);
    } catch (e3) {
      return null;
    }
  }
  /**
   * @description Append the Lazer verify call and return the verified `Update`.
   * Pure — no I/O.
   */
  verifyLazerUpdate(tx, update) {
    return tx.moveCall({
      target: `${this.config.PYTH_LAZER_PACKAGE_ID}::pyth_lazer::parse_and_verify_le_ecdsa_update`,
      arguments: [
        tx.sharedObjectRef(this.config.PYTH_LAZER_STATE_OBJ),
        tx.object.clock(),
        tx.pure.vector("u8", update)
      ]
    });
  }
  /**
   * @description Price every collateral that can be priced right now, into the
   * current transaction.
   *
   * Each collateral is dev-inspected on its own first — a derived one together
   * with the basic price it needs — and only those that price are added,
   * because a PTB is all-or-nothing: one abort would otherwise take every other
   * price, and whatever the caller bundles with them, down too. A broken vIOTA
   * pool therefore leaves IOTA and stIOTA in place. Never throws — a collateral
   * whose inspection could not be performed is left out.
   *
   * @return PriceResult per collateral that could be priced
   */
  async aggregatePrices() {
    const prepared = await this.prepareOracleUpdates();
    const verdicts = await Promise.all(
      this.priceableSymbols().map(async (symbol) => {
        try {
          const inspect = await this.inspectAggregation(prepared, [symbol]);
          return _optionalChain([inspect, 'optionalAccess', _43 => _43.effects, 'access', _44 => _44.status, 'access', _45 => _45.status]) === "success" ? [symbol] : [];
        } catch (e4) {
          return [];
        }
      })
    );
    return this.aggregatePricesWith(
      prepared,
      this.transaction,
      verdicts.flat()
    );
  }
  /**
   * @description The transaction-building half of the price calls, working only
   * from data already fetched by `prepareOracleUpdates`. Pure — no I/O.
   *
   * Builds only what `symbols` need: each requested symbol's basic symbol, then
   * the requested derived symbols. A borrow against IOTA therefore carries
   * nothing of iBTC's, and the reverse.
   *
   * Kept separate so a position build can settle whether its collateral is
   * priceable before writing anything, then build from that exact same prepared
   * data — no second fetch, and so no window for the answer to change in
   * between.
   */
  aggregatePricesWith(prepared, tx, symbols) {
    const basics = BASIC_PRICE_SYMBOLS.filter(
      (basic) => symbols.some((symbol) => basicSymbolOf(symbol) === basic)
    );
    const results = {};
    for (const symbol of basics) {
      const update = prepared.lazer[symbol];
      if (!update || !this.lazerRuleFeeds(symbol)) continue;
      const coinType = this.config.COIN_TYPES[symbol];
      const lazerUpdate = this.verifyLazerUpdate(tx, update);
      const collector = this.newPriceCollector(symbol, tx);
      tx.moveCall({
        target: `${this.config.PYTH_LAZER_RULE_PACKAGE_ID}::pyth_lazer_rule::feed`,
        typeArguments: [coinType],
        arguments: [
          collector,
          tx.sharedObjectRef(this.config.PYTH_LAZER_RULE_CONFIG_OBJ),
          tx.object.clock(),
          lazerUpdate
        ]
      });
      results[symbol] = tx.moveCall({
        target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
        typeArguments: [coinType],
        arguments: [
          tx.sharedObjectRef(this.config.VAULT_MAP[symbol].priceAggregater),
          collector
        ]
      });
    }
    const iotaPriceResult = results.IOTA;
    if (!iotaPriceResult) return results;
    if (symbols.includes("stIOTA")) {
      const stIotaCollector = this.newPriceCollector("stIOTA", tx);
      tx.moveCall({
        target: `${this.config.CERT_RULE_PACKAGE_ID}::cert_rule::feed`,
        arguments: [
          stIotaCollector,
          iotaPriceResult,
          tx.sharedObjectRef(this.config.CERT_NATIVE_POOL_OBJ),
          tx.sharedObjectRef(this.config.CERT_METADATA_OBJ)
        ]
      });
      results.stIOTA = tx.moveCall({
        target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
        typeArguments: [this.config.COIN_TYPES.stIOTA],
        arguments: [
          tx.sharedObjectRef(this.config.VAULT_MAP.stIOTA.priceAggregater),
          stIotaCollector
        ]
      });
    }
    if (symbols.includes("vIOTA")) {
      const vIotaCollector = this.newPriceCollector("vIOTA", tx);
      tx.moveCall({
        target: `${this.config.VCERT_RULE_PACKAGE_ID}::vcert_rule::feed`,
        arguments: [
          vIotaCollector,
          iotaPriceResult,
          tx.sharedObjectRef(this.config.VCERT_NATIVE_POOL_OBJ),
          tx.sharedObjectRef(this.config.VCERT_METADATA_OBJ)
        ]
      });
      results.vIOTA = tx.moveCall({
        target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
        typeArguments: [this.config.COIN_TYPES.vIOTA],
        arguments: [
          tx.sharedObjectRef(this.config.VAULT_MAP.vIOTA.priceAggregater),
          vIotaCollector
        ]
      });
    }
    return results;
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
   * @description Get a request to Mange Position
   * @param collateralSymbol: collateral coin symbol , e.g "IOTA"
   * @param depositCoin: collateral input coin
   * @param borrowAmount: the amount to borrow
   * @param repaymentCoin: repyment input coin (always VUSD)
   * @param withdrawAmount: the amount to withdraw
   * @param accountObj (optional): account object id or transaction argument
   * @returns UpdateRequest
   */
  donorRequest(inputs) {
    const { collateralSymbol, debtor, depositCoin, repaymentCoin } = inputs;
    const coinType = this.config.COIN_TYPES[collateralSymbol];
    const vaultId = this.config.VAULT_MAP[collateralSymbol].vault.objectId;
    return this.transaction.moveCall({
      target: `${this.config.CDP_PACKAGE_ID}::request::donor_request`,
      typeArguments: [coinType],
      arguments: [
        this.treasuryObj(),
        this.transaction.pure.id(vaultId),
        this.transaction.pure.address(debtor),
        depositCoin,
        repaymentCoin
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
        this.transaction.object.clock(),
        priceResultOpt,
        updateRequest
      ]
    });
    return [collCoin, vusdCoin, response];
  }
  /**
   * @description check and destroy UpdateRequest
   * @param collateralSymbol: "IOTA" or "stIOTA"
   * @param response: UpdateRequest generated by update_position
   */
  checkRequest(inputs) {
    const { collateralSymbol, request } = inputs;
    let updateRequest = request;
    const vaultObj = this.vaultObj(collateralSymbol);
    if (this.config.INCENTIVE_PACKAGE_ID) {
      const collateralType = this.config.COIN_TYPES[collateralSymbol];
      const rewarders = this.config.VAULT_MAP[collateralSymbol].rewarders;
      const registryObj = this.transaction.sharedObjectRef(
        this.config.VAULT_REWARDER_REGISTRY_OBJ
      );
      const clockObj = this.transaction.object.clock();
      const checker = this.transaction.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::borrow_incentive::new_checker`,
        typeArguments: [collateralType],
        arguments: [registryObj, updateRequest]
      });
      (_nullishCoalesce(rewarders, () => ( []))).map((rewarder) => {
        const rewardType = this.config.COIN_TYPES[rewarder.rewardSymbol];
        this.transaction.moveCall({
          target: `${this.config.INCENTIVE_PACKAGE_ID}::borrow_incentive::update`,
          typeArguments: [collateralType, rewardType],
          arguments: [
            registryObj,
            checker,
            vaultObj,
            this.transaction.sharedObjectRef(rewarder),
            clockObj
          ]
        });
      });
      const [responseAfterIncentive] = this.transaction.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::borrow_incentive::destroy_checker`,
        typeArguments: [collateralType],
        arguments: [registryObj, checker]
      });
      updateRequest = responseAfterIncentive;
    }
    return updateRequest;
  }
  /**
   * @description check and destroy UpdateResponse
   * @param collateralSymbol: "IOTA" or "stIOTA"
   * @param response: UpdateResponse generated by update_position
   */
  checkResponse(inputs) {
    const { collateralSymbol, response } = inputs;
    const vaultObj = this.vaultObj(collateralSymbol);
    this.emitPoint(collateralSymbol, response);
    this.transaction.moveCall({
      target: `${this.config.CDP_PACKAGE_ID}::vault::destroy_response`,
      typeArguments: [this.config.COIN_TYPES[collateralSymbol]],
      arguments: [vaultObj, this.treasuryObj(), response]
    });
  }
  /**
   * @description deposit to stability pool
   * @param vusdCoin: coin of VUSD
   * @param recipient (optional): deposit for recipient instead of sender
   * @returns PositionResponse
   */
  depositStabilityPool(inputs) {
    const { vusdCoin, accountRequest, accountObj } = inputs;
    const accountReq = accountRequest ? accountRequest : this.newAccountRequest(accountObj);
    return this.transaction.moveCall({
      target: `${this.config.STABILITY_POOL_PACKAGE_ID}::stability_pool::deposit_and_update`,
      arguments: [
        this.stabilityPoolObj(),
        this.transaction.object.clock(),
        accountReq,
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
      target: `${this.config.STABILITY_POOL_PACKAGE_ID}::stability_pool::withdraw_and_update`,
      arguments: [
        this.stabilityPoolObj(),
        this.transaction.object.clock(),
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
      const registryObj = this.transaction.sharedObjectRef(
        this.config.POOL_REWARDER_REGISTRY_OBJ
      );
      const clockObj = this.transaction.object.clock();
      const checker = this.transaction.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::pool_incentive::new_checker`,
        arguments: [registryObj, positionResponse]
      });
      (_nullishCoalesce(this.config.STABILITY_POOL_REWARDERS, () => ( []))).map((rewarder) => {
        const rewardType = this.config.COIN_TYPES[rewarder.rewardSymbol];
        this.transaction.moveCall({
          target: `${this.config.INCENTIVE_PACKAGE_ID}::pool_incentive::update`,
          typeArguments: [rewardType],
          arguments: [
            registryObj,
            checker,
            this.transaction.sharedObjectRef(rewarder),
            clockObj
          ]
        });
      });
      const [responseAfterIncentive] = this.transaction.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::pool_incentive::destroy_checker`,
        arguments: [registryObj, checker]
      });
      positionResponse = responseAfterIncentive;
    }
    this.transaction.moveCall({
      target: `${this.config.STABILITY_POOL_PACKAGE_ID}::stability_pool::check_update_response`,
      arguments: [this.stabilityPoolObj(), positionResponse]
    });
  }
  /* ----- Transaction Methods ----- */
  /**
   * @description Whether this withdrawal can go ahead with no price at all.
   *
   * Answered by dev-inspecting the real withdrawal with `option::none`, never by
   * reasoning about the vault's rules: `update_position` decides when it needs a
   * price (today, a borrow or a withdrawal that leaves debt), and a copy of that
   * rule here would drift the moment the vault changed. Only a successful
   * inspection says yes. One that aborts, for any reason, says no; one that
   * could not run at all is a transport failure and is raised as one.
   *
   * Narrowed to what an inspection of committed state can vouch for: a plain
   * withdrawal (nothing deposited, repaid or borrowed), by a real sender, on a
   * transaction carrying nothing else. Commands already composed ahead of it,
   * a borrow on this same position say, would change the state it executes
   * against.
   *
   * The probe is built by a scratch client so it never touches this client's
   * transaction; a plain withdrawal builds without any RPC calls.
   */
  async canWithdrawWithoutPrice(inputs) {
    const plainWithdrawal = Number(inputs.withdrawAmount) > 0 && Number(inputs.borrowAmount) === 0 && Number(inputs.depositAmount) === 0 && Number(inputs.repaymentAmount) === 0;
    if (!plainWithdrawal) return { ok: false };
    if (this.sender === DUMMY_ADDRESS) return { ok: false };
    if (this.transaction.getData().commands.length > 0) return { ok: false };
    const { recipient, accountObjId } = inputs;
    if (recipient !== void 0 && !_utils.isValidIotaAddress.call(void 0, _utils.normalizeIotaAddress.call(void 0, recipient))) {
      throw new Error(
        `Invalid recipient for a withdrawal: ${recipient}. Only borrowed VUSD can go to the stability pool.`
      );
    }
    if (accountObjId !== void 0 && !_utils.isValidIotaObjectId.call(void 0, _utils.normalizeIotaAddress.call(void 0, accountObjId))) {
      throw new Error(`Invalid accountObjId: ${accountObjId}`);
    }
    const scratch = new _VirtueClient({
      network: this.network,
      rpcUrl: this.rpcEndpoint,
      sender: this.sender
    });
    scratch.config = this.config;
    const probe = await scratch.buildManagePosition(
      { ...inputs, keepTransaction: true },
      "none"
    );
    probe.setSender(this.sender);
    let inspect;
    try {
      inspect = await this.iotaClient.devInspectTransactionBlock({
        sender: this.sender,
        transactionBlock: probe
      });
    } catch (error) {
      throw new Error(
        `Could not determine whether ${inputs.collateralSymbol} can be withdrawn without a price: the RPC dev-inspection could not be performed. This is a transport failure, not an oracle one.`,
        { cause: error }
      );
    }
    return inspect.effects.status.status === "success" ? { ok: true } : { ok: false, rejection: _nullishCoalesce(inspect.effects.status.error, () => ( "unknown abort")) };
  }
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
   *
   * **Sign and execute this promptly.** Borrowing or withdrawing embeds a signed
   * Pyth Lazer update, and `pyth_lazer_rule` only accepts one within its
   * freshness tolerance of the moment Pyth signed it — 30s by default, counted
   * from the signing time rather than from now. Past it the rule abstains,
   * `aggregate` aborts with `err_total_weight_not_enough`, and the whole
   * transaction goes with it. A transaction held that long must be rebuilt, not
   * resubmitted. This deadline is inherent to feeding a price on chain.
   *
   * Either the whole position is built or the transaction is left exactly as it
   * was found — including when the collateral turns out to be unpriceable, which
   * is settled before anything is written.
   */
  async buildManagePositionTransaction(inputs) {
    const { collateralSymbol, borrowAmount, withdrawAmount, keepTransaction } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    let price;
    if (Number(borrowAmount) > 0 || Number(withdrawAmount) > 0) {
      const prepared = await this.prepareOracleUpdates([
        basicSymbolOf(collateralSymbol)
      ]);
      if (await this.canPriceCollateral(collateralSymbol, prepared)) {
        price = prepared;
      } else {
        const withoutPrice = await this.canWithdrawWithoutPrice(inputs);
        if (!withoutPrice.ok) {
          throw noPriceError(collateralSymbol, withoutPrice.rejection);
        }
        if (this.transaction.getData().commands.length > 0) {
          throw noPriceError(collateralSymbol);
        }
        price = "none";
      }
    }
    this.transaction.setSender(this.sender);
    return await this.buildManagePosition(inputs, _nullishCoalesce(price, () => ( null)));
  }
  /**
   * @description The body of `buildManagePositionTransaction`, split out so the
   * entry point above can settle its preconditions before anything is written.
   */
  async buildManagePosition(inputs, price) {
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
    const [depositCoin] = await this.splitInputCoins(
      collateralSymbol,
      depositAmount
    );
    const [repaymentCoin] = await this.splitInputCoins("VUSD", repaymentAmount);
    if (Number(borrowAmount) > 0 || Number(withdrawAmount) > 0) {
      const priceResult = price === null || price === "none" ? void 0 : this.aggregatePricesWith(price, this.transaction, [
        collateralSymbol
      ])[collateralSymbol];
      if (!priceResult && price !== "none") {
        throw noPriceError(collateralSymbol);
      }
      let updateRequest = this.debtorRequest({
        collateralSymbol,
        depositCoin,
        borrowAmount,
        repaymentCoin,
        withdrawAmount,
        accountObj: accountObjId
      });
      updateRequest = this.checkRequest({
        collateralSymbol,
        request: updateRequest
      });
      const [collCoin, vusdCoin, response] = this.updatePosition({
        collateralSymbol,
        updateRequest,
        priceResult
      });
      this.checkResponse({ collateralSymbol, response });
      if (Number(withdrawAmount) > 0) {
        this.transaction.transferObjects([collCoin], _nullishCoalesce(recipient, () => ( this.sender)));
      } else {
        this.destroyZeroCoin(collateralSymbol, collCoin);
      }
      if (Number(borrowAmount) > 0) {
        if (recipient === "StabilityPool") {
          const response2 = this.depositStabilityPool({
            vusdCoin,
            accountObj: accountObjId
          });
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
      if (!keepTransaction) this.resetTransaction();
      return tx;
    } else {
      let updateRequest = this.debtorRequest({
        collateralSymbol,
        depositCoin,
        borrowAmount,
        repaymentCoin,
        withdrawAmount,
        accountObj: accountObjId
      });
      updateRequest = this.checkRequest({
        collateralSymbol,
        request: updateRequest
      });
      const [collCoin, vusdCoin, response] = this.updatePosition({
        collateralSymbol,
        updateRequest
      });
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
        this.transaction.object.clock()
      ]
    });
    const repaymentCoin = await this.splitInputCoins("VUSD", debtAmount);
    let updateRequest = this.debtorRequest({
      collateralSymbol,
      depositCoin: this.zeroCoin(collateralSymbol),
      borrowAmount: "0",
      repaymentCoin,
      withdrawAmount: collAmount,
      accountObj: accountObjId
    });
    updateRequest = this.checkRequest({
      collateralSymbol,
      request: updateRequest
    });
    const [collCoin, vusdCoin, response] = this.updatePosition({
      collateralSymbol,
      updateRequest
    });
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
    const { depositAmount, accountObjId, keepTransaction } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const [vusdCoin] = await this.splitInputCoins("VUSD", depositAmount);
    const response = this.depositStabilityPool({
      vusdCoin,
      accountObj: accountObjId
    });
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
  buildClaimStabilityPoolTransaction(inputs) {
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
    const clockObj = this.transaction.object.clock();
    const registryObj = this.transaction.sharedObjectRef(
      this.config.VAULT_REWARDER_REGISTRY_OBJ
    );
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
              registryObj,
              this.transaction.sharedObjectRef(rewarder),
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
    const registryObj = this.transaction.sharedObjectRef(
      this.config.POOL_REWARDER_REGISTRY_OBJ
    );
    const clockObj = this.transaction.object.clock();
    const stabilityPoolObj = this.transaction.sharedObjectRef(
      this.config.STABILITY_POOL_OBJ
    );
    this.config.STABILITY_POOL_REWARDERS.map((rewarder) => {
      const [reward] = this.transaction.moveCall({
        target: `${this.config.INCENTIVE_PACKAGE_ID}::pool_incentive::claim`,
        typeArguments: [this.config.COIN_TYPES[rewarder.rewardSymbol]],
        arguments: [
          registryObj,
          this.transaction.sharedObjectRef(rewarder),
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
   * @description build and return Transaction of a PSM swap, sending the
   * output to the sender. No oracle is involved: the PSM swaps at a fixed 1:1.
   * @param coin: the PSM stablecoin, e.g. "USDT0"
   * @param direction: "in" pays `coin` for VUSD, "out" pays VUSD for `coin`
   * @param amount: raw units of what is paid
   * @param accountObj (optional): pay a partner's fee rates. Quote it with the
   * account's address as `quotePsmSwap`'s `partner`, or the quote will not
   * match.
   * @returns Transaction
   */
  async buildPsmSwapTransaction(inputs) {
    const { coin, direction, amount, accountObj, keepTransaction } = inputs;
    if (!keepTransaction) this.resetTransaction();
    if (this.sender === DUMMY_ADDRESS) throw new Error("Sender is not set");
    if (!/^\d+$/.test(amount) || BigInt(amount) === 0n) {
      throw new Error("Swap amount must be a positive integer of raw units");
    }
    const { coinType } = this.psmPool(coin);
    this.transaction.setSender(this.sender);
    const [inputCoin] = direction === "in" ? await this.splitCoinsByType(coinType, amount) : await this.splitCoinsByType(this.config.COIN_TYPES.VUSD, amount);
    const accountRequest = accountObj ? this.newAccountRequest(accountObj) : void 0;
    const output = direction === "in" ? this.psmSwapIn({ coin, assetCoin: inputCoin, accountRequest }) : this.psmSwapOut({ coin, vusdCoin: inputCoin, accountRequest });
    this.transaction.transferObjects([output], this.sender);
    const tx = this.getTransaction();
    if (!keepTransaction) this.resetTransaction();
    return tx;
  }
  /**
   * @description instruction for emitting point request
   */
  emitPoint(collateralSymbol, response) {
    if (this.config.POINT_PACKAGE_ID) {
      this.transaction.moveCall({
        target: `${this.config.POINT_PACKAGE_ID}::point_manager::emit_point`,
        typeArguments: [this.config.COIN_TYPES[collateralSymbol]],
        arguments: [
          this.transaction.sharedObjectRef(this.config.POINT_MANAGER_OBJ),
          this.transaction.sharedObjectRef(this.config.POINT_GLOBAL_CONFIG_OBJ),
          this.vaultObj(collateralSymbol),
          response,
          this.transaction.object.clock()
        ]
      });
    }
  }
};





















exports.COIN_DECIMALS = COIN_DECIMALS; exports.CONFIG = CONFIG; exports.DEFAULT_LAZER_ENDPOINTS = DEFAULT_LAZER_ENDPOINTS; exports.LAZER_PROPERTIES = LAZER_PROPERTIES; exports.ObjectContentFields = ObjectContentFields; exports.U64FromBytes = U64FromBytes; exports.VirtueClient = VirtueClient; exports.formatBigInt = formatBigInt; exports.formatUnits = formatUnits; exports.getCoinSymbol = getCoinSymbol; exports.getCoinType = getCoinType; exports.getIotaObjectData = getIotaObjectData; exports.getMoveObject = getMoveObject; exports.getObjectFields = getObjectFields; exports.getObjectGenerics = getObjectGenerics; exports.getObjectNames = getObjectNames; exports.parseUnits = parseUnits; exports.parseVaultObject = parseVaultObject; exports.quotePsmSwap = quotePsmSwap; exports.quotePsmSwapExactOut = quotePsmSwapExactOut;
//# sourceMappingURL=index.js.map