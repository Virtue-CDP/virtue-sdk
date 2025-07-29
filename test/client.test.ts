import { describe, expect, it } from "vitest";
import { VirtueClient } from "../src/index";

describe("Interacting with VirtueClient", () => {
  // Instantiate Client
  const walletAddress =
    "0x6ff423cb66243ef1fb02dff88aeed580362e2b28f59b92e10b81074b49bea4e1";
  const client = new VirtueClient({ sender: walletAddress });

  it("test getAllVaults() function", async () => {
    const vaults = await client.getAllVaults();
    console.log(vaults);
    expect(vaults).toBeDefined();
  });

  it("test getVault() function", async () => {
    const vault = await client.getVault("IOTA");
    console.log(vault);
    expect(vault).toBeDefined();
  });

  it("test ManagePosition() function", async () => {
    const tx = await client.buildManagePositionTransaction({
      collateralSymbol: "IOTA",
      depositAmount: "1000000000", // 1 IOTA
      borrowAmount: "10000", // 0.01 vUSD
      repaymentAmount: "0",
      withdrawAmount: "0",
    });
    expect(tx).toBeDefined();
    tx.setSender(client.sender);
    console.log(
      await client.getIotaClient().dryRunTransactionBlock({
        transactionBlock: await tx.build({ client: client.getIotaClient() }),
      }),
    );
  }, 15000);

  it("test getDebtorPositions() function", async () => {
    const positions = await client.getDebtorPositions();
    console.log(positions);
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
      "0x249dd22d5d65bd74d1427061620a3b4143e6c61b21375d841761eb71630ea1ff::point::LiquidlinkStakePointEvent";

    expect(
      dryRunResponse.events.some(
        (e) =>
          e.type ==
          LIQUIDLINK_STAKE_POINT_EVENT_PREFIX +
            `<${client.config.POINT_PACKAGE_ID}::point::VirtuePointWitness>`,
      ),
    ).toBeTruthy();
  }, 15000);

  // it("test getStabilityBalances() function", async () => {
  //   const balances = await client.getStabilityPoolBalances(walletAddress);
  //   console.log(balances);
  //   expect(balances).toBeDefined();
  // });

  // it("test getStabilityPool() function", async () => {
  //   const pool = await client.getStabilityPool();
  //   console.log(pool);
  //   expect(pool).toBeDefined();
  // });
});
