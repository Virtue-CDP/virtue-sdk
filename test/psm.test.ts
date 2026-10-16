import { describe, expect, it } from "vitest";
import { normalizeIotaAddress } from "@iota/iota-sdk/utils";
import {
  PsmPoolInfo,
  VirtueClient,
  quotePsmSwap,
  quotePsmSwapExactOut,
} from "../src/index";

const pool = (overrides: Partial<PsmPoolInfo> = {}): PsmPoolInfo => ({
  coin: "USDT0",
  coinType: "0x1::usdt0::USDT0",
  decimal: 6,
  balance: "1000000000",
  vusdSupply: "1000000000",
  swapInFeeRate: 0,
  swapOutFeeRate: 0.001,
  partnerFeeRates: {},
  mintableVusd: "100000000",
  moduleVusdSupply: "1000000000",
  ...overrides,
});

describe("PSM quotes", () => {
  it("swaps in 1:1 with no fee at 0%", () => {
    const q = quotePsmSwap(pool(), "in", 5_000_000n);
    expect(q).toMatchObject({ amountOut: 5_000_000n, fee: 0n });
    expect(q.error).toBeUndefined();
  });

  it("rounds the swap-out fee up, as the chain does", () => {
    // 0.1% of 1_500 is 1.5, so the fee is 2 and 1_498 comes out.
    const q = quotePsmSwap(pool(), "out", 1_500n);
    expect(q).toMatchObject({ amountOut: 1_498n, fee: 2n });
  });

  it("scales by decimals", () => {
    const q = quotePsmSwap(
      pool({ decimal: 9, swapInFeeRate: 0 }),
      "in",
      1_999n,
    );
    // 1_999 units at 9 decimals floor to 1 VUSD unit at 6.
    expect(q.amountOut).toBe(1n);
  });

  it("flags a swap in past the PSM's supply limit", () => {
    expect(quotePsmSwap(pool(), "in", 100_000_001n).error).toBe("SUPPLY_LIMIT");
    expect(quotePsmSwap(pool(), "in", 100_000_000n).error).toBeUndefined();
  });

  it("flags a swap out the pool cannot cover", () => {
    expect(quotePsmSwap(pool({ balance: "10" }), "out", 11n).error).toBe(
      "POOL_NOT_ENOUGH",
    );
    expect(quotePsmSwap(pool({ vusdSupply: "10" }), "out", 11n).error).toBe(
      "POOL_NOT_ENOUGH",
    );
  });

  it("flags a swap out past the module's supply across pools", () => {
    // This pool minted enough, but the module's shared supply (which the burn
    // runs against first) is smaller.
    const q = quotePsmSwap(pool({ moduleVusdSupply: "10" }), "out", 11n);
    expect(q.error).toBe("POOL_NOT_ENOUGH");
  });

  it("uses a partner's fee rates only for that partner", () => {
    const partner = "0xabc";
    const p = pool({
      partnerFeeRates: {
        [normalizeIotaAddress(partner)]: {
          swapInFeeRate: 0,
          swapOutFeeRate: 0,
        },
      },
    });
    expect(quotePsmSwap(p, "out", 1_500n, partner).fee).toBe(0n);
    expect(quotePsmSwap(p, "out", 1_500n, "0xdef").fee).toBe(2n);
    expect(quotePsmSwap(p, "out", 1_500n).fee).toBe(2n);
    expect(quotePsmSwapExactOut(p, "out", 1_500n, partner).amountIn).toBe(
      1_500n,
    );
  });

  it("refuses a pool decimal the chain cannot have", () => {
    expect(() => quotePsmSwap(pool({ decimal: 10 }), "in", 1n)).toThrow(
      /Unsupported PSM pool decimal/,
    );
  });

  it("finds the smallest input for an exact output", () => {
    for (const out of [1n, 999n, 1_000n, 1_498n, 1_499n, 123_456_789n]) {
      const q = quotePsmSwapExactOut(pool(), "out", out);
      expect(q.amountOut).toBeGreaterThanOrEqual(out);
      expect(
        quotePsmSwap(pool(), "out", q.amountIn - 1n).amountOut,
      ).toBeLessThan(out);
    }
  });
});

