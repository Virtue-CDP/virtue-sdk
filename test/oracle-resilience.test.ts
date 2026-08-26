import { describe, expect, it, afterEach, vi } from "vitest";
import { VirtueClient } from "../src/index";

/**
 * Every oracle rule is a best-effort contributor to the price aggregation, so a
 * failure at any one source must degrade to "that rule feeds nothing" rather
 * than raise out of the SDK or abort the PTB — otherwise an outage at one
 * source takes down price reads, and every position build depending on them,
 * that the remaining rules could have served on their own.
 *
 * These assert on the `PriceAggregated` event from a real dry run, because the
 * shape of the built transaction does not prove the transaction survives: a
 * `pyth_rule::feed` pointed at a stale `PriceInfoObject` looks perfectly fine in
 * the PTB and then aborts on chain.
 */
describe("oracle source resilience", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  /** Break crossbar only. The crank calls `fetch` directly; Pyth uses axios. */
  const breakCrossbar = (mode: "reject" | "garbage" | "http500") => {
    globalThis.fetch = (async (input: any, init?: any) => {
      const url =
        typeof input === "string" ? input : (input?.url ?? String(input));
      if (!url.includes("crossbar.switchboard.xyz")) {
        return realFetch(input, init);
      }
      if (mode === "reject") throw new TypeError("fetch failed");
      if (mode === "http500") return new Response("nope", { status: 500 });
      return new Response("{not json", { status: 200 });
    }) as typeof fetch;
  };

  /** Hermes unreachable, at the connection rather than the transport. */
  const breakHermes = (client: VirtueClient) =>
    vi
      .spyOn(client.getPythConnection(), "getPriceFeedsUpdateData")
      .mockRejectedValue(new Error("hermes unreachable"));

  /**
   * Hermes reachable but its VAA no longer verifies on chain — the guardian-set
   * mismatch this SDK has to survive. Corrupting the update data reproduces the
   * on-chain abort without waiting for a real one.
   */
  const breakVaaVerification = (client: VirtueClient) => {
    const conn = client.getPythConnection();
    const real = conn.getPriceFeedsUpdateData.bind(conn);
    vi.spyOn(conn, "getPriceFeedsUpdateData").mockImplementation(
      async (ids: string[]) => {
        const data = await real(ids);
        return data.map((buf) => {
          const corrupted = Buffer.from(buf);
          corrupted[corrupted.length - 16] ^= 0xff;
          return corrupted;
        });
      },
    );
  };

  /**
   * Dry-run the aggregation and report, per collateral, which rules actually
   * made it into the `PriceAggregated` event.
   */
  const aggregatedSources = async (client: VirtueClient) => {
    await client.aggregatePrices();
    client.getTransaction().setSender(`0x${"0".repeat(64)}`);
    const res = await (client as any).dryrunTransaction();
    expect(res.effects.status.status).toBe("success");
    const bySymbol: Record<string, string[]> = {};
    for (const e of res.events) {
      if (!e.type.includes("::aggregater::PriceAggregated<")) continue;
      const coin = e.type.split("<")[1].replace(">", "").split("::").pop()!;
      bySymbol[coin] = (e.parsedJson as any).sources.map((s: any) =>
        s.name.split("::").pop(),
      );
    }
    return bySymbol;
  };

  it("aggregates both rules when everything is healthy", async () => {
    const client = new VirtueClient({});
    client.resetTransaction();
    const sources = await aggregatedSources(client);
    expect(sources.IOTA).toEqual(
      expect.arrayContaining(["PythRule", "SwitchboardRule"]),
    );
    expect(sources.IBTC).toEqual(["PythRule"]);
  }, 60_000);

  it.each([
    ["hermes is unreachable", breakHermes],
    ["its VAA would abort on chain", breakVaaVerification],
  ])(
    "aggregates Switchboard alone when %s",
    async (_label, breakIt) => {
      const client = new VirtueClient({});
      client.resetTransaction();
      breakIt(client);
      const sources = await aggregatedSources(client);
      // The whole point: Pyth drops out, the transaction still succeeds, and
      // the price comes from the rule that still works.
      expect(sources.IOTA).toEqual(["SwitchboardRule"]);
      // iBTC has no Switchboard aggregator, so nothing can price it. It is left
      // out of the transaction rather than aggregated into a certain abort.
      expect(sources.IBTC).toBeUndefined();
      // stIOTA and vIOTA derive from IOTA, so they survive with it.
      expect(sources.CERT).toBeDefined();
    },
    60_000,
  );

  it.each(["reject", "garbage", "http500"] as const)(
    "aggregates Pyth alone when crossbar is %s",
    async (mode) => {
      breakCrossbar(mode);
      const client = new VirtueClient({});
      client.resetTransaction();
      const sources = await aggregatedSources(client);
      // `switchboard_rule::feed` is still in the PTB here — unlike the Pyth
      // rule it abstains on a stale aggregator instead of aborting.
      expect(sources.IOTA).toEqual(["PythRule"]);
      expect(sources.IBTC).toEqual(["PythRule"]);
    },
    60_000,
  );

  it("still prices collaterals through getCollateralPrices when crossbar is down", async () => {
    breakCrossbar("reject");
    const client = new VirtueClient({});
    const prices = await client.getCollateralPrices();
    // Pyth alone still prices everything, so nothing should have dropped out.
    expect(prices.IOTA).toBeDefined();
    expect(prices.iBTC).toBeDefined();
    expect(prices.IOTA!).toBeGreaterThan(0);
    expect(prices.stIOTA!).toBeGreaterThan(prices.IOTA!);
  }, 60_000);

  /**
   * The `Partial` return type is not cosmetic — this is the case it describes.
   */
  it("omits collaterals it cannot price rather than reporting them as zero", async () => {
    const client = new VirtueClient({});
    breakHermes(client);
    const prices = await client.getCollateralPrices();
    // iBTC is fed by Pyth alone, so with the Pyth update unavailable it has no
    // price at all. It must be absent, not 0 — a zero here would read as a
    // real quote and value the collateral at nothing.
    expect(prices.iBTC).toBeUndefined();
    expect("iBTC" in prices).toBe(false);
    // IOTA carries on through Switchboard, and the derived symbols with it.
    expect(prices.IOTA!).toBeGreaterThan(0);
    expect(prices.stIOTA!).toBeGreaterThan(prices.IOTA!);
  }, 60_000);

  /**
   * The oracle commands are appended before this can be known, so the failure
   * has to leave the caller's own `Transaction` alone — the *same instance* they
   * are holding, not a replacement handed out afterwards. Re-reading
   * `getTransaction()` after the failure would observe a swapped-in object and
   * pass while the held one stayed contaminated, so the reference is captured
   * up front and asserted on directly.
   */
  it("leaves the caller's own transaction instance untouched when nothing can price the collateral", async () => {
    const client = new VirtueClient({
      sender: `0x${"2".repeat(64)}`,
    });
    client.resetTransaction();

    // the caller is already composing something of their own, under their own sender
    const callerTx = client.getTransaction();
    callerTx.setSender(`0x${"1".repeat(64)}`);
    callerTx.moveCall({
      target: "0x2::clock::timestamp_ms",
      arguments: [callerTx.object.clock()],
    });
    const before = callerTx.serialize();

    breakCrossbar("reject");
    breakHermes(client);

    await expect(
      client.buildManagePositionTransaction({
        // iBTC is priced by Pyth alone, so with Pyth down nothing can price it
        collateralSymbol: "iBTC",
        depositAmount: "0",
        borrowAmount: "10000",
        repaymentAmount: "0",
        withdrawAmount: "0",
        keepTransaction: true,
      }),
    ).rejects.toThrow(/No oracle rule could price/);

    // the instance the caller holds is still the one the client is using...
    expect(client.getTransaction()).toBe(callerTx);
    // ...and is byte-identical to before the call, so the failed build left
    // behind neither commands nor a rewritten sender.
    expect(callerTx.serialize()).toBe(before);
    expect(callerTx.getData().sender).toBe(`0x${"1".repeat(64)}`);
  }, 60_000);

  it("does not throw from the SDK when every update path is down", async () => {
    breakCrossbar("reject");
    const client = new VirtueClient({});
    client.resetTransaction();
    breakHermes(client);
    await expect(client.aggregatePrices()).resolves.toBeDefined();
  }, 60_000);
});
