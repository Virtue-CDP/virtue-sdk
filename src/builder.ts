import { Transaction } from "@iota/iota-sdk/transactions";
import { COINS_TYPE_LIST } from "@/constants";
import { VirtueClient } from "@/client";
import { COLLATERAL_COIN } from "@/types";
import { getInputCoins } from "@/utils";

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
