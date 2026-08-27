import { describe, expect, it, afterEach, vi } from "vitest";
import { VirtueClient } from "../src/index";

/**
 * Switchboard is the only price source: Pyth's Hermes endpoint now answers 401
 * for everyone, so that rule was removed rather than left to fail. That makes
 * the crank load-bearing — there is no second opinion left to fall back on — and
 * these pin the two things that follow from it.
 *
 * First, failure has to be honest. Crossbar going away means no price, and the
 * SDK must say so before writing anything rather than hand back a transaction
 * that aborts on chain.
 *
 * Second, the SDK must never be the thing that fails. A crossbar outage, a
 * malformed response or an RPC hiccup are all "no price", never an exception
 * escaping a read.
 *
 * They assert against dry-run `PriceAggregated` events rather than the shape of
 * the built transaction, because a PTB that looks right can still abort — a
 * `feed` pointed at a stale aggregator is the case in point.
 */
describe("oracle source resilience", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  const WALLET =
    "0x08e00db614b1024014b33f86e9d0baf76a48649b317d1517536502c521d20322";

  /** Break crossbar only. The crank calls `fetch` directly, so this is the seam. */
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

  const moveCallsOf = (tx: any) =>
    (tx.getData().commands as any[])
      .map((c) =>
        c.MoveCall ? `${c.MoveCall.module}::${c.MoveCall.function}` : "",
      )
      .filter(Boolean);

  /** Dry-run the aggregation and report which rules reached each event. */
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

  it("prices IOTA and its derivatives through the Switchboard rule", async () => {
    const client = new VirtueClient({});
    client.resetTransaction();
    const sources = await aggregatedSources(client);
    expect(sources.IOTA).toEqual(["SwitchboardRule"]);
    // stIOTA and vIOTA are computed from the IOTA price by their own rules.
    expect(sources.CERT).toBeDefined();
  }, 90_000);

  it("cranks the aggregator in the same transaction that reads it", async () => {
    const client = new VirtueClient({});
    client.resetTransaction();
    await client.aggregatePrices();
    const calls = moveCallsOf(client.getTransaction());
    // Switchboard is on-demand: without a submission ahead of it, `feed` would
    // be reading whatever result happened to be left on chain.
    expect(calls).toContain("aggregator_submit_result_action::run");
    expect(calls.indexOf("aggregator_submit_result_action::run")).toBeLessThan(
      calls.indexOf("switchboard_rule::feed"),
    );
  }, 90_000);

  it.each(["reject", "garbage", "http500"] as const)(
    "reports no price rather than throwing when crossbar is %s",
    async (mode) => {
      breakCrossbar(mode);
      const client = new VirtueClient({});
      client.resetTransaction();
      // The read still resolves — the SDK is never the thing that fails...
      await expect(client.aggregatePrices()).resolves.toBeDefined();
      // ...and with nothing cranked the stale aggregator yields no price.
      const prices = await client.getCollateralPrices();
      expect(prices.IOTA).toBeUndefined();
    },
    90_000,
  );

  it("omits collaterals it cannot price rather than reporting them as zero", async () => {
    breakCrossbar("reject");
    const client = new VirtueClient({});
    const prices = await client.getCollateralPrices();
    // Absent, not 0 — a zero would read as a real quote and value the
    // collateral at nothing.
    expect(prices.IOTA).toBeUndefined();
    expect("IOTA" in prices).toBe(false);
    expect(prices.stIOTA).toBeUndefined();
  }, 90_000);

  /**
   * The oracle commands are appended before priceability can be known, so the
   * failure has to leave the caller's own `Transaction` alone — the *same
   * instance* they hold, not a replacement handed out afterwards.
   */
  it("leaves the caller's own transaction instance untouched when nothing can price the collateral", async () => {
    const client = new VirtueClient({ sender: `0x${"2".repeat(64)}` });
    client.resetTransaction();

    const callerTx = client.getTransaction();
    callerTx.setSender(`0x${"1".repeat(64)}`);
    callerTx.moveCall({
      target: "0x2::clock::timestamp_ms",
      arguments: [callerTx.object.clock()],
    });
    const before = callerTx.serialize();

    breakCrossbar("reject");

    await expect(
      client.buildManagePositionTransaction({
        collateralSymbol: "IOTA",
        depositAmount: "0",
        borrowAmount: "10000",
        repaymentAmount: "0",
        withdrawAmount: "0",
        keepTransaction: true,
      }),
    ).rejects.toThrow(/No oracle rule could price/);

    expect(client.getTransaction()).toBe(callerTx);
    expect(callerTx.serialize()).toBe(before);
    expect(callerTx.getData().sender).toBe(`0x${"1".repeat(64)}`);
  }, 90_000);

  /**
   * The mirror: composing with `keepTransaction: true` means the caller keeps
   * building on the instance they hold, so a success must land on that same
   * instance — and keep its build plugins, which a rebuilt replacement would
   * silently drop.
   */
  it("builds onto the caller's own transaction instance, plugins intact", async () => {
    const client = new VirtueClient({ sender: WALLET });
    client.resetTransaction();

    const callerTx = client.getTransaction();
    callerTx.moveCall({
      target: "0x2::clock::timestamp_ms",
      arguments: [callerTx.object.clock()],
    });
    let pluginRuns = 0;
    callerTx.addBuildPlugin(async (_data, _options, next) => {
      pluginRuns += 1;
      await next();
    });

    const returned = await client.buildManagePositionTransaction({
      collateralSymbol: "IOTA",
      depositAmount: "0",
      borrowAmount: "0",
      repaymentAmount: "0",
      withdrawAmount: "0",
      keepTransaction: true,
    });

    expect(returned).toBe(callerTx);
    expect(client.getTransaction()).toBe(callerTx);
    expect(callerTx.getData().commands.length).toBeGreaterThan(1);
    await callerTx.build({ client: client.getIotaClient() });
    expect(pluginRuns).toBe(1);
  }, 90_000);

  /**
   * The preflight that decides priceability must hand its validated responses to
   * the build, not just its verdict. Checking and then refetching leaves a
   * window where the check passes and the refetch fails — and by then the
   * transaction has been written to and cannot be unwound.
   */
  it("carries the prepared responses into the build instead of fetching twice", async () => {
    const client = new VirtueClient({ sender: WALLET });
    client.resetTransaction();
    const callerTx = client.getTransaction();
    const commandsBefore = callerTx.getData().commands.length;

    let crossbarCalls = 0;
    globalThis.fetch = (async (input: any, init?: any) => {
      const url =
        typeof input === "string" ? input : (input?.url ?? String(input));
      if (url.includes("crossbar.switchboard.xyz")) {
        crossbarCalls += 1;
        if (crossbarCalls > 1) throw new TypeError("crossbar went away");
      }
      return realFetch(input, init);
    }) as typeof fetch;

    const returned = await client.buildManagePositionTransaction({
      collateralSymbol: "IOTA",
      depositAmount: "0",
      borrowAmount: "10000",
      repaymentAmount: "0",
      withdrawAmount: "0",
      keepTransaction: true,
    });

    expect(crossbarCalls).toBe(1);
    expect(returned).toBe(callerTx);
    expect(callerTx.getData().commands.length).toBeGreaterThan(commandsBefore);
  }, 90_000);

  /**
   * `Buffer` is a Node global that browser bundles do not provide. A
   * ReferenceError here would be swallowed by the fail-soft catch around
   * preparation, so the only price source there is would simply never
   * contribute in a dApp — invisibly.
   */
  it("decodes response signatures without the Node Buffer global", () => {
    const client = new VirtueClient({});
    client.resetTransaction();
    const tx = client.getTransaction();
    const response = {
      successValue: "43900000000000000",
      isNegative: false,
      timestamp: 1787734024,
      signature: `0x${"ab".repeat(65)}`,
      oracleId: `0x${"3".repeat(64)}`,
    };

    const savedBuffer = (globalThis as { Buffer?: unknown }).Buffer;
    delete (globalThis as { Buffer?: unknown }).Buffer;
    let added: boolean;
    try {
      added = (client as any).addSwitchboardSubmission(
        tx,
        `0x${"4".repeat(64)}`,
        `0x${"5".repeat(64)}`,
        response,
      );
    } finally {
      (globalThis as { Buffer?: unknown }).Buffer = savedBuffer;
    }

    expect(added).toBe(true);
    expect(tx.getData().commands.length).toBeGreaterThan(0);
  });

  /**
   * The priceability probe must build on a transaction of its own. Parking a
   * scratch transaction on the client would expose it through
   * `getTransaction()`, and anything installed during that await would be
   * silently overwritten when the probe put the old one back.
   */
  it("hides and discards nothing while the priceability probe is in flight", async () => {
    const client = new VirtueClient({ sender: WALLET });
    client.resetTransaction();

    let releaseProbe: () => void = () => {};
    const probeReached = new Promise<void>((resolveReached) => {
      const gate = new Promise<void>((r) => (releaseProbe = r));
      const iota = client.getIotaClient();
      const realInspect = iota.devInspectTransactionBlock.bind(iota);
      vi.spyOn(iota, "devInspectTransactionBlock").mockImplementation(
        async (args: any) => {
          const isAggregation = (
            args.transactionBlock?.getData?.().commands ?? []
          ).some((c: any) => c.MoveCall?.function === "aggregate");
          if (isAggregation) {
            resolveReached();
            await gate;
          }
          return realInspect(args);
        },
      );
    });

    const building = client.buildManagePositionTransaction({
      collateralSymbol: "IOTA",
      depositAmount: "0",
      borrowAmount: "10000",
      repaymentAmount: "0",
      withdrawAmount: "0",
      keepTransaction: true,
    });

    await probeReached;

    const duringProbe = client.getTransaction();
    client.resetTransaction();
    const concurrent = client.getTransaction();
    concurrent.moveCall({
      target: "0x2::clock::timestamp_ms",
      arguments: [concurrent.object.clock()],
    });
    expect(duringProbe).not.toBe(concurrent);

    releaseProbe();
    await building;

    expect(client.getTransaction()).toBe(concurrent);
    const markers = (concurrent.getData().commands as any[]).filter(
      (c) => c.MoveCall?.function === "timestamp_ms",
    );
    expect(markers.length).toBe(1);
  }, 90_000);

  /**
   * "No rule can price this" is a statement about the oracles. An RPC that could
   * not be reached says nothing about them, and reporting it that way sends the
   * caller looking in the wrong place.
   */
  it("does not report an unreachable RPC as oracle unavailability", async () => {
    const client = new VirtueClient({ sender: WALLET });
    client.resetTransaction();

    const iota = client.getIotaClient();
    const realInspect = iota.devInspectTransactionBlock.bind(iota);
    vi.spyOn(iota, "devInspectTransactionBlock").mockImplementation(
      async (args: any) => {
        const isAggregation = (
          args.transactionBlock?.getData?.().commands ?? []
        ).some((c: any) => c.MoveCall?.function === "aggregate");
        if (isAggregation) throw new Error("ECONNRESET");
        return realInspect(args);
      },
    );

    await expect(
      client.buildManagePositionTransaction({
        collateralSymbol: "IOTA",
        depositAmount: "0",
        borrowAmount: "10000",
        repaymentAmount: "0",
        withdrawAmount: "0",
        keepTransaction: true,
      }),
    ).rejects.toThrow(/transport failure, not an oracle one/);
  }, 90_000);
});
