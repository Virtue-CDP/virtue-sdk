import { assert, describe, expect, it } from "vitest";
import { COLLATERAL_COIN, VirtueClient } from "../src/index";
import { coinWithBalance } from "@iota/iota-sdk/transactions";

describe("Interacting with VirtueClient", () => {
  // Instantiate Client
  const walletAddress =
    "0x08e00db614b1024014b33f86e9d0baf76a48649b317d1517536502c521d20322";
  const client = new VirtueClient({ sender: walletAddress });

  // it("test ManagePosition() function (create)", async () => {
  //   const tx = await client.buildManagePositionTransaction({
  //     collateralSymbol: "vIOTA",
  //     depositAmount: "4000000000", // 4 vIOTA
  //     borrowAmount: "10000", // 0.01 vIOTA
  //     repaymentAmount: "0",
  //     withdrawAmount: "0",
  //   });
  //   expect(tx).toBeDefined();
  //   tx.setSender(client.sender);
  //   const dryrunRes = await client.getIotaClient().dryRunTransactionBlock({
  //     transactionBlock: await tx.build({ client: client.getIotaClient() }),
  //   });
  //   assert(dryrunRes.effects.status.status === "success");
  //   console.log(dryrunRes.balanceChanges);
  // }, 20_000);
  // return;

  it("test getAllVaults() function", async () => {
    const vaults = await client.getAllVaults();
    // console.log(vaults);
    expect(vaults).toBeDefined();
  });

  it("test getCollateralPrices() function", async () => {
    client.resetTransaction();
    const prices = await client.getCollateralPrices();
    // A symbol is absent when no rule could price it, so pin that all three are
    // actually here before comparing them.
    assert(prices.IOTA !== undefined, "IOTA has no price");
    assert(prices.stIOTA !== undefined, "stIOTA has no price");
    assert(prices.vIOTA !== undefined, "vIOTA has no price");
    expect(prices.stIOTA).toBeGreaterThan(prices.IOTA);
    expect(prices.vIOTA).toBeGreaterThan(prices.IOTA);
    client.resetTransaction();
  }, 10_000);

  it("test getVault() function", async () => {
    const vault = await client.getVault("IOTA");
    // console.log(vault);
    expect(vault).toBeDefined();
  });

  it("test ManagePosition() function (deposit)", async () => {
    const tx = await client.buildManagePositionTransaction({
      collateralSymbol: "stIOTA",
      depositAmount: "1000000000", // 1 stIOTA
      borrowAmount: "0",
      repaymentAmount: "0",
      withdrawAmount: "0",
    });
    expect(tx).toBeDefined();
    tx.setSender(client.sender);
    const dryrunRes = await client.getIotaClient().dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: client.getIotaClient() }),
    });
    assert(dryrunRes.effects.status.status === "success");
    // console.log(dryrunRes.objectChanges);
  }, 20_000);

  it("test ManagePosition() function (borrow)", async () => {
    const tx = await client.buildManagePositionTransaction({
      collateralSymbol: "stIOTA",
      depositAmount: "0",
      borrowAmount: "10000", // 0.01 vUSD
      repaymentAmount: "0",
      withdrawAmount: "0",
    });
    expect(tx).toBeDefined();
    tx.setSender(client.sender);
    const dryrunRes = await client.getIotaClient().dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: client.getIotaClient() }),
    });
    assert(dryrunRes.effects.status.status === "success");
    // console.log(dryrunRes.objectChanges);
  }, 20_000);

  it("test ManagePosition() function (repay)", async () => {
    const tx = await client.buildManagePositionTransaction({
      collateralSymbol: "stIOTA",
      depositAmount: "0",
      borrowAmount: "0",
      repaymentAmount: "1000000", // 1 VUSD
      withdrawAmount: "0",
    });
    expect(tx).toBeDefined();
    tx.setSender(client.sender);
    const dryrunRes = await client.getIotaClient().dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: client.getIotaClient() }),
    });
    assert(dryrunRes.effects.status.status === "success");
    // console.log(dryrunRes.objectChanges);
  }, 20_000);

  it("test ManagePosition() function (withdraw)", async () => {
    const tx = await client.buildManagePositionTransaction({
      collateralSymbol: "stIOTA",
      depositAmount: "0",
      borrowAmount: "0",
      repaymentAmount: "0",
      withdrawAmount: "1000000000", // 1 stIOTA
    });
    expect(tx).toBeDefined();
    tx.setSender(client.sender);
    const dryrunRes = await client.getIotaClient().dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: client.getIotaClient() }),
    });
    assert(dryrunRes.effects.status.status === "success");
    // console.log(dryrunRes.objectChanges);
  }, 20_000);

  it("test getStabilityPool() function", async () => {
    const stabilityPool = await client.getStabilityPool();
    // console.log(stabilityPool);
    expect(stabilityPool.vusdBalance).toBeGreaterThan(0);
  });

  it("test buildDepositStabilityPoolTransaction() function", async () => {
    const tx = await client.buildDepositStabilityPoolTransaction({
      depositAmount: "1000000", // 1VUSD
    });
    expect(tx).toBeDefined();
    tx.setSender(client.sender);
    const dryrunRes = await client.getIotaClient().dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: client.getIotaClient() }),
    });
    assert(dryrunRes.effects.status.status === "success");
    // console.log(dryrunRes.objectChanges);
  }, 20_000);

  it("test buildWithdrawStabilityPoolTransaction() function", async () => {
    // The deposit test above is dry-run only, so nothing tops this balance back
    // up, and the pool's scaling math erodes it as liquidations are absorbed. A
    // hardcoded amount equal to the original deposit therefore drifts out of
    // range and aborts with `err_balance_not_enough`; take a fraction of
    // whatever is actually there instead.
    const { vusdBalance } = await client.getStabilityPoolBalances();
    assert(
      BigInt(vusdBalance) > 0n,
      `test wallet has no VUSD in the stability pool (balance ${vusdBalance})`,
    );
    const tx = await client.buildWithdrawStabilityPoolTransaction({
      withdrawAmount: (BigInt(vusdBalance) / 2n).toString(),
    });
    expect(tx).toBeDefined();
    tx.setSender(client.sender);
    const dryrunRes = await client.getIotaClient().dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: client.getIotaClient() }),
    });
    assert(dryrunRes.effects.status.status === "success");
    // console.log(dryrunRes.objectChanges);
  }, 20_000);

  it("test getDebtorPositions() function", async () => {
    const positions = await client.getDebtorPositions();
    // console.log(positions);
    expect(positions).toBeDefined();
  });

  it("test donorRequest() function", async () => {
    client.resetTransaction();
    const collateralSymbol: COLLATERAL_COIN = "IOTA";
    const collateralCoinType = client.config.COIN_TYPES[collateralSymbol];
    let request = client.donorRequest({
      collateralSymbol,
      debtor:
        "0x99117af9eff00799ec35a0bc3039219617e2e22a2ddccee8704ffffbaf3b7800",
      depositCoin: coinWithBalance({
        balance: 0,
        type: collateralCoinType,
        useGasCoin: true,
      }),
      repaymentCoin: coinWithBalance({
        balance: 0,
        type: client.config.COIN_TYPES.VUSD,
      }),
    });
    request = client.checkRequest({ collateralSymbol, request });
    const [collOut, vusdOut, response] = client.updatePosition({
      collateralSymbol,
      updateRequest: request,
    });
    client.destroyZeroCoin(collateralSymbol, collOut);
    client.destroyZeroCoin("VUSD", vusdOut);
    client.checkResponse({ collateralSymbol, response });
    const dryrunRes = await client.dryrunTransaction();
    expect(dryrunRes.effects.status.status).toBe("success");
    // console.log(dryrunRes.events);
    client.resetTransaction();
  }, 20_000);
});