describe("PSM on chain", () => {
  const walletAddress =
    "0x08e00db614b1024014b33f86e9d0baf76a48649b317d1517536502c521d20322";
  const client = new VirtueClient({ sender: walletAddress });

  it("reads the USDT0 pool", async () => {
    const { USDT0 } = await client.getPsmPools();
    expect(USDT0).toBeDefined();
    expect(USDT0!.decimal).toBe(6);
    expect(USDT0!.swapInFeeRate).toBeGreaterThanOrEqual(0);
    expect(USDT0!.swapOutFeeRate).toBeGreaterThanOrEqual(0);
    expect(BigInt(USDT0!.mintableVusd)).toBeGreaterThanOrEqual(0n);
    expect(BigInt(USDT0!.moduleVusdSupply)).toBeGreaterThanOrEqual(
      BigInt(USDT0!.vusdSupply),
    );
  });

  it("throws rather than read a missing supply entry as zero", async () => {
    const other = new VirtueClient({ sender: walletAddress });
    other.config = {
      ...other.config,
      PSM_WITNESS_TYPE: "0x1234::witness::NotThePsm",
    };
    await expect(other.getPsmPools()).rejects.toThrow(/no supply entry/);
  });

  it("splits one zero coin per amount", async () => {
    client.resetTransaction();
    const usdt0 = client.config.PSM_POOLS!.USDT0!.coinType;
    const [a, b] = await client.splitCoinsByType(usdt0, "0", "0");
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    client.getTransaction().transferObjects([a, b], walletAddress);
    const res = await client.getIotaClient().devInspectTransactionBlock({
      transactionBlock: client.getTransaction(),
      sender: walletAddress,
    });
    expect(res.effects.status.status).toBe("success");
    client.resetTransaction();
  });

  it("rejects a zero amount before writing anything", async () => {
    client.resetTransaction();
    await expect(
      client.buildPsmSwapTransaction({
        coin: "USDT0",
        direction: "in",
        amount: "0",
        keepTransaction: true,
      }),
    ).rejects.toThrow(/positive integer/);
    expect(client.getTransaction().getData().commands).toHaveLength(0);
  });

  it("reports a short balance when the transaction is built", async () => {
    // Ask for one unit more than the wallet holds. Coin selection is the
    // `coinWithBalance` intent's, resolved at build time, so the shortfall
    // surfaces there rather than while the swap is being composed.
    const usdt0 = await client.getIotaClient().getBalance({
      owner: walletAddress,
      coinType: client.config.PSM_POOLS!.USDT0!.coinType,
    });
    client.resetTransaction();
    const tx = await client.buildPsmSwapTransaction({
      coin: "USDT0",
      direction: "in",
      amount: (BigInt(usdt0.totalBalance) + 1n).toString(),
      accountObj: walletAddress,
      keepTransaction: true,
    });
    await expect(tx.build({ client: client.getIotaClient() })).rejects.toThrow(
      /Not enough coins/,
    );
    client.resetTransaction();
  });

  it("calls swap_in and swap_out with the right types", async () => {
    // Zero-value coins run the real calls (and the treasury version check)
    // without needing a wallet that holds USDT0.
    client.resetTransaction();
    const tx = client.getTransaction();
    const usdt0 = client.config.PSM_POOLS!.USDT0!.coinType;
    const [assetCoin] = tx.moveCall({
      target: "0x2::coin::zero",
      typeArguments: [usdt0],
    });
    const vusdCoin = client.psmSwapIn({ coin: "USDT0", assetCoin });
    const assetBack = client.psmSwapOut({ coin: "USDT0", vusdCoin });
    tx.transferObjects([assetBack], walletAddress);
    const res = await client.getIotaClient().devInspectTransactionBlock({
      transactionBlock: tx,
      sender: walletAddress,
    });
    expect(res.error ?? null).toBeNull();
    expect(res.effects.status.status).toBe("success");
  });

  it("builds a swap out that the chain judges against the pool", async (ctx) => {
    const amount = 1_000_000n;
    const vusd = await client.getIotaClient().getBalance({
      owner: walletAddress,
      coinType: client.config.COIN_TYPES.VUSD,
    });
    // Without 1 VUSD in the test wallet the build fails for a reason that has
    // nothing to do with the pool, so there is nothing to judge.
    if (BigInt(vusd.totalBalance) < amount) return ctx.skip();

    const { USDT0 } = await client.getPsmPools();
    const covered = quotePsmSwap(USDT0!, "out", amount).error === undefined;
    await client.buildPsmSwapTransaction({
      coin: "USDT0",
      direction: "out",
      amount: amount.toString(),
      keepTransaction: true,
    });
    const run = client
      .dryrunTransaction()
      .finally(() => client.resetTransaction());
    if (covered) {
      expect((await run).effects.status.status).toBe("success");
    } else {
      // swap_out burns first, so a pool that never minted this much aborts in
      // the treasury's limited_supply (102) before its own EPoolNotEnough (401).
      // Gas estimation reports the abort with the constant and the code.
      await expect(run).rejects.toThrow(
        /err_supply_not_enough|err_pool_not_enough|MoveAbort.*\b(102|401)\b|abort code: (102|401)\b/,
      );
    }
  });
});
