"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// src/client.ts


var _transactions = require('@iota/iota-sdk/transactions');
var _client = require('@iota/iota-sdk/client');

// src/constants/coin.ts
var COINS_TYPE_LIST = {
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
var FRAMEWORK_PACKAGE_ID = "0x7400af41a9b9d7e4502bc77991dbd1171f90855564fd28afa172a5057beb083b";
var VUSD_PACKAGE_ID = "0xd3b63e603a78786facf65ff22e79701f3e824881a12fa3268d62a75530fe904f";
var ORACLE_PACKAGE_ID = "0x7eebbee92f64ba2912bdbfba1864a362c463879fc5b3eacc735c1dcb255cc2cf";
var CDP_PACKAGE_ID = "0x34fa327ee4bb581d81d85a8c40b6a6b4260630a0ef663acfe6de0e8ca471dd22 ";
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
    }
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
var DUMMY_ADDRESS = "0xcafe";
var VirtueClient = class {
  constructor(network = "mainnet", sender = DUMMY_ADDRESS) {
    this.network = network;
    this.sender = sender;
    if (network == "mainnet" || network == "testnet" || network == "devnet" || network == "localnet") {
      this.rpcEndpoint = _client.getFullnodeUrl.call(void 0, network);
    } else {
      this.rpcEndpoint = network;
    }
    this.iotaClient = new (0, _client.IotaClient)({ url: this.rpcEndpoint });
    this.pythConnection = new (0, _pythiotajs.IotaPriceServiceConnection)(
      "https://hermes.pyth.network"
    );
    this.pythClient = new (0, _pythiotajs.IotaPythClient)(
      this.iotaClient,
      PYTH_STATE_ID,
      WORMHOLE_STATE_ID
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
    const tx = new (0, _transactions.Transaction)();
    const clockObj = tx.sharedObjectRef(CLOCK_OBJ);
    const tokenList = Object.keys(VAULT_MAP);
    const debtorAddr = _nullishCoalesce(debtor, () => ( this.sender));
    if (debtorAddr === DUMMY_ADDRESS) {
      throw new Error("Debtor address is required");
    }
    tokenList.map((token) => {
      tx.moveCall({
        target: `${CDP_PACKAGE_ID}::vault::try_get_position_data`,
        typeArguments: [COINS_TYPE_LIST[token]],
        arguments: [
          tx.sharedObjectRef(VAULT_MAP[token].vault),
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
  // async getStabilityPool(): Promise<StabilityPoolInfo> {
  //   const res = await this.iotaClient.getObject({
  //     id: STABILITY_POOL_OBJ.objectId,
  //     options: {
  //       showContent: true,
  //     },
  //   });
  //   const fields = getObjectFields(res) as StabilityPoolResponse;
  //   return parseStabilityPoolObject(fields);
  // }
  // async getStabilityPoolBalances(
  //   account: string,
  // ): Promise<StabilityPoolBalances> {
  //   const tokensRes = await this.iotaClient.getOwnedObjects({
  //     owner: account,
  //     filter: {
  //       StructType: `${ORIGINAL_LIQUIDATION_PACKAGE_ID}::stablility_pool::StabilityToken`,
  //     },
  //     options: {
  //       showContent: true,
  //     },
  //   });
  //   if (tokensRes.data) {
  //     const vusdBalances = tokensRes.data.map((token) => {
  //       const tokenFields = getObjectFields(token);
  //       if (tokenFields) {
  //         return formatBigInt(tokenFields.amount, COIN_DECIMALS.VUSD);
  //       } else {
  //         return 0;
  //       }
  //     });
  //     return {
  //       vusdBalance: vusdBalances.reduce((x, y) => x + y, 0),
  //       collBalances: {
  //         IOTA: 0,
  //         stIOTA: 0,
  //       },
  //     };
  //   } else {
  //     return {
  //       vusdBalance: 0,
  //       collBalances: {
  //         IOTA: 0,
  //         stIOTA: 0,
  //       },
  //     };
  //   }
  // }
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
  /**
   * @description Create a price collector
   * @param collateral coin symbol, e.g "IOTA"
   * @return [PriceCollector]
   */
  newPriceCollector(collateralSymbol) {
    return this.transaction.moveCall({
      target: `${ORACLE_PACKAGE_ID}::collector::new`,
      typeArguments: [COINS_TYPE_LIST[collateralSymbol]]
    });
  }
  /**
   * @description Get a price result
   * @param collateral coin symbol, e.g "IOTA"
   * @return [PriceResult]
   */
  async aggregatePrice(collateralSymbol) {
    const [collector] = this.newPriceCollector(collateralSymbol);
    const coinType = COINS_TYPE_LIST[collateralSymbol];
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
    const coinType = COINS_TYPE_LIST[collateralSymbol];
    const vaultId = VAULT_MAP[collateralSymbol].vault.objectId;
    const [accountReq] = accountObj ? this.transaction.moveCall({
      target: `${FRAMEWORK_PACKAGE_ID}::account::request_with_account`,
      arguments: [
        typeof accountObj === "string" ? this.transaction.object(accountObj) : accountObj
      ]
    }) : this.transaction.moveCall({
      target: `${FRAMEWORK_PACKAGE_ID}::account::request`
    });
    return this.transaction.moveCall({
      target: `${CDP_PACKAGE_ID}::request::debtor_request`,
      typeArguments: [coinType],
      arguments: [
        accountReq,
        this.transaction.sharedObjectRef(TREASURY_OBJ),
        this.transaction.pure.id(vaultId),
        depositCoin,
        this.transaction.pure.u64(borrowAmount),
        repaymentCoin,
        this.transaction.pure.u64(withdrawAmount)
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
      typeArguments: [COINS_TYPE_LIST[collateralSymbol]],
      arguments: [
        this.transaction.sharedObjectRef(vault),
        this.transaction.sharedObjectRef(TREASURY_OBJ),
        this.transaction.sharedObjectRef(CLOCK_OBJ),
        priceResultOpt,
        updateRequest
      ]
    });
  }
  // depositStabilityPool(
  //   tx: Transaction,
  //   vusdCoin: TransactionArgument,
  // ): TransactionResult {
  //   return tx.moveCall({
  //     target: `${LIQUIDATION_PACKAGE_ID}::stablility_pool::deposit`,
  //     arguments: [tx.sharedObjectRef(STABILITY_POOL_OBJ), vusdCoin],
  //   });
  // }
  // withdrawStabilityPool(
  //   tx: Transaction,
  //   tokens: TransactionArgument[],
  //   amount: string,
  // ): TransactionResult {
  //   const stabilityPool = tx.sharedObjectRef(STABILITY_POOL_OBJ);
  //   const [mainCoin, ...otherCoins] = tokens.map((token) => {
  //     const [vusdCoin] = tx.moveCall({
  //       target: `${LIQUIDATION_PACKAGE_ID}::stablility_pool::withdraw`,
  //       arguments: [stabilityPool, token],
  //     });
  //     return vusdCoin;
  //   });
  //   if (otherCoins.length > 0) {
  //     tx.mergeCoins(mainCoin, otherCoins);
  //   }
  //   const [outCoin] = tx.splitCoins(mainCoin, [amount]);
  //   const [token] = this.depositStabilityPool(tx, mainCoin);
  //   return [outCoin, token] as TransactionResult;
  // }
  //
  //
  //
  /* ----- Transaction Methods ----- */
  async buildManagePositionTransaction(inputs) {
    const {
      collateralSymbol,
      depositAmount,
      borrowAmount,
      repaymentAmount,
      withdrawAmount,
      accountObjId,
      recipient
    } = inputs;
    const coinType = COINS_TYPE_LIST[collateralSymbol];
    if (!this.sender) throw new Error("Sender is not set");
    const [depositCoin] = await getInputCoins(
      this.transaction,
      this.iotaClient,
      this.sender,
      coinType,
      depositAmount
    );
    const [repaymentCoin] = await getInputCoins(
      this.transaction,
      this.iotaClient,
      this.sender,
      COINS_TYPE_LIST.VUSD,
      repaymentAmount
    );
    const [priceResult] = Number(borrowAmount) > 0 || Number(withdrawAmount) > 0 ? await this.aggregatePrice(collateralSymbol) : [void 0];
    const [updateRequest] = this.debtorRequest({
      collateralSymbol,
      depositCoin,
      borrowAmount,
      repaymentCoin,
      withdrawAmount,
      accountObj: accountObjId
    });
    const [collCoin, vusdCoin] = this.updatePosition({
      collateralSymbol,
      updateRequest,
      priceResult
    });
    if (Number(withdrawAmount) > 0) {
      this.transaction.transferObjects([collCoin], _nullishCoalesce(recipient, () => ( this.sender)));
    } else {
      this.transaction.moveCall({
        target: "0x2::coin::destroy_zero",
        typeArguments: [coinType],
        arguments: [collCoin]
      });
    }
    if (Number(borrowAmount) > 0) {
      if (recipient === "StabilityPool") {
        this.transaction.transferObjects([vusdCoin], _nullishCoalesce(recipient, () => ( this.sender)));
      } else {
        this.transaction.transferObjects([vusdCoin], _nullishCoalesce(recipient, () => ( this.sender)));
      }
    } else {
      this.transaction.moveCall({
        target: "0x2::coin::destroy_zero",
        typeArguments: [COINS_TYPE_LIST.VUSD],
        arguments: [vusdCoin]
      });
    }
    return this.transaction;
  }
};





































exports.CDP_PACKAGE_ID = CDP_PACKAGE_ID; exports.CLOCK_OBJ = CLOCK_OBJ; exports.COINS_TYPE_LIST = COINS_TYPE_LIST; exports.COIN_DECIMALS = COIN_DECIMALS; exports.FRAMEWORK_PACKAGE_ID = FRAMEWORK_PACKAGE_ID; exports.ORACLE_PACKAGE_ID = ORACLE_PACKAGE_ID; exports.ORIGINAL_CDP_PACKAGE_ID = ORIGINAL_CDP_PACKAGE_ID; exports.ORIGINAL_FRAMEWORK_PACKAGE_ID = ORIGINAL_FRAMEWORK_PACKAGE_ID; exports.ORIGINAL_ORACLE_PACKAGE_ID = ORIGINAL_ORACLE_PACKAGE_ID; exports.ORIGINAL_VUSD_PACKAGE_ID = ORIGINAL_VUSD_PACKAGE_ID; exports.ObjectContentFields = ObjectContentFields; exports.PYTH_RULE_CONFIG_OBJ = PYTH_RULE_CONFIG_OBJ; exports.PYTH_RULE_PACKAGE_ID = PYTH_RULE_PACKAGE_ID; exports.PYTH_STATE_ID = PYTH_STATE_ID; exports.TREASURY_OBJ = TREASURY_OBJ; exports.U64FromBytes = U64FromBytes; exports.VAULT_MAP = VAULT_MAP; exports.VUSD_PACKAGE_ID = VUSD_PACKAGE_ID; exports.VirtueClient = VirtueClient; exports.WORMHOLE_STATE_ID = WORMHOLE_STATE_ID; exports.coinFromBalance = coinFromBalance; exports.coinIntoBalance = coinIntoBalance; exports.formatBigInt = formatBigInt; exports.formatUnits = formatUnits; exports.getCoinSymbol = getCoinSymbol; exports.getCoinType = getCoinType; exports.getInputCoins = getInputCoins; exports.getIotaObjectData = getIotaObjectData; exports.getMainCoin = getMainCoin; exports.getMoveObject = getMoveObject; exports.getObjectFields = getObjectFields; exports.getObjectGenerics = getObjectGenerics; exports.getObjectNames = getObjectNames; exports.getPriceResultType = getPriceResultType; exports.parseUnits = parseUnits; exports.parseVaultObject = parseVaultObject;
//# sourceMappingURL=index.js.map