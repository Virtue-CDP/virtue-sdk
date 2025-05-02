import { describe, expect, it } from "vitest";
import { VirtueClient } from "../src/index";

describe("Interacting with VirtueClient", () => {
  // Instantiate Client
  const client = new VirtueClient("testnet");
  const walletAddress =
    "0xbc5b5163a43d6dc8006d8dee72aada86ed00af7e4cfd20b43be09e3b8b9c98e4";

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
    const balances = await client.getStabilityPoolBalance(walletAddress);
    console.log(balances);
    expect(balances).toBeDefined();
  });
});
