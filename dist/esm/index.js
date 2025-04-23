// src/client.ts
import { getFullnodeUrl, IotaClient } from "@iota/iota-sdk/client";

// src/constants/coin.ts
var COINS_TYPE_LIST = {
  IOTA: "0x0000000000000000000000000000000000000000000000000002::iota::IOTA",
  stIOTA: "0x14f9e69c0076955d5a056260c9667edab184650dba9919f168a37030dd956dc6::cert::CERT",
  VUSD: "0x929065320c756b8a4a841deeed013bd748ee45a28629c4aaafc56d8948ebb081::vusd::VUSD"
};
var COIN_DECIMALS = {
  IOTA: 9,
  stIOTA: 9,
  VUSD: 6
};

// src/constants/object.ts
var ORIGINAL_FRAMEWORK_PACKAGE_ID = "0x6f8dd0377fe5469cd3456350ca13ae1799655fda06e90191b73ab1c0c0165e8f";
var ORIGINAL_VUSD_PACKAGE_ID = "0x929065320c756b8a4a841deeed013bd748ee45a28629c4aaafc56d8948ebb081";
var ORIGINAL_ORACLE_PACKAGE_ID = "0x3eb4e0b2c57fe9844db30c6bb2b775ed18fd775dd9d48955b78bcd0ac0ba8954";
var ORIGINAL_CDP_PACKAGE_ID = "0x0731a9f5cbdb0a4aea3f540280a1a266502017867734240e29edc813074e7f60";
var FRAMEWORK_PACKAGE_ID = "0x6f8dd0377fe5469cd3456350ca13ae1799655fda06e90191b73ab1c0c0165e8f";
var VUSD_PACKAGE_ID = "0x929065320c756b8a4a841deeed013bd748ee45a28629c4aaafc56d8948ebb081";
var ORACLE_PACKAGE_ID = "0xbc672e6330ab22078715f86e952ef1353d9f9b217c4579e47ce29eaec6f92655";
var CDP_PACKAGE_ID = "0x047ea5037499b28cc3e51d9d92af2962679cb5453fcec710dd9db36af0e2100e";
var CLOCK_OBJ = {
  objectId: "0x0000000000000000000000000000000000000000000000000000000000000006",
  mutable: false,
  initialSharedVersion: 1
};
var TREASURY_OBJ = {
  objectId: "0x4e2e41f0158bce26c8e8ccc62be3ab5326d8b294a2bcccfbe0e7298885f66eb7",
  mutable: true,
  initialSharedVersion: 190869396
};
var CDP_VERSION_OBJ = {
  objectId: "0xb67e79921b2b71e77e5bd1adf28c9d47a8ad5bd22e024bbd90797514c39b068d",
  mutable: false,
  initialSharedVersion: 190869403
};
var VAULT_MAP = {
  IOTA: {
    priceAggregater: {
      objectId: "0x9f3c9d72993efd5e2e543ad69bdc0bbe1bd9873c3a61fdf32c0cf48660a5f2c8",
      mutable: true,
      initialSharedVersion: 190869399
    },
    vault: {
      objectId: "0xbbf7b7667aca64405e8756f6974f41bd648bd1bc40dfc2b1cfe2d6ec419eedb1",
      mutable: true,
      initialSharedVersion: 237544284
    }
  },
  stIOTA: {
    priceAggregater: {
      objectId: "0xad71067ef6b3724bf9db065e40f5e34ebf1252e203a964b04b22cef0b953ebff",
      mutable: true,
      initialSharedVersion: 237544292
    },
    vault: {
      objectId: "0xdef4f5ec71ad943a536b4032a7c64003c9c580c278eb564d381e8f8014e6970c",
      mutable: true,
      initialSharedVersion: 245030868
    }
  }
};
var TESTNET_PRICE_PACKAGE_ID = "0x2de2d918f5940978dc53aae2ea0687a4ca8a6736bd525f15ee17e9529048fa92";
var TESTNET_PRICE_FEED_OBJ = {
  objectId: "0x05cc35b8d331a3893f80b9ca6c70c3b75298e9cbf1b5d707b6d18c40b0b3da5d",
  mutable: false,
  initialSharedVersion: 190869400
};

