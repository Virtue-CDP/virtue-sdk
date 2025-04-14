import { Transaction } from "@iota/iota-sdk/transactions";
import {
  coinFromBalance,
  coinIntoBalance,
  getCoinSymbol,
  getInputCoins,
} from "./utils";
import { VirtueClient } from "./client";
import { COINS_TYPE_LIST } from "./constants";

/* ----- Borrow/Repay Builders ----- */
export async function buildBorrowTx(
  client: VirtueClient,
  tx: Transaction,
  collateralType: string,
  collateralAmount: string,
  borrowAmount: string,
  recipient: string,
  insertionPlace?: string,
  strapId?: string,
) {
  /**
   * @description Borrow
   * @param collateralType Asset , e.g "0x2::iota::IOTA"
   * @param collateralAmount
   * @param borrowAmount
   * @param recipient
   * @param insertionPlace  Optional
   * @param strapId         Optional
   */
  const iotaClient = client.getClient();

  const coin = getCoinSymbol(collateralType);
  if (!coin) {
    throw new Error("Collateral not supported");
  }

  const collInputCoin = await getInputCoins(
    tx,
    iotaClient,
    recipient,
    collateralType,
    collateralAmount,
  );
  client.updateSupraOracle(tx, coin);

  if (borrowAmount !== "0") {
    const stableBalance = client.borrow(
      tx,
      collateralType,
      coinIntoBalance(tx, collateralType, collInputCoin),
      tx.pure.u64(borrowAmount),
      insertionPlace,
      strapId,
    );
    if (!stableBalance) return;

    tx.transferObjects(
      [coinFromBalance(tx, COINS_TYPE_LIST.VUSD, stableBalance)],
      recipient,
    );
  } else {
    client.topUp(
      tx,
      collateralType,
      coinIntoBalance(tx, collateralType, collInputCoin),
      recipient,
      insertionPlace,
    );
  }
}
