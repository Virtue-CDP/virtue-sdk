import { assert, describe, expect, it } from "vitest";
import { VirtueClient } from "../src/index";

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
    await client.aggregatePrice("iBTC");
    const dryrunRes = await client.dryrunTransaction();
    expect(dryrunRes.effects.status.status).toBe("success");
  });

  it("test getVault() function", async () => {
    const vault = await client.getVault("IOTA");
    // console.log(vault);
    expect(vault).toBeDefined();
  });

  it("test getPrice() function", async () => {
    const stIotaPrice = await client.getPrice("stIOTA");
    const iotaPrice = await client.getPrice("IOTA");
    console.log(stIotaPrice, iotaPrice);
    expect(stIotaPrice).toBeGreaterThan(iotaPrice);
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
});
