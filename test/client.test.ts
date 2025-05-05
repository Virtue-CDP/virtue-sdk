import { describe, expect, it } from "vitest";
import { VirtueClient } from "../src/index";

describe("Interacting with VirtueClient", () => {
  // Instantiate Client
  const client = new VirtueClient("testnet");
  const walletAddress =
    "0x659c0adb3242852bbf7684e8c568c4a5eff34bdc6bf5227fdcaccae930da2346";

  it("tests getAllVaults() function", async () => {
    const vaults = await client.getAllVaults();
    console.log(vaults);
    expect(vaults).toBeDefined();
  });

  it("tests getVault() function", async () => {
    const vault = await client.getVault("IOTA");
    expect(vault).toBeDefined();
  });

  it("tests getPositionsByDebtor() function", async () => {
    const positions = await client.getPositionsByDebtor(walletAddress);
    console.log(positions);
    expect(positions).toBeDefined();
  });

  it("tests getPrices() function", async () => {
    const prices = await client.getPrices();
    console.log(prices);
    expect(prices).toBeDefined();
  });

  it("tests getStabilityBalances() function", async () => {
    const balances = await client.getStabilityPoolBalances(walletAddress);
    console.log(balances);
    expect(balances).toBeDefined();
  });

  it("tests getStabilityPool() function", async () => {
    const pool = await client.getStabilityPool();
    console.log(pool);
    expect(pool).toBeDefined();
  });
});