// src/utils/format.ts
function getObjectNames(objectTypes) {
  const accept_coin_type = Object.values(COINS_TYPE_LIST);
  const accept_coin_name = Object.keys(COINS_TYPE_LIST);
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
    return str.slice(startIndex + 1, endIndex);
  }
  return null;
};
var getCoinTypeFromTank = (tankType) => {
  const tankGroup = tankType.split("::tank::Tank");
  if (tankGroup.length < 2) return null;
  const coinGroup = (getCoinType(tankGroup[1]) ?? "").split(", ");
  if (coinGroup.length < 2) return null;
  const coinType = coinGroup[1].trim();
  return coinType;
};
var getCoinTypeFromPipe = (pipeType) => {
  const pipeGroup = pipeType.split("::pipe::Pipe");
  if (pipeGroup.length < 2) return null;
  const coinGroup = (getCoinType(pipeGroup[1]) ?? "").split(", ");
  if (coinGroup.length < 2) return null;
  const coinType = coinGroup[0].trim();
  return coinType;
};
var getCoinSymbol = (coinType) => {
  const coin = Object.keys(COINS_TYPE_LIST).find(
    (key) => COINS_TYPE_LIST[key] === coinType
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
  return `${ORIGINAL_ORACLE_PACKAGE_ID}::result::PriceResult<${COINS_TYPE_LIST[coinSymbol]}>`;
};

// src/utils/coin.ts
function coinIntoBalance(tx, coinType, coinInput) {
  if (coinInput) {
    return tx.moveCall({
      target: "0x2::coin::into_balance",
      typeArguments: [coinType],
      arguments: [coinInput]
    });
  } else {
    return tx.moveCall({
      target: "0x2::balance::zero",
      typeArguments: [coinType]
    });
  }
}
function coinFromBalance(tx, coinType, balanceInput) {
  return tx.moveCall({
    target: "0x2::coin::from_balance",
    typeArguments: [coinType],
    arguments: [balanceInput]
  });
}
async function getInputCoins(tx, client, owner, coinType, ...amounts) {
  let isZero = true;
  for (const amount of amounts) {
    if (Number(amount) > 0) {
      isZero = false;
      break;
    }
  }
  if (isZero) {
    return tx.moveCall({
      target: `0x2::coin::zero`,
      typeArguments: [coinType]
    });
  }
  if (coinType === COINS_TYPE_LIST.IOTA) {
    return tx.splitCoins(
      tx.gas,
      amounts.map((amount) => tx.pure.u64(amount))
    );
  } else {
    const { data: userCoins } = await client.getCoins({ owner, coinType });
    const [mainCoin, ...otherCoins] = userCoins.map(
      (coin) => tx.objectRef({
        objectId: coin.coinObjectId,
        version: coin.version,
        digest: coin.digest
      })
    );
    if (!mainCoin) {
      return tx.moveCall({
        target: `0x2::coin::zero`,
        typeArguments: [coinType]
      });
    }
    if (otherCoins.length > 0) tx.mergeCoins(mainCoin, otherCoins);
    return tx.splitCoins(
      mainCoin,
      amounts.map((amount) => tx.pure.u64(amount))
    );
  }
}
async function getMainCoin(tx, client, owner, coinType) {
  if (coinType === COINS_TYPE_LIST.IOTA) {
    return void 0;
  }
  const { data: userCoins } = await client.getCoins({ owner, coinType });
  const [mainCoin, ...otherCoins] = userCoins.map(
    (coin) => tx.objectRef({
      objectId: coin.coinObjectId,
      version: coin.version,
      digest: coin.digest
    })
  );
  if (!mainCoin) {
    return tx.moveCall({
      target: `0x2::coin::zero`,
      typeArguments: [coinType]
    });
  }
  if (otherCoins.length > 0) tx.mergeCoins(mainCoin, otherCoins);
  return mainCoin;
}

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
  const vault = {
    token: coinSymbol,
    baseFeeRate: Number(fields.position_table.fields.fee_rate ?? 3e6) / 10 ** 9,
    bottleTableSize: fields.position_table.fields.table.fields.size,
    bottleTableId: fields.position_table.fields.table.fields.id.id,
    collateralDecimal: Number(fields.decimal),
    collateralVault: fields.balance,
    latestRedemptionTime: Number(fields.position_table.fields.timestamp),
    minCollateralRatio: fields.liquidation_config.fields.mcr.fields.value,
    mintedBuckAmount: fields.limited_supply.fields.supply,
    maxMintAmount: fields.limited_supply.fields.limit,
    recoveryModeThreshold: fields.liquidation_config.fields.ccr.fields.value,
    minBottleSize: fields.min_debt_amount
  };
  return vault;
};
var parsePositionObject = (coinSymbol, fields) => {
  const position = {
    token: coinSymbol,
    collAmount: fields.coll_amount,
    debtAmount: fields.debt_amount
  };
  return position;
};

