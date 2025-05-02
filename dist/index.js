"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// src/client.ts
var _client = require('@iota/iota-sdk/client');

// src/constants/coin.ts
var COINS_TYPE_LIST = {
  IOTA: "0x0000000000000000000000000000000000000000000000000000000000000002::iota::IOTA",
  stIOTA: "0x1461ef74f97e83eb024a448ab851f980f4e577a97877069c72b44b5fe9929ee3::cert::CERT",
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
var ORIGINAL_LIQUIDATION_PACKAGE_ID = "0x3b79a39a58128d94bbf2021e36b31485898851909c8167ab0df10fb2824a0f83";
var FRAMEWORK_PACKAGE_ID = "0x6f8dd0377fe5469cd3456350ca13ae1799655fda06e90191b73ab1c0c0165e8f";
var VUSD_PACKAGE_ID = "0x929065320c756b8a4a841deeed013bd748ee45a28629c4aaafc56d8948ebb081";
var ORACLE_PACKAGE_ID = "0xbc672e6330ab22078715f86e952ef1353d9f9b217c4579e47ce29eaec6f92655";
var CDP_PACKAGE_ID = "0xc0d51cf05743fafd185d275d42df0845549af03c0b5f8961a5f33f70c9b5368d";
var LIQUIDATION_PACKAGE_ID = "0x3b79a39a58128d94bbf2021e36b31485898851909c8167ab0df10fb2824a0f83";
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
      objectId: "0x0898681c27fa8912905f97a9803c63d7e56abcbac7175f686325eddb215efebd",
      mutable: true,
      initialSharedVersion: 246871816
    },
    vault: {
      objectId: "0xc6b28c98e0c1c6fa282affd3b8db8e9a5ed143aed4e3b5bd1d1bc6f34dad3861",
      mutable: true,
      initialSharedVersion: 246871815
    }
  }
};
var STABILITY_POOL_OBJ = {
  objectId: "0x963b3d757dcd5ad14773a503eb481143b64d3686aebdf6a90443d908582188e0",
  initialSharedVersion: 252695564,
  mutable: true
};
var TESTNET_PRICE_PACKAGE_ID = "0x2de2d918f5940978dc53aae2ea0687a4ca8a6736bd525f15ee17e9529048fa92";
var TESTNET_PRICE_FEED_OBJ = {
  objectId: "0x05cc35b8d331a3893f80b9ca6c70c3b75298e9cbf1b5d707b6d18c40b0b3da5d",
  mutable: false,
  initialSharedVersion: 190869400
};

