// src/client.ts
import {
  Transaction
} from "@iota/iota-sdk/transactions";
import {
  getFullnodeUrl,
  IotaClient
} from "@iota/iota-sdk/client";

// src/constants/coin.ts
var COIN_DECIMALS = {
  VUSD: 6,
  IOTA: 9,
  stIOTA: 9,
  vIOTA: 9
};

// src/constants/object.ts
var CONFIG = {
  mainnet: {
    COIN_TYPES: {
      VUSD: "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f::vusd::VUSD",
      IOTA: "0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA",
      stIOTA: "0x346778989a9f57480ec3fee15f2cd68409c73a62112d40a3efd13987997be68c::cert::CERT",
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
    SWITCHBOARD_PACKAGE_ID: "0x8650249db8ffcffe8eb08b0696a8cb71e325f2afb9abc646f45344077b073ba1",
    SWITCHBOARD_RULE_PACKAGE_ID: "0x39fb7adf0abd75b31868e17706b8600cc943bc27422fb582f6e14282029cd5f0",
    SWITCHBOARD_RULE_CONFIG_OBJ: {
      objectId: "0xa0c7b527f35476c51938d0ffd144b83cd7ee5091f516327228391b77e03afa3e",
      initialSharedVersion: 759082916,
      mutable: false
    },
    SWITCHBOARD_AGGREGATORS: {
      IOTA: "0x7c16ffdac553a4816db57e5e2cfbba8245337f2983b4ffb4dd944493a530c556"
    },
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
    }
  },
  testnet: {
    COIN_TYPES: {
      VUSD: "0x3fbd238eea1f4ce7d797148954518fce853f24a8be01b47388bfa2262602fefa::vusd::VUSD",
      IOTA: "0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA",
      stIOTA: "0x14f9e69c0076955d5a056260c9667edab184650dba9919f168a37030dd956dc6::cert::CERT",
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
import { normalizeIotaAddress } from "@iota/iota-sdk/utils";
function getObjectNames(objectTypes, coinTypes) {
  const accept_coin_type = Object.values(coinTypes);
  const accept_coin_name = Object.keys(coinTypes);
  const coinTypeList = objectTypes.map(
    (type) => type.split("<").pop()?.replace(">", "") ?? ""
  );
  const objectNameList = [];
  coinTypeList.forEach((type) => {
    const typeIndex = accept_coin_type.indexOf(type);
    const coinName = accept_coin_name[typeIndex];
    objectNameList.push(coinName ?? "");
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
    (key) => normalizeIotaAddress(coinTypes[key]) === normalizeIotaAddress(coinType)
  );
  if (coin) {
    return coin;
  }
  return void 0;
};
function U64FromBytes(x) {
  let u64 = BigInt(0);
  for (let i = x.length - 1; i >= 0; i--) {
    u64 = u64 << BigInt(8) | BigInt(x[i] ?? 0);
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
import { any, record, string } from "superstruct";
var ObjectContentFields = record(string(), any());
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
  return getMoveObject(resp)?.fields;
}
var getObjectGenerics = (resp) => {
  const objType = resp.data?.type;
  const startIdx = objType?.indexOf?.("<");
  const endIdx = objType?.lastIndexOf?.(">");
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
import { bcs } from "@iota/iota-sdk/bcs";
import {
  fromHEX,
  normalizeIotaAddress as normalizeIotaAddress2,
  normalizeStructTag
} from "@iota/iota-sdk/utils";
var SWITCHBOARD_CRANK_TIMEOUT_MS = 5e3;
var BASIC_PRICE_SYMBOLS = ["IOTA"];
var getCoinSymbol2 = (coinType, coinTypes) => {
  const coin = Object.keys(coinTypes).find(
    (key) => coinTypes[key] === coinType
  );
  if (coin) {
    return coin;
  }
  return void 0;
};
var DUMMY_ADDRESS = normalizeIotaAddress2("0x0");
var TYPE_NAME_STRUCT = bcs.struct("TypeName", {
  name: bcs.String
});
var CDP_POSITION_DATA = bcs.struct("CdpPositionData", {
  debtor: bcs.Address,
  coll_amount: bcs.U64,
  debt_amount: bcs.U64
});
var POOL_POSITION_DATA = bcs.struct("StabilityPoolPositionData", {
  account: bcs.Address,
  vusd_balance: bcs.U64,
  coll_types: bcs.vector(TYPE_NAME_STRUCT),
  coll_amounts: bcs.vector(bcs.U64),
  timestamp: bcs.U64
});
var VirtueClient = class {
  constructor(inputs) {
    const { network, rpcUrl, sender } = inputs ?? {};
    this.config = CONFIG[network ?? "mainnet"];
    this.rpcEndpoint = rpcUrl ?? getFullnodeUrl(network ?? "mainnet");
    this.sender = sender ? normalizeIotaAddress2(sender) : DUMMY_ADDRESS;
    this.iotaClient = new IotaClient({ url: this.rpcEndpoint });
    this.transaction = new Transaction();
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
   * @description Price every collateral by dry-running `aggregatePrices` and
   * reading the emitted `PriceAggregated` events.
   *
   * A symbol is **absent** from the result when no oracle rule could price it —
   * `aggregatePrices` leaves such a symbol out of the transaction, so it emits
   * no event, and the derived symbols go with it since they are computed from
   * the IOTA price. The return type is `Partial` to say so; treat a missing
   * entry as "no price available right now", never as zero.
   */
  async getCollateralPrices() {
    this.resetTransaction();
    await this.aggregatePrices();
    this.transaction.setSender(DUMMY_ADDRESS);
    const inspectRes = await this.iotaClient.devInspectTransactionBlock({
      sender: DUMMY_ADDRESS,
      transactionBlock: this.transaction
    });
    this.resetTransaction();
    const pricePrecision = 10 ** 9;
    return this.getAllCollateralSymbol().reduce(
      (result, coinSymbol) => {
        const coinType = this.config.COIN_TYPES[coinSymbol];
        const priceEvent = (inspectRes.events ?? []).findLast(
          (e) => normalizeStructTag(e.type).includes(normalizeStructTag(coinType))
        );
        if (priceEvent) {
          return {
            ...result,
            [coinSymbol]: +priceEvent.parsedJson.result / pricePrecision
          };
        } else {
          return result;
        }
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
        (key) => this.config.VAULT_MAP[key].vault.objectId === res.data?.objectId
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
    const tx = new Transaction();
    const clockObj = tx.sharedObjectRef(this.config.CLOCK_OBJ);
    const tokenList = Object.keys(this.config.VAULT_MAP);
    const debtorAddr = debtor ?? this.sender;
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
      sender: debtor ?? this.sender
    });
    if (!res.results) return [];
    return res.results.map((value, idx) => {
      const collateral = tokenList[idx];
      if (value.returnValues) {
        const [collReturn, debtReturn] = value.returnValues;
        return {
          collateral,
          collAmount: collReturn ? bcs.u64().parse(Uint8Array.from(collReturn[0])) : "0",
          debtAmount: debtReturn ? bcs.u64().parse(Uint8Array.from(debtReturn[0])) : "0"
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
   * @description Get user's balances in stability pool
   */
  async getStabilityPoolBalances(account) {
    const accountAddr = account ?? this.sender;
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
    if (res.data?.content?.dataType !== "moveObject") {
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
    const accountAddr = account ?? this.sender;
    if (accountAddr === DUMMY_ADDRESS) {
      throw new Error("Invalid debtor address");
    }
    const tx = new Transaction();
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
          rewardAmount ? bcs.u64().parse(Uint8Array.from(rewardAmount[0])) : "0"
        );
      }
    });
    return rewards;
  }
  /**
   * @description Get reward amounts from stability pool incentive program
   */
  async getStabilityPoolRewards(account) {
    const tx = new Transaction();
    const accountAddr = account ?? this.sender;
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
          rewardAmount ? bcs.u64().parse(Uint8Array.from(rewardAmount[0])) : "0"
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
    const tx = new Transaction();
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
    if (!res.results || !res.results[0]?.returnValues) {
      return {
        positions: [],
        nextCursor: null
      };
    }
    const [positionBytes, nextCursorBytes] = res.results[0].returnValues;
    const positions = bcs.vector(CDP_POSITION_DATA).parse(Uint8Array.from(positionBytes ? positionBytes[0] : [])).map((pos) => {
      return {
        collateralType: coinType,
        debtor: pos.debtor,
        collAmount: Number(pos.coll_amount) / 10 ** COIN_DECIMALS[coinSymbol],
        debtAmount: Number(pos.debt_amount) / 10 ** COIN_DECIMALS.VUSD
      };
    });
    const nextCursor = bcs.option(bcs.Address).parse(Uint8Array.from(nextCursorBytes ? nextCursorBytes[0] : []));
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
    const tx = new Transaction();
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
    if (!res.results || !res.results[0]?.returnValues) {
      return {
        positions: [],
        nextCursor: null
      };
    }
    const [positionVec, nextCursorVec] = res.results[0].returnValues;
    const positions = bcs.vector(POOL_POSITION_DATA).parse(Uint8Array.from(positionVec ? positionVec[0] : [])).map((pos) => {
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
    const nextCursor = bcs.option(bcs.Address).parse(Uint8Array.from(nextCursorVec ? nextCursorVec[0] : []));
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
    this.transaction = new Transaction();
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
   */
  async prepareOracleUpdates(basicSymbols = BASIC_PRICE_SYMBOLS) {
    const switchboardAggregators = this.config.SWITCHBOARD_AGGREGATORS ?? {};
    const switchboard = {};
    for (const symbol of basicSymbols) {
      const aggregatorId = switchboardAggregators[symbol];
      if (!aggregatorId) continue;
      const prepared = await this.prepareSwitchboard(aggregatorId);
      if (prepared) switchboard[symbol] = prepared;
    }
    return { switchboard };
  }
  /**
   * @description Whether the Switchboard rule is wired up for a symbol at all.
   *
   * Config alone decides whether the rule is *added*. It abstains on a stale
   * aggregator rather than aborting, so adding it costs nothing — but note it is
   * not unconditionally fail-soft: the deployed rule aborts on a coin type it
   * has no mapping for (`err_unsupported_coin_type`) or an aggregator that is
   * not the one registered for that coin (`err_invalid_aggregator`). Live config
   * is aligned today, and `canPriceCollateral` dev-inspects the real aggregation
   * rather than trusting that, so a drifted rule config surfaces as "cannot
   * price" instead of a failed transaction.
   */
  switchboardRuleFeeds(symbol) {
    return !!this.config.SWITCHBOARD_AGGREGATORS?.[symbol] && !!this.config.SWITCHBOARD_RULE_PACKAGE_ID && !!this.config.SWITCHBOARD_RULE_CONFIG_OBJ;
  }
  /**
   * @description Whether the prepared data can actually price this collateral.
   *
   * Answered by building the aggregation and dev-inspecting it, rather than by
   * reasoning about which rules are configured. Configuration is not the
   * question — being wired up to Switchboard says nothing about whether its
   * aggregator still holds a result the rule will accept. With nothing cranked
   * and a stale aggregator the rule abstains, `aggregate` fails its threshold
   * with `err_total_weight_not_enough`, and a predicate that had said "yes"
   * would already have written a doomed position onto the caller's transaction.
   *
   * Running the real thing also covers what a predicate would miss: a rule
   * config drifted from the aggregator it is asked about, or any future rule
   * with its own abort conditions.
   *
   * Built on a transaction of its own. Assigning a scratch transaction to
   * `this.transaction` for the duration would expose it through
   * `getTransaction()` and, worse, let a concurrent build or
   * `resetTransaction()` land in that window only to be overwritten when this
   * restored the old one.
   *
   * A dev-inspection that *executes* and reports failure means no rule can
   * price this collateral. A dev-inspection that could not run at all means
   * nothing of the sort, so transport failures are raised rather than folded
   * into a `false` that would blame the oracles for a throttled RPC.
   */
  async canPriceCollateral(collateralSymbol, prepared) {
    const probe = new Transaction();
    const priceResults = await this.aggregatePricesWith(prepared, probe);
    if (!priceResults[collateralSymbol]) return false;
    let inspect;
    try {
      inspect = await this.iotaClient.devInspectTransactionBlock({
        sender: DUMMY_ADDRESS,
        transactionBlock: probe
      });
    } catch (error) {
      throw new Error(
        `Could not determine whether ${collateralSymbol} is priceable: the RPC dev-inspection could not be performed. This is a transport failure, not an oracle one.`,
        { cause: error }
      );
    }
    return inspect.effects.status.status === "success";
  }
  /**
   * @description Fetch signed Switchboard responses and keep the ones that will
   * actually validate on chain, without touching the current transaction.
   *
   * Switchboard is on-demand, not push: `Aggregator.current_result` only changes
   * when someone submits a signed oracle response. Left alone the IOTA mainnet
   * feed sat 330 days stale, so the crank belongs in the same PTB as the read.
   *
   * Two things make this awkward, both handled here:
   *
   * - Most oracles on the IOTA queues are broken — their signature no longer
   *   recovers to the `secp256k1_key` in their on-chain `Oracle` object, so
   *   `aggregator_submit_result_action::validate` aborts. Crossbar hands out one
   *   at random per request, so a plain crank succeeds about a quarter of the
   *   time. `numSignatures` asks for the whole set instead.
   * - A PTB is all-or-nothing, so one broken oracle would take the entire price
   *   read — and whatever borrow or liquidation is bundled with it — down too.
   *   Each response is therefore devInspected on its own and only the survivors
   *   are kept.
   *
   * Never throws: a crossbar outage, a slow endpoint, a malformed response or an
   * RPC failure all come back `null`. Switchboard is one rule among several, so
   * raising here would take down price reads that the others could have served.
   */
  async prepareSwitchboard(aggregatorId, numSignatures = 8) {
    const pkg = this.config.SWITCHBOARD_PACKAGE_ID;
    if (!pkg) return null;
    try {
      const res = await fetch(
        `https://crossbar.switchboard.xyz/updates/iota/mainnet/${aggregatorId}?numSignatures=${numSignatures}`,
        { signal: AbortSignal.timeout(SWITCHBOARD_CRANK_TIMEOUT_MS) }
      );
      if (!res.ok) return null;
      const body = await res.json();
      const results = (body.responses ?? []).flatMap((r) => r.results ?? []).filter((r) => r.signature && r.signature !== "00" && r.successValue);
      if (results.length === 0) return null;
      const aggObj = await this.iotaClient.getObject({
        id: aggregatorId,
        options: { showContent: true }
      });
      const queue = aggObj.data?.content?.fields?.queue;
      if (!queue) return null;
      const verdicts = await Promise.all(
        results.map(async (r) => {
          try {
            const probe = new Transaction();
            if (!this.addSwitchboardSubmission(probe, aggregatorId, queue, r)) {
              return void 0;
            }
            const inspect = await this.iotaClient.devInspectTransactionBlock({
              sender: DUMMY_ADDRESS,
              transactionBlock: probe
            });
            return inspect.effects.status.status === "success" ? r : void 0;
          } catch {
            return void 0;
          }
        })
      );
      const validated = verdicts.filter(
        (r) => r !== void 0
      );
      if (validated.length === 0) return null;
      return { aggregatorId, queue, results: validated };
    } catch {
      return null;
    }
  }
  /**
   * @description Append one `aggregator_submit_result_action::run` call. Pure —
   * no I/O — so replaying a response that already passed its probe cannot fail.
   * Returns false for a signature that is not the 65 bytes the action expects.
   */
  addSwitchboardSubmission(tx, aggregatorId, queue, r) {
    const pkg = this.config.SWITCHBOARD_PACKAGE_ID;
    if (!pkg) return false;
    let signature;
    try {
      signature = fromHEX(r.signature);
    } catch {
      return false;
    }
    if (signature.length !== 65) return false;
    const [fee] = tx.splitCoins(tx.gas, [0]);
    tx.moveCall({
      target: `${pkg}::aggregator_submit_result_action::run`,
      typeArguments: ["0x2::iota::IOTA"],
      arguments: [
        tx.object(aggregatorId),
        tx.object(queue),
        tx.pure.u128(BigInt(r.successValue.replace(/^-/, ""))),
        tx.pure.bool(r.isNegative || r.successValue.startsWith("-")),
        tx.pure.u64(BigInt(r.timestamp)),
        tx.object(r.oracleId),
        tx.pure.vector("u8", signature),
        tx.object.clock(),
        fee
      ]
    });
    return true;
  }
  /**
   * @description Add the prepared Switchboard submissions to the current
   * transaction, so the aggregator is fresh before anything in this same PTB
   * reads it. Returns how many were added; zero simply means the rule will read
   * whatever is already on chain and abstain if that is stale.
   */
  applySwitchboard(prepared, tx) {
    if (!prepared) return 0;
    let added = 0;
    for (const r of prepared.results) {
      if (this.addSwitchboardSubmission(
        tx,
        prepared.aggregatorId,
        prepared.queue,
        r
      )) {
        added++;
      }
    }
    return added;
  }
  /**
   * @description Get a price result
   * @param collateral coin symbol, e.g "IOTA"
   * @return [PriceResult]
   */
  async aggregatePrices() {
    return this.aggregatePricesWith(await this.prepareOracleUpdates());
  }
  /**
   * @description The transaction-building half of `aggregatePrices`, working
   * only from data already fetched and validated by `prepareOracleUpdates`.
   *
   * Kept separate so a position build can settle whether its collateral is
   * priceable before writing anything, then build from that exact same prepared
   * data — no second fetch, and so no window for the answer to change in
   * between.
   */
  async aggregatePricesWith(prepared, tx = this.transaction) {
    const basicSymbol = BASIC_PRICE_SYMBOLS;
    const switchboardAggregators = this.config.SWITCHBOARD_AGGREGATORS ?? {};
    for (const symbol of basicSymbol) {
      this.applySwitchboard(prepared.switchboard[symbol], tx);
    }
    const basicPriceResults = basicSymbol.reduce(
      (result, symbol) => {
        const coinType = this.config.COIN_TYPES[symbol];
        const switchboardAggregatorId = switchboardAggregators[symbol];
        const switchboardFeeds = this.switchboardRuleFeeds(symbol);
        if (!switchboardFeeds) return result;
        const collector = this.newPriceCollector(symbol, tx);
        if (switchboardFeeds && switchboardAggregatorId) {
          tx.moveCall({
            target: `${this.config.SWITCHBOARD_RULE_PACKAGE_ID}::switchboard_rule::feed`,
            typeArguments: [coinType],
            arguments: [
              collector,
              tx.sharedObjectRef(this.config.SWITCHBOARD_RULE_CONFIG_OBJ),
              tx.object.clock(),
              tx.object(switchboardAggregatorId)
            ]
          });
        }
        const priceResult = tx.moveCall({
          target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
          typeArguments: [coinType],
          arguments: [
            tx.sharedObjectRef(this.config.VAULT_MAP[symbol].priceAggregater),
            collector
          ]
        });
        return { ...result, [symbol]: priceResult };
      },
      {}
    );
    if (!basicPriceResults.IOTA) return basicPriceResults;
    const iotaPriceResult = basicPriceResults.IOTA;
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
    const stIotaPrice = tx.moveCall({
      target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
      typeArguments: [this.config.COIN_TYPES.stIOTA],
      arguments: [
        tx.sharedObjectRef(this.config.VAULT_MAP.stIOTA.priceAggregater),
        stIotaCollector
      ]
    });
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
    const vIotaPrice = tx.moveCall({
      target: `${this.config.ORACLE_PACKAGE_ID}::aggregater::aggregate`,
      typeArguments: [this.config.COIN_TYPES.vIOTA],
      arguments: [
        tx.sharedObjectRef(this.config.VAULT_MAP.vIOTA.priceAggregater),
        vIotaCollector
      ]
    });
    return { ...basicPriceResults, stIOTA: stIotaPrice, vIOTA: vIotaPrice };
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
      (rewarders ?? []).map((rewarder) => {
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
      (this.config.STABILITY_POOL_REWARDERS ?? []).map((rewarder) => {
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
   * Switchboard response, and the queue only accepts one for
   * `max_staleness_seconds` after the oracle signed it — 150s on the configured
   * queue, counted from the signing time rather than from now, so the usable
   * window is shorter than that. Past it,
   * `aggregator_submit_result_action::validate` aborts and takes the whole
   * transaction with it. A transaction held that long must be rebuilt, not
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
    let prepared;
    if (Number(borrowAmount) > 0 || Number(withdrawAmount) > 0) {
      prepared = await this.prepareOracleUpdates();
      if (!await this.canPriceCollateral(collateralSymbol, prepared)) {
        throw new Error(
          `No oracle rule could price ${collateralSymbol}: borrowing and withdrawing require a price.`
        );
      }
    }
    this.transaction.setSender(this.sender);
    return await this.buildManagePosition(inputs, prepared);
  }
  /**
   * @description The body of `buildManagePositionTransaction`, split out so the
   * entry point above can settle its preconditions before anything is written.
   */
  async buildManagePosition(inputs, prepared) {
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
      const priceResults = await this.aggregatePricesWith(
        prepared ?? await this.prepareOracleUpdates()
      );
      const priceResult = priceResults[collateralSymbol];
      if (!priceResult) {
        throw new Error(
          `No oracle rule could price ${collateralSymbol}: borrowing and withdrawing require a price.`
        );
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
        this.transaction.transferObjects([collCoin], recipient ?? this.sender);
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
            recipient ?? this.sender
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
      recipient ?? this.transaction.pure.address(this.sender)
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
export {
  COIN_DECIMALS,
  CONFIG,
  ObjectContentFields,
  U64FromBytes,
  VirtueClient,
  formatBigInt,
  formatUnits,
  getCoinSymbol,
  getCoinType,
  getIotaObjectData,
  getMoveObject,
  getObjectFields,
  getObjectGenerics,
  getObjectNames,
  parseUnits,
  parseVaultObject
};
//# sourceMappingURL=index.js.map