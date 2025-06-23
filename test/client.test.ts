import { describe, expect, it } from "vitest";
import { VirtueClient } from "../src/index";

describe("Interacting with VirtueClient", () => {
  // Instantiate Client
  const walletAddress =
    "0x659c0adb3242852bbf7684e8c568c4a5eff34bdc6bf5227fdcaccae930da2346";
  const client = new VirtueClient("mainnet", walletAddress);

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

  it("test getDebtorPositions() function", async () => {
    const tx = await client.buildManagePositionTransaction({
      collateralSymbol: "IOTA",
      depositAmount: "100000000000",
      borrowAmount: "1000000",
      repaymentAmount: "0",
      withdrawAmount: "0",
    });
    expect(tx).toBeDefined();
    tx.setSender(client.sender);
    console.log(
      client.getIotaClient().dryRunTransactionBlock({
        transactionBlock: await tx.build({ client: client.getIotaClient() }),
      }),
    );
  });

  it("test getDebtorPositions() function", async () => {
    const positions = await client.getDebtorPositions();
    console.log(positions);
    expect(positions).toBeDefined();
  });

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
