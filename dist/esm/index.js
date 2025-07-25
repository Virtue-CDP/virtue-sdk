// src/client.ts
import {
  Transaction
} from "@iota/iota-sdk/transactions";
import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";

// src/constants/coin.ts
var COIN_TYPES = {
  IOTA: "0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA",
  stIOTA: "0x346778989a9f57480ec3fee15f2cd68409c73a62112d40a3efd13987997be68c::cert::CERT",
  VUSD: "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f::vusd::VUSD"
};
var COIN_DECIMALS = {
  IOTA: 9,
  stIOTA: 9,
  VUSD: 6
};

// src/constants/object.ts
var ORIGINAL_FRAMEWORK_PACKAGE_ID = "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b";
var ORIGINAL_VUSD_PACKAGE_ID = "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f";
var ORIGINAL_ORACLE_PACKAGE_ID = "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf";
var ORIGINAL_CDP_PACKAGE_ID = "0xcdeeb40cd7ffd7c3b741f40a8e11cb784a5c9b588ce993d4ab86479072386ba1";
var ORIGINAL_STABILITY_POOL_PACKAGE_ID = "0xc7ab9b9353e23c6a3a15181eb51bf7145ddeff1a5642280394cd4d6a0d37d83b";
var ORIGINAL_INCENTIVE_PACKAGE_ID = "0xe66a8a84964f758fd1b2154d68247277a14983c90a810c8fd9e6263116f15019";
var FRAMEWORK_PACKAGE_ID = "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b";
var VUSD_PACKAGE_ID = "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f";
var ORACLE_PACKAGE_ID = "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf";
var CDP_PACKAGE_ID = "0x34fa327ee4bb581d81d85a8c40b6a6b4260630a0ef663acfe6de0e8ca471dd22";
var STABILITY_POOL_PACKAGE_ID = "0xc7ab9b9353e23c6a3a15181eb51bf7145ddeff1a5642280394cd4d6a0d37d83b";
var INCENTIVE_PACKAGE_ID = "0xe66a8a84964f758fd1b2154d68247277a14983c90a810c8fd9e6263116f15019";
var CLOCK_OBJ = {
  objectId: "0x0000000000000000000000000000000000000000000000000000000000000006",
  mutable: false,
  initialSharedVersion: 1
};
var TREASURY_OBJ = {
  objectId: "0x81f525f4fa5b2d3cf58677d3e39aabc4b0a1ca25cbba605033cfe417e47b0a16",
  mutable: true,
  initialSharedVersion: 22329876
};
var VAULT_MAP = {
  IOTA: {
    priceAggregater: {
      objectId: "0x052c40b4e8f16df5238457f3a7b3b0eeaa49c6bc8acc22f6a7790ab32495b2c6",
      mutable: false,
      initialSharedVersion: 22329880
    },
    vault: {
      objectId: "0xaf306be8419cf059642acdba3b4e79a5ae893101ae62c8331cefede779ef48d5",
      mutable: true,
      initialSharedVersion: 22329895
    },
    pythPriceId: "0xc7b72e5d860034288c9335d4d325da4272fe50c92ab72249d58f6cbba30e4c44"
  },
  stIOTA: {
    priceAggregater: {
      objectId: "0x8c730f64aa369eed69ddf7eea39c78bf0afd3f9fbb4ee0dfe457f6dea5a0f4ed",
      mutable: false,
      initialSharedVersion: 22329881
    },
    vault: {
      objectId: "0xc9cb494657425f350af0948b8509efdd621626922e9337fd65eb161ec33de259",
      mutable: true,
      initialSharedVersion: 22329896
    },
    rewarders: [
      {
        objectId: "0xf9ac7f70f1e364cd31734f5a3ebf5c580d3da11c06ca6d7832e82cc417e022eb",
        mutable: true,
        initialSharedVersion: 121322517,
        rewardSymbol: "stIOTA"
      }
    ]
  }
};
var PYTH_STATE_ID = "0x6bc33855c7675e006f55609f61eebb1c8a104d8973a698ee9efd3127c210b37f";
var WORMHOLE_STATE_ID = "0xd43b448afc9dd01deb18273ec39d8f27ddd4dd46b0922383874331771b70df73";
var PYTH_RULE_PACKAGE_ID = "0xed5a8dac2ca41ae9bdc1c7f778b0949d3e26c18c51ed284c4cfa4030d0bb64c2";
var PYTH_RULE_CONFIG_OBJ = {
  objectId: "0xbcc4f6e3ca3d4a83eac39282ab7d1cb086924c58bef825d69c33b00fea1105b8",
  initialSharedVersion: 22329882,
  mutable: false
};
var CERT_RULE_PACKAGE_ID = "0x01edb9afe0663b8762d2e0a18923df8bee98d28f3a60ac56ff67a27bbf53a7ac";
var CERT_NATIVE_POOL_OBJ = {
  objectId: "0x02d641d7b021b1cd7a2c361ac35b415ae8263be0641f9475ec32af4b9d8a8056",
  initialSharedVersion: 19,
  mutable: false
};
var CERT_METADATA_OBJ = {
  objectId: "0x8c25ec843c12fbfddc7e25d66869f8639e20021758cac1a3db0f6de3c9fda2ed",
  initialSharedVersion: 19,
  mutable: false
};
var STABILITY_POOL_OBJ = {
  objectId: "0x6101272394511caf38ce5a6d120d3b4d009b6efabae8faac43aa9ac938cec558",
  initialSharedVersion: 22329903,
  mutable: true
};
var STABILITY_POOL_TABLE_ID = "0x6dd808c50bab98757f7523562bdef7d33d506bb447ea9e708072bf13a5e29f02";
var INCENTIVE_GLOBAL_CONFIG_OBJ = {
  objectId: "0xc30c82b96429c2c215dbc994e73250c8b29e747c9540a547c7bc95e6d7e098d8",
  mutable: false,
  initialSharedVersion: 120165683
};
var VAULT_REWARDER_REGISTRY_OBJ = {
  objectId: "0x3b5a6649ce2c4348ae7d2dc72bc8e42cecfc6c24b9edb701635f9c49c765ff69",
  mutable: false,
  initialSharedVersion: 120165683
};
var POOL_REWARDER_REGISTRY_OBJ = {
  objectId: "0xc043719e2da72c1182466bbccf01b966d500337749cd6a06e042714444d2852c",
  mutable: false,
  initialSharedVersion: 120165683
};
var STABILITY_POOL_REWARDERS = [
  {
    objectId: "0xb295972b5c978ebb96339b81a762cbc047be78747c2f7d19e661281560394c2b",
    mutable: true,
    initialSharedVersion: 121322519,
    rewardSymbol: "stIOTA"
  }
];

