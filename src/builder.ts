import { Transaction } from "@iota/iota-sdk/transactions";
import { COINS_TYPE_LIST, ORIGINAL_LIQUIDATION_PACKAGE_ID } from "@/constants";
import { VirtueClient } from "@/client";
import { COLLATERAL_COIN } from "@/types";
import { getInputCoins } from "@/utils";
import { IotaObjectData } from "@iota/iota-sdk/dist/cjs/client";

/* ----- Manage Position Builder ----- */
export async function buildManagePositionTx(
  client: VirtueClient,
  tx: Transaction,
  sender: string,
  collateralSymbol: COLLATERAL_COIN,
  collateralAmount: string,
  borrowAmount: string,
  repaymentAmount: string,
  withrawAmount: string,
  insertionPlace?: string,
  accountObjId?: string,
  recipient?: string,
) {
  const iotaClient = client.getClient();
  const coinType = COINS_TYPE_LIST[collateralSymbol];
  const [depositCoin] = await getInputCoins(
    tx,
    iotaClient,
    sender,
    coinType,
    collateralAmount,
  );
  const [repaymentCoin] = await getInputCoins(
    tx,
    iotaClient,
    sender,
    COINS_TYPE_LIST.VUSD,
    repaymentAmount,
  );
  const [priceResult] =
    Number(borrowAmount) > 0 || Number(withrawAmount) > 0
      ? client.aggregatePrice(tx, collateralSymbol)
      : [undefined];
  const [manageRequest] = client.requestManagePosition(
    tx,
    collateralSymbol,
    depositCoin,
    borrowAmount,
    repaymentCoin,
    withrawAmount,
    accountObjId,
  );
  const [collCoin, vusdCoin] = client.managePosition(
    tx,
    collateralSymbol,
    manageRequest,
    priceResult,
    insertionPlace,
  );
  tx.transferObjects([collCoin, vusdCoin], recipient ?? sender);
}

export async function buildDepositStabilityPoolTx(
  client: VirtueClient,
  tx: Transaction,
  sender: string,
  vusdAmount: string,
  recipient?: string,
) {
  const iotaClient = client.getClient();
  const [inputCoin] = await getInputCoins(
    tx,
    iotaClient,
    sender,
    COINS_TYPE_LIST.VUSD,
    vusdAmount,
  );
  const [token] = client.depositStabilityPool(tx, inputCoin);
  tx.transferObjects([token], recipient ?? sender);
}

export async function buildWithdrawStabilityPoolTx(
  client: VirtueClient,
  tx: Transaction,
  sender: string,
  vusdAmount: string,
  recipient?: string,
): Promise<boolean> {
  const iotaClient = client.getClient();
  const tokensRes = await iotaClient.getOwnedObjects({
    owner: sender,
    filter: {
      StructType: `${ORIGINAL_LIQUIDATION_PACKAGE_ID}::stablility_pool::StabilityToken`,
    },
  });
  if (tokensRes.data) {
    const tokens = tokensRes.data.map((token) =>
      tx.objectRef(token.data as IotaObjectData),
    );
    const [coin] = client.withdrawStabilityPool(tx, tokens, vusdAmount);
    tx.transferObjects([coin], recipient ?? sender);
    return true;
  } else {
    return false;
  }
}
