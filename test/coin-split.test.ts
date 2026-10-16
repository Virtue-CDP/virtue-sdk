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

  /**
   * Coins served `pageSize` per page, in the order given: `count` coins of
   * `balance` each, or an explicit `balances` list.
   */
  const stubCoins = (
    client: VirtueClient,
    byType: Record<
      string,
      { count: number; balance: bigint } | { balances: bigint[] }
    >,
    pageSize = 50,
  ) =>
    vi
      .spyOn(client.getIotaClient(), "getCoins")
      .mockImplementation(async ({ coinType, cursor }: any) => {
        const spec = byType[coinType] ?? { balances: [] };
        const balances =
          "balances" in spec
            ? spec.balances
            : Array.from({ length: spec.count }, () => spec.balance);
        const count = balances.length;
        const start = cursor ? Number(cursor) : 0;
        const end = Math.min(start + pageSize, count);
        const data = Array.from({ length: end - start }, (_, i) => ({
          coinObjectId: hex(start + i + 1),
          version: "1",
          digest: "11111111111111111111111111111111",
          balance: balances[start + i]!.toString(),
          coinType,
        }));
        return {
          data,
          hasNextPage: end < count,
          nextCursor: end < count ? String(end) : null,
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

  it("picks the large coin listed after the dust", async () => {
    // 500 one-unit coins come first in page order, then one large coin: the
    // large coin alone covers the amount and is all that gets used.
    const client = new VirtueClient({ sender: WALLET });
    const vusd = client.config.COIN_TYPES.VUSD;
    stubCoins(client, {
      [vusd]: { balances: [...Array(500).fill(1n), 1_000_000n] },
    });
    client.resetTransaction();
    await client.splitCoinsByType(vusd, "1000");
    const cmds = commandsOf(client);
    expect(cmds.filter((c) => c.MergeCoins)).toHaveLength(0);
    expect(cmds.filter((c) => c.SplitCoins)).toHaveLength(1);
  });

  it("never drops coins read on the last page", async () => {
    // 480 one-unit coins then a page holding the rest: whole pages are read,
    // so the coins past the merge cap still count toward the balance.
    const client = new VirtueClient({ sender: WALLET });
    const vusd = client.config.COIN_TYPES.VUSD;
    stubCoins(client, {
      [vusd]: { balances: [...Array(480).fill(1n), ...Array(30).fill(100n)] },
    });
    client.resetTransaction();
    // 3,000 is covered by the thirty 100-unit coins alone.
    await client.splitCoinsByType(vusd, "3000");
    const merges = commandsOf(client).filter((c) => c.MergeCoins);
    expect(merges.flatMap((m) => m.MergeCoins.sources)).toHaveLength(29);
  });

  it("rejects an amount that is not an integer of raw units", async () => {
    const client = new VirtueClient({ sender: WALLET });
    const vusd = client.config.COIN_TYPES.VUSD;
    stubCoins(client, { [vusd]: { count: 1, balance: 10n } });
    client.resetTransaction();
    await expect(client.splitCoinsByType(vusd, "1e9")).rejects.toThrow(
      /non-negative integers of raw units/,
    );
  });

  it("closes a position from the large coins of a wallet past the cap", async () => {
    // 400 large coins then 200 dust, debt covered by the large ones: the debt
    // is read off chain, so the close is no longer an unknown amount refused
    // for having over 500 coins.
    const client = new VirtueClient({ sender: WALLET });
    const vusd = client.config.COIN_TYPES.VUSD;
    stubCoins(client, {
      [vusd]: { balances: [...Array(400).fill(1_000_000n), ...Array(200).fill(1n)] },
    });
    vi.spyOn(client, "getDebtorPositions").mockResolvedValue([
      { collateral: "IOTA", collAmount: "5000000000", debtAmount: "50000000" },
    ]);
    client.resetTransaction();
    await client.buildClosePositionTransaction({
      collateralSymbol: "IOTA",
      keepTransaction: true,
    });
    const merges = commandsOf(client).filter((c) => c.MergeCoins);
    // 50 VUSD plus the 0.1% margin is 51 coins of 1 VUSD: one coin + 50 merged.
    expect(merges.flatMap((m) => m.MergeCoins.sources)).toHaveLength(50);
  });

  it("leaves a kept transaction empty when a close is short of VUSD", async () => {
    const client = new VirtueClient({ sender: WALLET });
    const vusd = client.config.COIN_TYPES.VUSD;
    stubCoins(client, { [vusd]: { count: 1, balance: 10n } });
    vi.spyOn(client, "getDebtorPositions").mockResolvedValue([
      { collateral: "IOTA", collAmount: "5000000000", debtAmount: "50000000" },
    ]);
    client.resetTransaction();
    await expect(
      client.buildClosePositionTransaction({
        collateralSymbol: "IOTA",
        keepTransaction: true,
      }),
    ).rejects.toThrow(/Not enough balance/);
    expect(commandsOf(client)).toHaveLength(0);
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