// src/utils/format.ts
var _utils = require('@iota/iota-sdk/utils');
function getObjectNames(objectTypes) {
  const accept_coin_type = Object.values(COINS_TYPE_LIST);
  const accept_coin_name = Object.keys(COINS_TYPE_LIST);
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
var getCoinType = (str) => {
  const startIndex = str.indexOf("<");
  const endIndex = str.lastIndexOf(">");
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    const coinType = str.slice(startIndex + 1, endIndex);
    return coinType === "0x2::iota::IOTA" ? COINS_TYPE_LIST.IOTA : coinType;
  }
  return null;
};
var getCoinSymbol = (coinType) => {
  const coin = Object.keys(COINS_TYPE_LIST).find(
    (key) => _utils.normalizeIotaAddress.call(void 0, COINS_TYPE_LIST[key]) === _utils.normalizeIotaAddress.call(void 0, coinType)
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
  const vault = {
    token: coinSymbol,
    bottleTableSize: fields.position_table.fields.table.fields.size,
    bottleTableId: fields.position_table.fields.table.fields.id.id,
    collateralDecimal: Number(fields.decimal),
    collateralVault: fields.balance,
    latestRedemptionTime: Number(fields.position_table.fields.timestamp),
    mintedAmount: fields.limited_supply.fields.supply,
    maxMintAmount: fields.limited_supply.fields.limit,
    baseFeeRate: formatBigInt(
      _nullishCoalesce(fields.position_table.fields.fee_rate.fields.value, () => ( 3e6))
    ),
    interestRate: formatBigInt(
      fields.position_table.fields.interest_rate.fields.value
    ),
    minCollateralRatio: formatBigInt(
      fields.liquidation_config.fields.mcr.fields.value
    ),
    recoveryModeThreshold: formatBigInt(
      fields.liquidation_config.fields.ccr.fields.value
    ),
    minBottleSize: fields.min_debt_amount
  };
  return vault;
};
var parsePositionObject = (resp) => {
  const collateral = getCoinSymbol(_nullishCoalesce(getCoinType(resp.type), () => ( "")));
  if (!collateral) {
    return;
  }
  return {
    collateral,
    collAmount: (+resp.fields.coll_amount + resp.fields.interest_buffer).toString(),
    debtAmount: resp.fields.debt_amount
  };
};

// src/client.ts
var DUMMY_ADDRESS = "0x0";
var VirtueClient = class {
  constructor(network = "mainnet", owner = DUMMY_ADDRESS) {
    this.network = network;
    this.owner = owner;
    if (network == "mainnet" || network == "testnet" || network == "devnet" || network == "localnet") {
      this.rpcEndpoint = _client.getFullnodeUrl.call(void 0, network);
    } else {
      this.rpcEndpoint = network;
    }
    this.client = new (0, _client.IotaClient)({ url: this.rpcEndpoint });
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
        (key) => VAULT_MAP[key].vault.objectId === _optionalChain([res, 'access', _15 => _15.data, 'optionalAccess', _16 => _16.objectId])
      );
      if (!token) return acc;
      const vault = parseVaultObject(token, fields);
      acc[vault.token] = vault;
      return acc;
    }, {});
    return vaults;
  }
  /**
   * @description Get prices from oracle
   */
  async getPrices() {
    const res = await this.client.getObject({
      id: TESTNET_PRICE_FEED_OBJ.objectId,
      options: {
        showContent: true
      }
    });
    const mapObj = getObjectFields(res);
    const fields = mapObj.price_map.fields.contents;
    const prices = {
      IOTA: 0,
      stIOTA: 0,
      VUSD: 1
    };
    for (const field of fields) {
      const coinType = `0x${field.fields.key.fields.name}`;
      const symbol = getCoinSymbol(coinType);
      if (!symbol) continue;
      prices[symbol] = formatBigInt(field.fields.value.fields.value);
    }
    return prices;
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
      const response = obj.value.fields.value;
      const position = parsePositionObject(response);
      if (position) {
        positions.push(position);
      }
    }
    return positions;
  }
  async getPosition(debtor, collateral) {
    const vaultInfo = await this.getVault(collateral);
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
    return parsePositionObject(response);
  }
  async getStabilityPoolBalance(account) {
    const tokensRes = await this.client.getOwnedObjects({
      owner: account,
      filter: {
        StructType: `${ORIGINAL_LIQUIDATION_PACKAGE_ID}::stablility_pool::StabilityToken`
      },
      options: {
        showContent: true
      }
    });
    if (tokensRes.data) {
      const vusdBalances = tokensRes.data.map((token) => {
        const tokenFields = getObjectFields(token);
        if (tokenFields) {
          return formatBigInt(tokenFields.amount, COIN_DECIMALS.VUSD);
        } else {
          return 0;
        }
      });
      return {
        vusdBalance: vusdBalances.reduce((x, y) => x + y, 0),
        collBalances: {
          IOTA: 0,
          stIOTA: 0
        }
      };
    } else {
      return {
        vusdBalance: 0,
        collBalances: {
          IOTA: 0,
          stIOTA: 0
        }
      };
    }
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
  depositStabilityPool(tx, vusdCoin) {
    return tx.moveCall({
      target: `${LIQUIDATION_PACKAGE_ID}::stablility_pool::deposit`,
      arguments: [tx.sharedObjectRef(STABILITY_POOL_OBJ), vusdCoin]
    });
  }
  withdrawStabilityPool(tx, tokens, amount) {
    const stabilityPool = tx.sharedObjectRef(STABILITY_POOL_OBJ);
    const [mainCoin, ...otherCoins] = tokens.map((token2) => {
      const [vusdCoin] = tx.moveCall({
        target: `${LIQUIDATION_PACKAGE_ID}::stablility_pool::withdraw`,
        arguments: [stabilityPool, token2]
      });
      return vusdCoin;
    });
    if (otherCoins.length > 0) {
      tx.mergeCoins(mainCoin, otherCoins);
    }
    const [redepositCoin] = tx.splitCoins(mainCoin, [amount]);
    const [token] = this.depositStabilityPool(tx, redepositCoin);
    return [mainCoin, token];
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
  if (recipient === "StabilityPool") {
    client.depositStabilityPool(tx, vusdCoin);
    tx.transferObjects([collCoin], _nullishCoalesce(recipient, () => ( sender)));
  } else {
    tx.transferObjects([collCoin, vusdCoin], _nullishCoalesce(recipient, () => ( sender)));
  }
}
async function buildDepositStabilityPoolTx(client, tx, sender, vusdAmount, recipient) {
  const iotaClient = client.getClient();
  const [inputCoin] = await getInputCoins(
    tx,
    iotaClient,
    sender,
    COINS_TYPE_LIST.VUSD,
    vusdAmount
  );
  const [token] = client.depositStabilityPool(tx, inputCoin);
  tx.transferObjects([token], _nullishCoalesce(recipient, () => ( sender)));
}
async function buildWithdrawStabilityPoolTx(client, tx, sender, vusdAmount, recipient) {
  const iotaClient = client.getClient();
  const tokensRes = await iotaClient.getOwnedObjects({
    owner: sender,
    filter: {
      StructType: `${ORIGINAL_LIQUIDATION_PACKAGE_ID}::stablility_pool::StabilityToken`
    }
  });
  if (tokensRes.data) {
    const tokens = tokensRes.data.map(
      (token2) => tx.objectRef(token2.data)
    );
    const [coin, token] = client.withdrawStabilityPool(tx, tokens, vusdAmount);
    tx.transferObjects([coin, token], _nullishCoalesce(recipient, () => ( sender)));
    return true;
  } else {
    return false;
  }
}











































exports.CDP_PACKAGE_ID = CDP_PACKAGE_ID; exports.CDP_VERSION_OBJ = CDP_VERSION_OBJ; exports.CLOCK_OBJ = CLOCK_OBJ; exports.COINS_TYPE_LIST = COINS_TYPE_LIST; exports.COIN_DECIMALS = COIN_DECIMALS; exports.FRAMEWORK_PACKAGE_ID = FRAMEWORK_PACKAGE_ID; exports.LIQUIDATION_PACKAGE_ID = LIQUIDATION_PACKAGE_ID; exports.ORACLE_PACKAGE_ID = ORACLE_PACKAGE_ID; exports.ORIGINAL_CDP_PACKAGE_ID = ORIGINAL_CDP_PACKAGE_ID; exports.ORIGINAL_FRAMEWORK_PACKAGE_ID = ORIGINAL_FRAMEWORK_PACKAGE_ID; exports.ORIGINAL_LIQUIDATION_PACKAGE_ID = ORIGINAL_LIQUIDATION_PACKAGE_ID; exports.ORIGINAL_ORACLE_PACKAGE_ID = ORIGINAL_ORACLE_PACKAGE_ID; exports.ORIGINAL_VUSD_PACKAGE_ID = ORIGINAL_VUSD_PACKAGE_ID; exports.ObjectContentFields = ObjectContentFields; exports.STABILITY_POOL_OBJ = STABILITY_POOL_OBJ; exports.TESTNET_PRICE_FEED_OBJ = TESTNET_PRICE_FEED_OBJ; exports.TESTNET_PRICE_PACKAGE_ID = TESTNET_PRICE_PACKAGE_ID; exports.TREASURY_OBJ = TREASURY_OBJ; exports.U64FromBytes = U64FromBytes; exports.VAULT_MAP = VAULT_MAP; exports.VUSD_PACKAGE_ID = VUSD_PACKAGE_ID; exports.VirtueClient = VirtueClient; exports.buildDepositStabilityPoolTx = buildDepositStabilityPoolTx; exports.buildManagePositionTx = buildManagePositionTx; exports.buildWithdrawStabilityPoolTx = buildWithdrawStabilityPoolTx; exports.coinFromBalance = coinFromBalance; exports.coinIntoBalance = coinIntoBalance; exports.formatBigInt = formatBigInt; exports.formatUnits = formatUnits; exports.getCoinSymbol = getCoinSymbol; exports.getCoinType = getCoinType; exports.getInputCoins = getInputCoins; exports.getIotaObjectData = getIotaObjectData; exports.getMainCoin = getMainCoin; exports.getMoveObject = getMoveObject; exports.getObjectFields = getObjectFields; exports.getObjectGenerics = getObjectGenerics; exports.getObjectNames = getObjectNames; exports.getPriceResultType = getPriceResultType; exports.parsePositionObject = parsePositionObject; exports.parseUnits = parseUnits; exports.parseVaultObject = parseVaultObject;
//# sourceMappingURL=index.js.map