// src/utils/format.ts
import { normalizeIotaAddress } from "@iota/iota-sdk/utils";
function getObjectNames(objectTypes) {
  const accept_coin_type = Object.values(COIN_TYPES);
  const accept_coin_name = Object.keys(COIN_TYPES);
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
var getCoinType = (str) => {
  const startIndex = str.indexOf("<");
  const endIndex = str.lastIndexOf(">");
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const coinType = str.slice(startIndex + 1, endIndex);
    return coinType === "0x2::iota::IOTA" ? COIN_TYPES.IOTA : coinType;
  }
  return null;
};
var getCoinSymbol = (coinType) => {
  const coin = Object.keys(COIN_TYPES).find(
    (key) => normalizeIotaAddress(COIN_TYPES[key]) === normalizeIotaAddress(coinType)
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
var getPriceResultType = (coinSymbol) => {
  return `${ORIGINAL_ORACLE_PACKAGE_ID}::result::PriceResult<${COIN_TYPES[coinSymbol]}>`;
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
import {
  IotaPriceServiceConnection,
  IotaPythClient
} from "@pythnetwork/pyth-iota-js";
import { bcs } from "@iota/iota-sdk/bcs";
import { isValidIotaAddress } from "@iota/iota-sdk/utils";
var getCoinSymbol2 = (coinType) => {
  const coin = Object.keys(COIN_TYPES).find(
    (key) => COIN_TYPES[key] === coinType
  );
  if (coin) {
    return coin;
  }
  return void 0;
};
var VirtueClient = class {
  constructor(inputs) {
    const { rpcUrl, sender } = inputs;
    this.rpcEndpoint = rpcUrl ?? getFullnodeUrl("mainnet");
    if (!isValidIotaAddress(sender)) {
      throw new Error("Invalid sender address");
    }
    this.sender = sender;
    this.iotaClient = new IotaClient({ url: this.rpcEndpoint });
    this.pythConnection = new IotaPriceServiceConnection(
      "https://hermes.pyth.network"
    );
    this.pythClient = new IotaPythClient(
      this.iotaClient,
      PYTH_STATE_ID,
      WORMHOLE_STATE_ID
    );
    this.transaction = new Transaction();
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
   * @description Get all vault objects
   */
  async getAllVaults() {
    const vaultObjectIds = Object.values(VAULT_MAP).map(
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
      const token = Object.keys(VAULT_MAP).find(
        (key) => VAULT_MAP[key].vault.objectId === res.data?.objectId
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
      id: VAULT_MAP[token].vault.objectId,
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
    const clockObj = tx.sharedObjectRef(CLOCK_OBJ);
    const tokenList = Object.keys(VAULT_MAP);
    const debtorAddr = debtor ?? this.sender;
    if (!isValidIotaAddress(debtorAddr)) {
      throw new Error("Invalid debtor address");
    }
    tokenList.map((token) => {
      tx.moveCall({
        target: `${CDP_PACKAGE_ID}::vault::try_get_position_data`,
        typeArguments: [COIN_TYPES[token]],
        arguments: [
          tx.sharedObjectRef(VAULT_MAP[token].vault),
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
      id: STABILITY_POOL_OBJ.objectId,
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
    const accountAddr = account ?? this.sender;
    if (!isValidIotaAddress(accountAddr)) {
      throw new Error("Invalid account address");
    }
    const res = await this.iotaClient.getDynamicFieldObject({
      parentId: STABILITY_POOL_TABLE_ID,
      name: {
        type: "address",
        value: accountAddr
      }
    });
    const collBalances = {};
    Object.keys(VAULT_MAP).map((collSymbol) => {
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
      const coinSymbol = getCoinSymbol2(coinType);
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
    if (!isValidIotaAddress(accountAddr)) {
      throw new Error("Invalid debtor address");
    }
    const tx = new Transaction();
    const vaultInfo = VAULT_MAP[collateralSymbol];
    const rewarders = vaultInfo.rewarders;
    const vaultObj = tx.sharedObjectRef(vaultInfo.vault);
    if (!rewarders) return {};
    rewarders.map((rewarder) => {
      tx.moveCall({
        target: `${INCENTIVE_PACKAGE_ID}::borrow_incentive::realtime_reward_amount`,
        typeArguments: [
          COIN_TYPES[collateralSymbol],
          COIN_TYPES[rewarder.rewardSymbol]
        ],
        arguments: [
          tx.sharedObjectRef(rewarder),
          vaultObj,
          tx.pure.address(accountAddr),
          tx.sharedObjectRef(CLOCK_OBJ)
        ]
      });
    });
    const res = await this.iotaClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: accountAddr
    });
    console.log(res.results);
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
    if (!isValidIotaAddress(accountAddr)) {
      throw new Error("Invalid debtor address");
    }
    STABILITY_POOL_REWARDERS.map((rewarder) => {
      tx.moveCall({
        target: `${INCENTIVE_PACKAGE_ID}::stability_pool_incentive::realtime_reward_amount`,
        typeArguments: [COIN_TYPES[rewarder.rewardSymbol]],
        arguments: [
          tx.sharedObjectRef(rewarder),
          this.transaction.sharedObjectRef(STABILITY_POOL_OBJ),
          tx.pure.address(accountAddr),
          tx.sharedObjectRef(CLOCK_OBJ)
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
      const rewarder = STABILITY_POOL_REWARDERS[idx];
      if (value.returnValues) {
        const [rewardAmount] = value.returnValues;
        rewards[rewarder.rewardSymbol] = Number(
          rewardAmount ? bcs.u64().parse(Uint8Array.from(rewardAmount[0])) : "0"
        );
      }
    });
    return rewards;
  }
  /* ----- Transaction Utils ----- */
  /**
   * @description new zero coin
   */
  zeroCoin(coinSymbol) {
    return this.transaction.moveCall({
      target: "0x2::coin::zero",
      typeArguments: [COIN_TYPES[coinSymbol]]
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
        const coinType = COIN_TYPES[coinSymbol];
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
  /**
   * @description Create a AccountRequest
   * @param accountObj (optional): Account object or EOA if undefined
   * @return [AccountRequest]
   */
  newAccountRequest(accountObj) {
    return accountObj ? this.transaction.moveCall({
      target: `${FRAMEWORK_PACKAGE_ID}::account::request_with_account`,
      arguments: [
        typeof accountObj === "string" ? this.transaction.object(accountObj) : accountObj
      ]
    }) : this.transaction.moveCall({
      target: `${FRAMEWORK_PACKAGE_ID}::account::request`
    });
  }
  /**
   * @description Create a price collector
   * @param collateral coin symbol, e.g "IOTA"
   * @return [PriceCollector]
   */
  newPriceCollector(collateralSymbol) {
    return this.transaction.moveCall({
      target: `${ORACLE_PACKAGE_ID}::collector::new`,
      typeArguments: [COIN_TYPES[collateralSymbol]]
    });
  }
  /**
   * @description Get a price result
   * @param collateral coin symbol, e.g "IOTA"
   * @return [PriceResult]
   */
  async aggregatePrice(collateralSymbol) {
    const [collector] = this.newPriceCollector(collateralSymbol);
    const coinType = COIN_TYPES[collateralSymbol];
    const vaultInfo = VAULT_MAP[collateralSymbol];
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
        target: `${PYTH_RULE_PACKAGE_ID}::pyth_rule::feed`,
        typeArguments: [coinType],
        arguments: [
          collector,
          this.transaction.sharedObjectRef(PYTH_RULE_CONFIG_OBJ),
          this.transaction.sharedObjectRef(CLOCK_OBJ),
          this.transaction.object(PYTH_STATE_ID),
          this.transaction.object(priceInfoObjId)
        ]
      });
      return this.transaction.moveCall({
        target: `${ORACLE_PACKAGE_ID}::aggregater::aggregate`,
        typeArguments: [coinType],
        arguments: [
          this.transaction.sharedObjectRef(vaultInfo.priceAggregater),
          collector
        ]
      });
    } else if (collateralSymbol === "stIOTA") {
      const [collector2] = this.newPriceCollector("stIOTA");
      const [iotaPriceResult] = await this.aggregatePrice("IOTA");
      this.transaction.moveCall({
        target: `${CERT_RULE_PACKAGE_ID}::cert_rule::feed`,
        arguments: [
          collector2,
          iotaPriceResult,
          this.transaction.sharedObjectRef(CERT_NATIVE_POOL_OBJ),
          this.transaction.sharedObjectRef(CERT_METADATA_OBJ)
        ]
      });
      return this.transaction.moveCall({
        target: `${ORACLE_PACKAGE_ID}::aggregater::aggregate`,
        typeArguments: [COIN_TYPES.stIOTA],
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
   * @returns [UpdateRequest]
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
    const coinType = COIN_TYPES[collateralSymbol];
    const vaultId = VAULT_MAP[collateralSymbol].vault.objectId;
    const [accountReq] = this.newAccountRequest(accountObj);
    return this.transaction.moveCall({
      target: `${CDP_PACKAGE_ID}::request::debtor_request`,
      typeArguments: [coinType],
      arguments: [
        accountReq,
        this.transaction.sharedObjectRef(TREASURY_OBJ),
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
   * @returns [Coin<T>, COIN<VUSD>]
   */
  updatePosition(inputs) {
    const { collateralSymbol, updateRequest, priceResult } = inputs;
    const vault = VAULT_MAP[collateralSymbol].vault;
    const priceResultOpt = priceResult ? this.transaction.moveCall({
      target: `0x1::option::some`,
      typeArguments: [getPriceResultType(collateralSymbol)],
      arguments: [priceResult]
    }) : this.transaction.moveCall({
      target: `0x1::option::none`,
      typeArguments: [getPriceResultType(collateralSymbol)]
    });
    return this.transaction.moveCall({
      target: `${CDP_PACKAGE_ID}::vault::update_position`,
      typeArguments: [COIN_TYPES[collateralSymbol]],
      arguments: [
        this.transaction.sharedObjectRef(vault),
        this.transaction.sharedObjectRef(TREASURY_OBJ),
        this.transaction.sharedObjectRef(CLOCK_OBJ),
        priceResultOpt,
        updateRequest
      ]
    });
  }
  /**
   * @description check and destroy UpdateResponse
   * @param collateralSymbol: "IOTA" or "stIOTA"
   * @param response: UpdateResponse generated by update_position
   */
  checkResponse(inputs) {
    const { collateralSymbol, response } = inputs;
    let updateResponse = response;
    const vault = VAULT_MAP[collateralSymbol].vault;
    const vaultObj = this.transaction.sharedObjectRef(vault);
    const collateralType = COIN_TYPES[collateralSymbol];
    const rewarders = VAULT_MAP[collateralSymbol].rewarders;
    const globalConfigObj = this.transaction.sharedObjectRef(
      INCENTIVE_GLOBAL_CONFIG_OBJ
    );
    const registryObj = this.transaction.sharedObjectRef(
      VAULT_REWARDER_REGISTRY_OBJ
    );
    const clockObj = this.transaction.sharedObjectRef(CLOCK_OBJ);
    const checker = this.transaction.moveCall({
      target: `${INCENTIVE_PACKAGE_ID}::borrow_incentive::new_checker`,
      typeArguments: [collateralType],
      arguments: [registryObj, globalConfigObj, updateResponse]
    });
    (rewarders ?? []).map((rewarder) => {
      const rewardType = COIN_TYPES[rewarder.rewardSymbol];
      this.transaction.moveCall({
        target: `${INCENTIVE_PACKAGE_ID}::borrow_incentive::update`,
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
      target: `${INCENTIVE_PACKAGE_ID}::borrow_incentive::destroy_checker`,
      typeArguments: [collateralType],
      arguments: [checker, globalConfigObj]
    });
    updateResponse = responseAfterIncentive;
    this.transaction.moveCall({
      target: `${CDP_PACKAGE_ID}::vault::destroy_response`,
      typeArguments: [COIN_TYPES[collateralSymbol]],
      arguments: [
        vaultObj,
        this.transaction.sharedObjectRef(TREASURY_OBJ),
        updateResponse
      ]
    });
  }
  /**
   * @description deposit to stability pool
   * @param vusdCoin: coin of VUSD
   * @param recipient (optional): deposit for recipient instead of sender
   * @returns [PositionResponse]
   */
  depositStabilityPool(inputs) {
    const { vusdCoin, recipient } = inputs;
    return this.transaction.moveCall({
      target: `${STABILITY_POOL_PACKAGE_ID}::stability_pool::deposit`,
      arguments: [
        this.transaction.sharedObjectRef(STABILITY_POOL_OBJ),
        this.transaction.sharedObjectRef(CLOCK_OBJ),
        this.transaction.pure.address(recipient ?? this.sender),
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
    const [accountReq] = accountRequest ? [accountRequest] : this.newAccountRequest(accountObj);
    return this.transaction.moveCall({
      target: `${STABILITY_POOL_PACKAGE_ID}::stability_pool::withdraw`,
      arguments: [
        this.transaction.sharedObjectRef(STABILITY_POOL_OBJ),
        this.transaction.sharedObjectRef(CLOCK_OBJ),
        accountReq,
        this.transaction.pure.u64(amount)
      ]
    });
  }
  /**
   * @description claim from stability pool
   */
  claimStabilityPool(inputs) {
    const { accountRequest, accountObj } = inputs;
    const [accountReq] = accountRequest ? [accountRequest] : this.newAccountRequest(accountObj);
    const collCoins = Object.keys(VAULT_MAP).map((collSymbol) => {
      const collType = COIN_TYPES[collSymbol];
      const [collCoin] = this.transaction.moveCall({
        target: `${STABILITY_POOL_OBJ}::stability_pool::claim`,
        typeArguments: [collType],
        arguments: [
          this.transaction.sharedObjectRef(STABILITY_POOL_OBJ),
          accountReq
        ]
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
    const globalConfigObj = this.transaction.sharedObjectRef(
      INCENTIVE_GLOBAL_CONFIG_OBJ
    );
    const registryObj = this.transaction.sharedObjectRef(
      POOL_REWARDER_REGISTRY_OBJ
    );
    const clockObj = this.transaction.sharedObjectRef(CLOCK_OBJ);
    const checker = this.transaction.moveCall({
      target: `${INCENTIVE_PACKAGE_ID}::stability_pool_incentive::new_checker`,
      arguments: [registryObj, globalConfigObj, positionResponse]
    });
    (STABILITY_POOL_REWARDERS ?? []).map((rewarder) => {
      const rewardType = COIN_TYPES[rewarder.rewardSymbol];
      this.transaction.moveCall({
        target: `${INCENTIVE_PACKAGE_ID}::stability_pool_incentive::update`,
        typeArguments: [rewardType],
        arguments: [
          checker,
          globalConfigObj,
          this.transaction.sharedObjectRef(STABILITY_POOL_OBJ),
          this.transaction.sharedObjectRef(rewarder),
          clockObj
        ]
      });
    });
    const [responseAfterIncentive] = this.transaction.moveCall({
      target: `${INCENTIVE_PACKAGE_ID}::stability_pool_incentive::destroy_checker`,
      arguments: [checker, globalConfigObj]
    });
    positionResponse = responseAfterIncentive;
    this.transaction.moveCall({
      target: `${STABILITY_POOL_PACKAGE_ID}::stability_pool::check_response`,
      arguments: [
        this.transaction.sharedObjectRef(STABILITY_POOL_OBJ),
        positionResponse
      ]
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
    this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const {
      collateralSymbol,
      depositAmount,
      borrowAmount,
      repaymentAmount,
      withdrawAmount,
      accountObjId,
      recipient
    } = inputs;
    const coinType = COIN_TYPES[collateralSymbol];
    const [depositCoin] = await this.splitInputCoins(
      collateralSymbol,
      depositAmount
    );
    const [repaymentCoin] = await this.splitInputCoins("VUSD", repaymentAmount);
    if (Number(borrowAmount) > 0 || Number(withdrawAmount) > 0) {
      const [priceResult] = await this.aggregatePrice(collateralSymbol);
      const [updateRequest] = this.debtorRequest({
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
      this.checkResponse({ collateralSymbol, response });
      if (Number(withdrawAmount) > 0) {
        this.transaction.transferObjects([collCoin], recipient ?? this.sender);
      } else {
        this.transaction.moveCall({
          target: "0x2::coin::destroy_zero",
          typeArguments: [coinType],
          arguments: [collCoin]
        });
      }
      if (Number(borrowAmount) > 0) {
        if (recipient === "StabilityPool") {
          const [response2] = this.depositStabilityPool({ vusdCoin, recipient });
          this.checkResponseForStabilityPool(response2);
        } else {
          this.transaction.transferObjects(
            [vusdCoin],
            recipient ?? this.sender
          );
        }
      } else {
        this.transaction.moveCall({
          target: "0x2::coin::destroy_zero",
          typeArguments: [COIN_TYPES.VUSD],
          arguments: [vusdCoin]
        });
      }
      const tx = this.getTransaction();
      this.resetTransaction();
      return tx;
    } else {
      const [updateRequest] = this.debtorRequest({
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
      this.checkResponse({ collateralSymbol, response });
      this.transaction.moveCall({
        target: "0x2::coin::destroy_zero",
        typeArguments: [coinType],
        arguments: [collCoin]
      });
      this.transaction.moveCall({
        target: "0x2::coin::destroy_zero",
        typeArguments: [COIN_TYPES.VUSD],
        arguments: [vusdCoin]
      });
      const tx = this.getTransaction();
      this.resetTransaction();
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
    this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const { collateralSymbol, accountObjId, recipient } = inputs;
    const collType = COIN_TYPES[collateralSymbol];
    const vaultObj = VAULT_MAP[collateralSymbol].vault;
    const [collAmount, debtAmount] = this.transaction.moveCall({
      target: `${CDP_PACKAGE_ID}::vault::get_position_data`,
      typeArguments: [collType],
      arguments: [
        this.transaction.sharedObjectRef(vaultObj),
        this.transaction.pure.address(this.sender),
        this.transaction.sharedObjectRef(CLOCK_OBJ)
      ]
    });
    const repaymentCoin = await this.splitInputCoins("VUSD", debtAmount);
    const [updateRequest] = this.debtorRequest({
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
    this.checkResponse({ collateralSymbol, response });
    this.transaction.moveCall({
      target: "0x2::coin::destroy_zero",
      typeArguments: [COIN_TYPES.VUSD],
      arguments: [vusdCoin]
    });
    this.transaction.transferObjects(
      [collCoin],
      recipient ?? this.transaction.pure.address(this.sender)
    );
    const tx = this.getTransaction();
    this.resetTransaction();
    return tx;
  }
  /**
   * @description build and return Transaction of deposit stability pool
   * @param depositAmount: how much amount to deposit (collateral)
   * @returns Transaction
   */
  async buildDepositStabilityPoolTransaction(inputs) {
    this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const { depositAmount, recipient } = inputs;
    const [vusdCoin] = await this.splitInputCoins("VUSD", depositAmount);
    const [response] = this.depositStabilityPool({ vusdCoin, recipient });
    this.checkResponseForStabilityPool(response);
    const tx = this.getTransaction();
    this.resetTransaction();
    return tx;
  }
  /**
   * @description build and return Transaction of withdraw stability pool
   * @param withdrawAmount: how much amount to withdraw (collateral)
   * @returns Transaction
   */
  async buildWithdrawStabilityPoolTransaction(inputs) {
    this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const { withdrawAmount: amount, accountObj } = inputs;
    const [vusdOut, response] = this.withdrawStabilityPool({
      amount,
      accountObj
    });
    this.checkResponseForStabilityPool(response);
    this.transaction.transferObjects([vusdOut], this.sender);
    const tx = this.getTransaction();
    this.resetTransaction();
    return tx;
  }
  /**
   * @description build and return Transaction of withdraw stability pool
   * @param withdrawAmount: how much amount to withdraw (collateral)
   * @returns Transaction
   */
  async buildClaimStabilityPoolTransaction(inputs) {
    this.resetTransaction();
    if (!this.sender) throw new Error("Sender is not set");
    this.transaction.setSender(this.sender);
    const collCoins = this.claimStabilityPool(inputs);
    this.transaction.transferObjects(collCoins, this.sender);
    const tx = this.getTransaction();
    this.resetTransaction();
    return tx;
  }
  /**
   * @description claim the rewards from borrow incentive program
   */
  buildClaimBorrowRewards(inputs) {
    this.resetTransaction();
    const { accountObj } = inputs;
    const [accountReq] = this.newAccountRequest(accountObj);
    const globalConfigObj = this.transaction.sharedObjectRef(
      INCENTIVE_GLOBAL_CONFIG_OBJ
    );
    const clockObj = this.transaction.sharedObjectRef(CLOCK_OBJ);
    Object.keys(VAULT_MAP).map((collSymbol) => {
      const vaultInfo = VAULT_MAP[collSymbol];
      const rewarders = vaultInfo.rewarders;
      const vaultObj = this.transaction.sharedObjectRef(vaultInfo.vault);
      if (rewarders) {
        rewarders.map((rewarder) => {
          const [reward] = this.transaction.moveCall({
            target: `${INCENTIVE_PACKAGE_ID}::borrow_incentive::claim`,
            typeArguments: [COIN_TYPES[rewarder.rewardSymbol]],
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
    this.resetTransaction();
    return tx;
  }
  /**
   * @description claim the rewards from stability pool incentive program
   */
  buildClaimStabilityPoolRewards(inputs) {
    this.resetTransaction();
    const { accountObj } = inputs;
    const [accountReq] = this.newAccountRequest(accountObj);
    const globalConfigObj = this.transaction.sharedObjectRef(
      INCENTIVE_GLOBAL_CONFIG_OBJ
    );
    const clockObj = this.transaction.sharedObjectRef(CLOCK_OBJ);
    const stabilityPoolObj = this.transaction.sharedObjectRef(STABILITY_POOL_OBJ);
    STABILITY_POOL_REWARDERS.map((rewarder) => {
      const [reward] = this.transaction.moveCall({
        target: `${INCENTIVE_PACKAGE_ID}::stability_pool_incentive::claim`,
        typeArguments: [COIN_TYPES[rewarder.rewardSymbol]],
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
    this.resetTransaction();
    return tx;
  }
};
export {
  CDP_PACKAGE_ID,
  CERT_METADATA_OBJ,
  CERT_NATIVE_POOL_OBJ,
  CERT_RULE_PACKAGE_ID,
  CLOCK_OBJ,
  COIN_DECIMALS,
  COIN_TYPES,
  FRAMEWORK_PACKAGE_ID,
  INCENTIVE_GLOBAL_CONFIG_OBJ,
  INCENTIVE_PACKAGE_ID,
  ORACLE_PACKAGE_ID,
  ORIGINAL_CDP_PACKAGE_ID,
  ORIGINAL_FRAMEWORK_PACKAGE_ID,
  ORIGINAL_INCENTIVE_PACKAGE_ID,
  ORIGINAL_ORACLE_PACKAGE_ID,
  ORIGINAL_STABILITY_POOL_PACKAGE_ID,
  ORIGINAL_VUSD_PACKAGE_ID,
  ObjectContentFields,
  POOL_REWARDER_REGISTRY_OBJ,
  PYTH_RULE_CONFIG_OBJ,
  PYTH_RULE_PACKAGE_ID,
  PYTH_STATE_ID,
  STABILITY_POOL_OBJ,
  STABILITY_POOL_PACKAGE_ID,
  STABILITY_POOL_REWARDERS,
  STABILITY_POOL_TABLE_ID,
  TREASURY_OBJ,
  U64FromBytes,
  VAULT_MAP,
  VAULT_REWARDER_REGISTRY_OBJ,
  VUSD_PACKAGE_ID,
  VirtueClient,
  WORMHOLE_STATE_ID,
  formatBigInt,
  formatUnits,
  getCoinSymbol,
  getCoinType,
  getIotaObjectData,
  getMoveObject,
  getObjectFields,
  getObjectGenerics,
  getObjectNames,
  getPriceResultType,
  parseUnits,
  parseVaultObject
};
//# sourceMappingURL=index.js.map