// src/client.ts
var DUMMY_ADDRESS = "0x0";
var VirtueClient = class {
  constructor(network = "mainnet", owner = DUMMY_ADDRESS) {
    this.network = network;
    this.owner = owner;
    if (network == "mainnet" || network == "testnet" || network == "devnet" || network == "localnet") {
      this.rpcEndpoint = getFullnodeUrl(network);
    } else {
      this.rpcEndpoint = network;
    }
    this.client = new IotaClient({ url: this.rpcEndpoint });
  }
  getClient() {
    return this.client;
  }
  // Query
  /**
   * @description Get all vault objects
   */
  async getAllVaults() {
    const vaultObjectIds = Object.values(VAULT_MAP).map(
      (v) => v.vault.objectId
    );
    const vaultResults = await this.client.multiGetObjects({
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
    const res = await this.client.getObject({
      id: VAULT_MAP[token].vault.objectId,
      options: {
        showContent: true
      }
    });
    const fields = getObjectFields(res);
    return parseVaultObject(token, fields);
  }
  async getPositionsByDebtor(debtor) {
    const vaults = await this.getAllVaults();
    const positions = [];
    for (const vault of Object.values(vaults)) {
      const tableId = vault.bottleTableId;
      const res = await this.client.getDynamicFieldObject({
        parentId: tableId,
        name: {
          type: "address",
          value: debtor
        }
      });
      const obj = getObjectFields(res);
      if (!obj) continue;
      const response = getObjectFields(
        obj.value.fields.value
      );
      positions.push(parsePositionObject(vault.token, response));
    }
    return positions;
  }
  async getPosition(debtor, coinSymbol) {
    const vaultInfo = await this.getVault(coinSymbol);
    const tableId = vaultInfo.bottleTableId;
    const res = await this.client.getDynamicFieldObject({
      parentId: tableId,
      name: {
        type: "address",
        value: debtor
      }
    });
    const obj = getObjectFields(res);
    if (!obj) return;
    const response = getObjectFields(
      obj.value.fields.value
    );
    return parsePositionObject(coinSymbol, response);
  }
  /**
   * @description Create a price collector
   * @param collateral coin symbol, e.g "IOTA"
   */
  newPriceCollector(tx, coinSymbol) {
    return tx.moveCall({
      target: `${ORACLE_PACKAGE_ID}::collector::new`,
      typeArguments: [COINS_TYPE_LIST[coinSymbol]]
    });
  }
  /**
   * @description Get a price result
   * @param collateral coin symbol, e.g "IOTA"
   */
  aggregatePrice(tx, coinSymbol) {
    const [collector] = this.newPriceCollector(tx, coinSymbol);
    const coinType = COINS_TYPE_LIST[coinSymbol];
    tx.moveCall({
      target: `${TESTNET_PRICE_PACKAGE_ID}::testnet_price::self_price`,
      typeArguments: [coinType],
      arguments: [tx.sharedObjectRef(TESTNET_PRICE_FEED_OBJ), collector]
    });
    const aggregater = tx.sharedObjectRef(
      VAULT_MAP[coinSymbol].priceAggregater
    );
    return tx.moveCall({
      target: `${ORACLE_PACKAGE_ID}::aggregater::aggregate`,
      typeArguments: [coinType],
      arguments: [aggregater, collector]
    });
  }
  /**
   * @description Get a request to Mange Position
   * @param tx
   * @param collateral coin symbol , e.g "IOTA"
   * @param collateral input coin
   * @param the amount to borrow
   * @param repyment input coin (always VUSD)
   * @param the amount to withdraw
   * @returns ManageRequest
   */
  requestManagePosition(tx, coinSymbol, depositCoin, borrowAmount, repaymentCoin, withdrawAmount, accountObj) {
    const coinType = COINS_TYPE_LIST[coinSymbol];
    const [accountReq] = accountObj ? tx.moveCall({
      target: `${FRAMEWORK_PACKAGE_ID}::account::request_with_account`,
      arguments: [
        typeof accountObj === "string" ? tx.object(accountObj) : accountObj
      ]
    }) : tx.moveCall({
      target: `${FRAMEWORK_PACKAGE_ID}::account::request`
    });
    return tx.moveCall({
      target: `${CDP_PACKAGE_ID}::manage::request`,
      typeArguments: [coinType],
      arguments: [
        tx.sharedObjectRef(CDP_VERSION_OBJ),
        accountReq,
        depositCoin,
        tx.pure.u64(borrowAmount),
        repaymentCoin,
        tx.pure.u64(withdrawAmount)
      ]
    });
  }
  /**
   * @description Manage Position
   * @param tx
   * @param collateral coin symbol , e.g "IOTA"
   * @param manager request, see this.requestManagePosition
   * @param price result, see this.getPriceResult
   * @param the position place to insert
   * @returns [Coin<T>, COIN<VUSD>]
   */
  managePosition(tx, coinSymbol, manageRequest, priceResult, insertionPlace) {
    const vault = VAULT_MAP[coinSymbol].vault;
    const priceResultOpt = priceResult ? tx.moveCall({
      target: `0x1::option::some`,
      typeArguments: [getPriceResultType(coinSymbol)],
      arguments: [priceResult]
    }) : tx.moveCall({
      target: `0x1::option::none`,
      typeArguments: [getPriceResultType(coinSymbol)]
    });
    return tx.moveCall({
      target: `${CDP_PACKAGE_ID}::vault::manage_position`,
      typeArguments: [COINS_TYPE_LIST[coinSymbol]],
      arguments: [
        tx.sharedObjectRef(vault),
        tx.sharedObjectRef(CDP_VERSION_OBJ),
        tx.sharedObjectRef(TREASURY_OBJ),
        tx.sharedObjectRef(CLOCK_OBJ),
        priceResultOpt,
        manageRequest,
        tx.pure.option("address", insertionPlace)
      ]
    });
  }
};

// src/builder.ts
async function buildManagePositionTx(client, tx, sender, collateralSymbol, collateralAmount, borrowAmount, repaymentAmount, withrawAmount, insertionPlace, accountObjId, recipient) {
  const iotaClient = client.getClient();
  const coinType = COINS_TYPE_LIST[collateralSymbol];
  const [depositCoin] = await getInputCoins(
    tx,
    iotaClient,
    sender,
    coinType,
    collateralAmount
  );
  const [repaymentCoin] = await getInputCoins(
    tx,
    iotaClient,
    sender,
    COINS_TYPE_LIST.VUSD,
    repaymentAmount
  );
  const [priceResult] = Number(borrowAmount) > 0 || Number(withrawAmount) > 0 ? client.aggregatePrice(tx, collateralSymbol) : [void 0];
  const [manageRequest] = client.requestManagePosition(
    tx,
    collateralSymbol,
    depositCoin,
    borrowAmount,
    repaymentCoin,
    withrawAmount,
    accountObjId
  );
  const [collCoin, vusdCoin] = client.managePosition(
    tx,
    collateralSymbol,
    manageRequest,
    priceResult,
    insertionPlace
  );
  tx.transferObjects([collCoin, vusdCoin], recipient ?? sender);
}
export {
  CDP_PACKAGE_ID,
  CDP_VERSION_OBJ,
  CLOCK_OBJ,
  COINS_TYPE_LIST,
  COIN_DECIMALS,
  FRAMEWORK_PACKAGE_ID,
  ORACLE_PACKAGE_ID,
  ORIGINAL_CDP_PACKAGE_ID,
  ORIGINAL_FRAMEWORK_PACKAGE_ID,
  ORIGINAL_ORACLE_PACKAGE_ID,
  ORIGINAL_VUSD_PACKAGE_ID,
  ObjectContentFields,
  TESTNET_PRICE_FEED_OBJ,
  TESTNET_PRICE_PACKAGE_ID,
  TREASURY_OBJ,
  U64FromBytes,
  VAULT_MAP,
  VUSD_PACKAGE_ID,
  VirtueClient,
  buildManagePositionTx,
  coinFromBalance,
  coinIntoBalance,
  formatUnits,
  getCoinSymbol,
  getCoinType,
  getCoinTypeFromPipe,
  getCoinTypeFromTank,
  getInputCoins,
  getIotaObjectData,
  getMainCoin,
  getMoveObject,
  getObjectFields,
  getObjectGenerics,
  getObjectNames,
  getPriceResultType,
  parsePositionObject,
  parseUnits,
  parseVaultObject
};
//# sourceMappingURL=index.js.map