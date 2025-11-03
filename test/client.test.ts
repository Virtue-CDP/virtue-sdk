import { assert, describe, expect, it } from "vitest";
import { COLLATERAL_COIN, VirtueClient } from "../src/index";
import { coinWithBalance } from "@iota/iota-sdk/transactions";

describe("Interacting with VirtueClient", () => {
  // Instantiate Client
  const walletAddress =
    "0xf67d0193e9cd65c3c8232dbfe0694eb9e14397326bdc362a4fe9d590984f5a12";
  const client = new VirtueClient({ sender: walletAddress });

  it("test getAllVaults() function", async () => {
    const vaults = await client.getAllVaults();
    // console.log(vaults);
    expect(vaults).toBeDefined();
  });

  it("test aggregatePrice() function", async () => {
    client.resetTransaction();
    await client.aggregatePrices();
    const dryrunRes = await client.dryrunTransaction();
    expect(dryrunRes.effects.status.status).toBe("success");
    client.resetTransaction();
  });

  it("test getVault() function", async () => {
    const vault = await client.getVault("IOTA");
    // console.log(vault);
    expect(vault).toBeDefined();
  });

  it("test getPrice() function", async () => {
    const collateralPrices = await client.getCollateralPrices();
    console.log(collateralPrices);
    expect(collateralPrices.stIOTA).toBeGreaterThan(collateralPrices.IOTA);
  });

  it("test ManagePosition() function (deposit)", async () => {
    const tx = await client.buildManagePositionTransaction({
      collateralSymbol: "stIOTA",
      depositAmount: "1000000000", // 1 stIOTA
      borrowAmount: "0", // 0.01 vUSD
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
  }, 15000);

  it("test ManagePosition() function (borrow)", async () => {
    const tx = await client.buildManagePositionTransaction({
      collateralSymbol: "stIOTA",
      depositAmount: "0", // 1 stIOTA
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
  }, 15000);

  it("test ManagePosition() function (repay)", async () => {
    const tx = await client.buildManagePositionTransaction({
      collateralSymbol: "stIOTA",
      depositAmount: "0",
      borrowAmount: "0",
      repaymentAmount: "1000000", // 1 VUSD
      withdrawAmount: "0", // 1 stIOTA
    });
    expect(tx).toBeDefined();
    tx.setSender(client.sender);
    const dryrunRes = await client.getIotaClient().dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: client.getIotaClient() }),
    });
    assert(dryrunRes.effects.status.status === "success");
    // console.log(dryrunRes.objectChanges);
  }, 15000);

  it("test ManagePosition() function (withdraw)", async () => {
    const tx = await client.buildManagePositionTransaction({
      collateralSymbol: "stIOTA",
      depositAmount: "0",
      borrowAmount: "0",
      repaymentAmount: "0", // 1 VUSD
      withdrawAmount: "1000000000", // 1 stIOTA
    });
    expect(tx).toBeDefined();
    tx.setSender(client.sender);
    const dryrunRes = await client.getIotaClient().dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: client.getIotaClient() }),
    });
    assert(dryrunRes.effects.status.status === "success");
    // console.log(dryrunRes.objectChanges);
  }, 15000);

  it("test getStabilityPool() function", async () => {
    const stabilityPool = await client.getStabilityPool();
    console.log(stabilityPool);
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
  }, 15000);

  it("test buildWithdrawStabilityPoolTransaction() function", async () => {
    const tx = await client.buildWithdrawStabilityPoolTransaction({
      withdrawAmount: "1000000", // 1VUSD
    });
    expect(tx).toBeDefined();
    tx.setSender(client.sender);
    const dryrunRes = await client.getIotaClient().dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: client.getIotaClient() }),
    });
    assert(dryrunRes.effects.status.status === "success");
    // console.log(dryrunRes.objectChanges);
  }, 15000);

  it("test getDebtorPositions() function", async () => {
    const positions = await client.getDebtorPositions();
    // console.log(positions);
    expect(positions).toBeDefined();
  });

  it("test emitDepositPoint() function", async () => {
    const tx = await client.buildManagePositionTransaction({
      collateralSymbol: "stIOTA",
      depositAmount: "1000000000", // 1 stIOTA
      borrowAmount: "10000", // 0.01 vUSD
      repaymentAmount: "0",
      withdrawAmount: "0",
    });
    expect(tx).toBeDefined();
    tx.setSender(client.sender);
    const dryRunResponse = await client.getIotaClient().dryRunTransactionBlock({
      transactionBlock: await tx.build({ client: client.getIotaClient() }),
    });

    const LIQUIDLINK_STAKE_POINT_EVENT_PREFIX =
      "0x12fc1744dbd2401a0bbc1cb07995e1d7b2d9179a42a90ae7311e4c477112bf83::point::LiquidlinkStakePointEvent";

    expect(
      dryRunResponse.events.some(
        (e) =>
          e.type ==
          LIQUIDLINK_STAKE_POINT_EVENT_PREFIX +
            `<${client.config.POINT_PACKAGE_ID}::point::VirtuePointWitness>`,
      ),
    ).toBeTruthy();
  }, 15000);

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
    console.log(dryrunRes.events);
    client.resetTransaction();
  }, 15000);
});
