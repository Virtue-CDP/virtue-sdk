import { describe, expect, it } from "vitest";
import { VirtueClient } from "../src/index";

describe("Interacting with VirtueClient", () => {
  // Instantiate Client
  const client = new VirtueClient('testnet');
  const walletAddress = "0xbc5b5163a43d6dc8006d8dee72aada86ed00af7e4cfd20b43be09e3b8b9c98e4";

  it("tests getAllVaults() function", async () => {
    const vaults = await client.getAllVaults();
    expect(vaults).toBeDefined();
  });

  it("tests getVault() function", async () => {
    const vault = await client.getVault('IOTA');
    expect(vault).toBeDefined();
  });

  it("tests getPositionsByDebtor() function", async () => {
    const positions = await client.getPositionsByDebtor(walletAddress);
    expect(positions).toBeDefined();
  });


});
