import { afterEach, describe, expect, it, vi } from "vitest";
import { VirtueClient } from "../src/index";

/**
 * Coin selection reads the sender's coins page by page. These stub `getCoins`
 * so pagination, the coin cap and the merge chunking can be pinned without a
 * dust-heavy wallet on mainnet.
 */
describe("coin splitting", () => {
  const WALLET =
    "0x08e00db614b1024014b33f86e9d0baf76a48649b317d1517536502c521d20322";
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const hex = (n: number) => `0x${n.toString(16).padStart(64, "0")}`;

  /** `count` coins of `balance` each, served `pageSize` per page. */
  const stubCoins = (
    client: VirtueClient,
    byType: Record<string, { count: number; balance: bigint }>,
    pageSize = 50,
  ) =>
    vi
      .spyOn(client.getIotaClient(), "getCoins")
      .mockImplementation(async ({ coinType, cursor }: any) => {
        const spec = byType[coinType] ?? { count: 0, balance: 0n };
        const start = cursor ? Number(cursor) : 0;
        const end = Math.min(start + pageSize, spec.count);
        const data = Array.from({ length: end - start }, (_, i) => ({
          coinObjectId: hex(start + i + 1),
          version: "1",
          digest: "11111111111111111111111111111111",
          balance: spec.balance.toString(),
          coinType,
        }));
        return {
          data,
          hasNextPage: end < spec.count,
          nextCursor: end < spec.count ? String(end) : null,
        } as any;
      });

  const commandsOf = (client: VirtueClient) =>
    client.getTransaction().getData().commands as any[];

  it("stops reading once the coins cover the amount", async () => {
    const client = new VirtueClient({ sender: WALLET });
    const vusd = client.config.COIN_TYPES.VUSD;
    const getCoins = stubCoins(client, { [vusd]: { count: 200, balance: 10n } });
    client.resetTransaction();
    await client.splitCoinsByType(vusd, "30");
    // Three 10-unit coins cover 30: one page, and only three coins merged.
    expect(getCoins).toHaveBeenCalledTimes(1);
    const merges = commandsOf(client).filter((c) => c.MergeCoins);
    expect(merges).toHaveLength(1);
    expect(merges[0].MergeCoins.sources).toHaveLength(2);
  });

  it("reads further pages only while it needs to", async () => {
    const client = new VirtueClient({ sender: WALLET });
    const vusd = client.config.COIN_TYPES.VUSD;
    const getCoins = stubCoins(client, { [vusd]: { count: 200, balance: 1n } });
    client.resetTransaction();
    await client.splitCoinsByType(vusd, "120");
    expect(getCoins).toHaveBeenCalledTimes(3); // 50 + 50 + 20 of the third
  });

  it("refuses a wallet too fragmented to cover the amount in one transaction", async () => {
    const client = new VirtueClient({ sender: WALLET });
    const vusd = client.config.COIN_TYPES.VUSD;
    stubCoins(client, { [vusd]: { count: 600, balance: 1n } });
    client.resetTransaction();
    await expect(client.splitCoinsByType(vusd, "600")).rejects.toThrow(
      /Too many .* coins to merge in one transaction/,
    );
    expect(commandsOf(client)).toHaveLength(0);
  });

  it("reports a plain shortfall as not enough balance", async () => {
    const client = new VirtueClient({ sender: WALLET });
    const vusd = client.config.COIN_TYPES.VUSD;
    stubCoins(client, { [vusd]: { count: 3, balance: 1n } });
    client.resetTransaction();
    await expect(client.splitCoinsByType(vusd, "4")).rejects.toThrow(
      /Not enough balance/,
    );
    expect(commandsOf(client)).toHaveLength(0);
  });

  it("merges in chunks within the per-command argument limit", async () => {
    const client = new VirtueClient({ sender: WALLET });
    const vusd = client.config.COIN_TYPES.VUSD;
    stubCoins(client, { [vusd]: { count: 300, balance: 1n } });
    client.resetTransaction();
    // An amount only known on chain reads every coin, up to the cap.
    const onChain = client.getTransaction().pure.u64(1);
    await client.splitCoinsByType(vusd, onChain);
    const merges = commandsOf(client).filter((c) => c.MergeCoins);
    // 299 sources: 255 + 44.
    expect(merges.map((m) => m.MergeCoins.sources.length)).toEqual([255, 44]);
  });

  it("refuses an on-chain amount from a wallet past the cap", async () => {
    const client = new VirtueClient({ sender: WALLET });
    const vusd = client.config.COIN_TYPES.VUSD;
    stubCoins(client, { [vusd]: { count: 501, balance: 1n } });
    client.resetTransaction();
    const tx = client.getTransaction();
    const before = tx.getData().commands.length;
    await expect(
      client.splitCoinsByType(vusd, tx.pure.u64(1)),
    ).rejects.toThrow(/amount is only known on chain/);
    expect(tx.getData().commands).toHaveLength(before);
  });

  it("settles both coins before writing either in a position build", async () => {
    // Enough stIOTA to deposit, too little VUSD to repay: the stIOTA merge and
    // split must not be left behind in the kept transaction.
    const client = new VirtueClient({ sender: WALLET });
    stubCoins(client, {
      [client.config.COIN_TYPES.stIOTA]: { count: 5, balance: 1_000n },
      [client.config.COIN_TYPES.VUSD]: { count: 1, balance: 1n },
    });
    client.resetTransaction();
    await expect(
      client.buildManagePositionTransaction({
        collateralSymbol: "stIOTA",
        depositAmount: "2000",
        borrowAmount: "0",
        repaymentAmount: "5",
        withdrawAmount: "0",
        keepTransaction: true,
      }),
    ).rejects.toThrow(/Not enough balance/);
    expect(commandsOf(client)).toHaveLength(0);
  });
});
