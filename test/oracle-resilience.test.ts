import { describe, expect, it, afterEach, vi } from "vitest";
import { VirtueClient } from "../src/index";

/**
 * Pyth Lazer is the only price source: IOTA is priced by `pyth_lazer_rule`
 * alone, and stIOTA and vIOTA are derived from it. That makes the Lazer fetch
 * load-bearing — there is no second opinion to fall back on — and these pin the
 * two things that follow from it.
 *
 * First, failure has to be honest. Lazer going away means no price, and the SDK
 * must say so before writing anything rather than hand back a transaction that
 * aborts on chain.
 *
 * Second, the SDK must never be the thing that fails. A Lazer outage, a
 * malformed response or an RPC hiccup are all "no price", never an exception
 * escaping a read.
 *
 * They assert against dry-run `PriceAggregated` events rather than the shape of
 * the built transaction, because a PTB that looks right can still abort — a
 * `feed` given a stale update is the case in point.
 *
 * Lazer is token-gated, so these need `PYTH_LAZER_TOKEN` in the environment and
 * are skipped without it. The SDK itself never reads the environment.
 */
const LAZER_TOKEN = process.env.PYTH_LAZER_TOKEN;

/**
 * Runs without a token on purpose: it is the no-access path, and that is the
 * environment where a regression (a 401 starting to throw) would show up.
 */
describe("oracle source without Lazer access", () => {
  it("reports no price rather than throwing without Lazer access", async () => {
    // No token: Lazer answers 401, which must read as "no price".
    const client = new VirtueClient({});
    await expect(client.aggregatePrices()).resolves.toBeDefined();
    const prices = await client.getCollateralPrices();
    expect(prices.IOTA).toBeUndefined();
    expect(prices.iBTC).toBeUndefined();
  }, 90_000);
});

describe.skipIf(!LAZER_TOKEN)("oracle source resilience", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  const WALLET =
    "0x08e00db614b1024014b33f86e9d0baf76a48649b317d1517536502c521d20322";
  const pythLazer = { apiKey: LAZER_TOKEN };

  const isLazer = (input: any) => {
    const url =
      typeof input === "string" ? input : (input?.url ?? String(input));
    return url.includes("/v1/latest_price");
  };

  /** Break Lazer only. The SDK calls `fetch` directly, so this is the seam. */
  const breakLazer = (mode: "reject" | "garbage" | "http500") => {
    globalThis.fetch = (async (input: any, init?: any) => {
      if (!isLazer(input)) return realFetch(input, init);
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

  it("prices IOTA, iBTC and the IOTA derivatives through the Lazer rule", async () => {
    const client = new VirtueClient({ pythLazer });
    client.resetTransaction();
    const sources = await aggregatedSources(client);
    expect(sources.IOTA).toEqual(["PythLazerRule"]);
    expect(sources.IBTC).toEqual(["PythLazerRule"]);
    // stIOTA and vIOTA are computed from the IOTA price by their own rules.
    expect(sources.CERT).toBeDefined();
  }, 90_000);

  it("verifies the update in the same transaction that reads it", async () => {
    const client = new VirtueClient({ pythLazer });
    client.resetTransaction();
    await client.aggregatePrices();
    const calls = moveCallsOf(client.getTransaction());
    // Lazer stores nothing on chain: `feed` reads the `Update` the verify call
    // returned, so each feed's verify has to come right before it. IOTA and
    // iBTC each carry their own update.
    const verify = "pyth_lazer::parse_and_verify_le_ecdsa_update";
    expect(calls.filter((c) => c === verify)).toHaveLength(2);
    expect(calls.filter((c) => c === "pyth_lazer_rule::feed")).toHaveLength(2);
    calls.forEach((c, i) => {
      if (c === "pyth_lazer_rule::feed") {
        expect(calls.slice(0, i).lastIndexOf(verify)).toBeGreaterThan(
          calls.slice(0, i).lastIndexOf("pyth_lazer_rule::feed"),
        );
      }
    });
    expect(
      calls.indexOf("pyth_lazer::parse_and_verify_le_ecdsa_update"),
    ).toBeLessThan(calls.indexOf("pyth_lazer_rule::feed"));
  }, 90_000);

  it.each(["reject", "garbage", "http500"] as const)(
    "reports no price rather than throwing when Lazer is %s",
    async (mode) => {
      breakLazer(mode);
      const client = new VirtueClient({ pythLazer });
      client.resetTransaction();
      // The read still resolves — the SDK is never the thing that fails...
      await expect(client.aggregatePrices()).resolves.toBeDefined();
      // ...and with no update there is no price.
      const prices = await client.getCollateralPrices();
      expect(prices.IOTA).toBeUndefined();
    },
    90_000,
  );

  it("drops an update the on-chain verifier rejects", async () => {
    // Well-formed JSON carrying bytes no trusted signer produced. Kept, it would
    // abort the verify and every command bundled with it.
    globalThis.fetch = (async (input: any, init?: any) => {
      if (!isLazer(input)) return realFetch(input, init);
      return new Response(
        JSON.stringify({ leEcdsa: { encoding: "hex", data: "ab".repeat(124) } }),
        { status: 200 },
      );
    }) as typeof fetch;
    const client = new VirtueClient({ pythLazer });
    client.resetTransaction();
    await client.aggregatePrices();
    const calls = moveCallsOf(client.getTransaction());
    expect(calls).not.toContain("pyth_lazer::parse_and_verify_le_ecdsa_update");
    expect(calls).not.toContain("aggregater::aggregate");
  }, 90_000);

  /** Request bodies name their feed ids, which is what tells the groups apart. */
  const failFeed = (feedId: number) => {
    globalThis.fetch = (async (input: any, init?: any) => {
      if (isLazer(input)) {
        const ids = JSON.parse(String(init?.body ?? "{}")).priceFeedIds ?? [];
        if (ids.includes(feedId)) throw new TypeError("fetch failed");
      }
      return realFetch(input, init);
    }) as typeof fetch;
  };

  it("keeps IOTA priced when iBTC cannot be", async () => {
    failFeed(1);
    const client = new VirtueClient({ pythLazer });
    const prices = await client.getCollateralPrices();
    expect(prices.iBTC).toBeUndefined();
    expect(prices.IOTA).toBeGreaterThan(0);
    expect(prices.stIOTA).toBeGreaterThan(0);
  }, 90_000);

  it("keeps iBTC priced when IOTA cannot be", async () => {
    failFeed(70);
    const client = new VirtueClient({ pythLazer });
    const prices = await client.getCollateralPrices();
    expect(prices.IOTA).toBeUndefined();
    expect(prices.vIOTA).toBeUndefined();
    expect(prices.iBTC).toBeGreaterThan(0);
  }, 90_000);

  /** Whether a dev-inspected transaction calls `module::fn`. */
  const hasCall = (args: any, module: string, fn: string) =>
    (args.transactionBlock?.getData?.().commands ?? []).some(
      (c: any) => c.MoveCall?.module === module && c.MoveCall?.function === fn,
    );

  it("keeps IOTA and stIOTA priced when vIOTA's own rule fails", async () => {
    const client = new VirtueClient({ pythLazer });
    const iota = client.getIotaClient();
    const realInspect = iota.devInspectTransactionBlock.bind(iota);
    // Stand in for a broken vcert pool: any inspection that reaches it fails.
    vi.spyOn(iota, "devInspectTransactionBlock").mockImplementation(
      async (args: any) => {
        if (hasCall(args, "vcert_rule", "feed")) {
          return { effects: { status: { status: "failure" } }, events: [] } as any;
        }
        return realInspect(args);
      },
    );

    const prices = await client.getCollateralPrices();
    expect(prices.vIOTA).toBeUndefined();
    expect(prices.IOTA).toBeGreaterThan(0);
    expect(prices.stIOTA).toBeGreaterThan(0);

    client.resetTransaction();
    const results = await client.aggregatePrices();
    expect(results.vIOTA).toBeUndefined();
    expect(results.IOTA).toBeDefined();
    expect(moveCallsOf(client.getTransaction())).not.toContain(
      "vcert_rule::feed",
    );
  }, 90_000);

  it("drops only the collateral whose inspection hit an RPC failure", async () => {
    const client = new VirtueClient({ pythLazer });
    const iota = client.getIotaClient();
    const realInspect = iota.devInspectTransactionBlock.bind(iota);
    vi.spyOn(iota, "devInspectTransactionBlock").mockImplementation(
      async (args: any) => {
        const ibtc = (args.transactionBlock?.getData?.().commands ?? []).some(
          (c: any) =>
            (c.MoveCall?.typeArguments ?? []).some((t: string) =>
              t.includes("::ibtc::IBTC"),
            ),
        );
        if (ibtc) throw new Error("ECONNRESET");
        return realInspect(args);
      },
    );
    const prices = await client.getCollateralPrices();
    expect(prices.iBTC).toBeUndefined();
    expect(prices.IOTA).toBeGreaterThan(0);
  }, 90_000);

  it("throws rather than reporting no prices when the RPC is unreachable", async () => {
    const client = new VirtueClient({ pythLazer });
    vi.spyOn(
      client.getIotaClient(),
      "devInspectTransactionBlock",
    ).mockRejectedValue(new Error("ECONNRESET"));
    await expect(client.getCollateralPrices()).rejects.toThrow(
      /transport failure, not an oracle one/,
    );
  }, 90_000);

  it("throws for an unreachable RPC even when one update is missing", async () => {
    // iBTC has no update, so its inspection never reaches the RPC; that must
    // not mask the other three failing on transport.
    failFeed(1);
    const client = new VirtueClient({ pythLazer });
    vi.spyOn(
      client.getIotaClient(),
      "devInspectTransactionBlock",
    ).mockRejectedValue(new Error("ECONNRESET"));
    await expect(client.getCollateralPrices()).rejects.toThrow(
      /transport failure, not an oracle one/,
    );
  }, 90_000);

  it("falls back to the next endpoint when one is down", async () => {
    const client = new VirtueClient({
      pythLazer: {
        apiKey: LAZER_TOKEN,
        endpoint: ["https://lazer.invalid", "https://pyth-lazer-0.dourolabs.app"],
      },
    });
    const prices = await client.getCollateralPrices();
    expect(prices.IOTA).toBeGreaterThan(0);
  }, 90_000);

  it("writes only the price a position needs", async () => {
    const client = new VirtueClient({ sender: WALLET, pythLazer });
    const tx = await client.buildManagePositionTransaction({
      collateralSymbol: "IOTA",
      depositAmount: "0",
      borrowAmount: "10000",
      repaymentAmount: "0",
      withdrawAmount: "0",
    });
    const typeArgs = (tx.getData().commands as any[]).flatMap(
      (c) => c.MoveCall?.typeArguments ?? [],
    );
    // Nothing of iBTC's, and none of the derived IOTA chains either.
    expect(typeArgs.some((t: string) => t.includes("::ibtc::IBTC"))).toBe(false);
    const calls = moveCallsOf(tx);
    expect(calls).not.toContain("cert_rule::feed");
    expect(calls).not.toContain("vcert_rule::feed");
    expect(calls).toContain("pyth_lazer_rule::feed");
  }, 90_000);

  /**
   * A debt-free position must not be locked in by an oracle outage. Whether a
   * withdrawal needs no price is answered by dev-inspecting the real priceless
   * withdrawal, so these stub that inspection's outcome, and one runs it for
   * real against a position that does not exist.
   */
  const withdrawal = {
    collateralSymbol: "iBTC" as const,
    depositAmount: "0",
    borrowAmount: "0",
    repaymentAmount: "0",
    withdrawAmount: "1000",
  };
  /** Stub only the priceless-withdrawal probe: an `update_position` call. */
  const stubProbe = (
    client: VirtueClient,
    outcome: "success" | "failure" | "throw",
  ) => {
    const iota = client.getIotaClient();
    const realInspect = iota.devInspectTransactionBlock.bind(iota);
    return vi
      .spyOn(iota, "devInspectTransactionBlock")
      .mockImplementation(async (args: any) => {
        const isProbe = (args.transactionBlock?.getData?.().commands ?? []).some(
          (c: any) => c.MoveCall?.function === "update_position",
        );
        if (!isProbe) return realInspect(args);
        if (outcome === "throw") throw new Error("ECONNRESET");
        return {
          effects: { status: { status: outcome } },
          events: [],
        } as any;
      });
  };

  it("withdraws a debt-free position without a price", async () => {
    breakLazer("reject");
    const client = new VirtueClient({ sender: WALLET, pythLazer });
    const probe = stubProbe(client, "success");
    const tx = await client.buildManagePositionTransaction(withdrawal);
    const calls = moveCallsOf(tx);
    expect(probe).toHaveBeenCalled();
    expect(calls).toContain("vault::update_position");
    expect(calls).toContain("option::none");
    expect(calls).not.toContain("aggregater::aggregate");
    expect(calls).not.toContain("pyth_lazer::parse_and_verify_le_ecdsa_update");
  }, 90_000);

  it("refuses when the priceless withdrawal does not pass on chain", async () => {
    // The fail-closed case: an inspection that runs but fails, for any reason
    // (debt outstanding, a wrong type argument, a paused vault), means no.
    breakLazer("reject");
    const client = new VirtueClient({ sender: WALLET, pythLazer });
    stubProbe(client, "failure");
    await expect(
      client.buildManagePositionTransaction(withdrawal),
    ).rejects.toThrow(/No oracle rule could price iBTC/);
  }, 90_000);

  it("refuses for real when the chain rejects the priceless withdrawal", async () => {
    // Unstubbed: the real priceless withdrawal is dev-inspected and aborts on
    // chain, so the build is refused. While the protocol is paused it aborts at
    // `vusd::err_invalid_module_version`; once unpaused, this wallet having no
    // iBTC position aborts it instead.
    breakLazer("reject");
    const client = new VirtueClient({ sender: WALLET, pythLazer });
    await expect(
      client.buildManagePositionTransaction(withdrawal),
    ).rejects.toThrow(/No oracle rule could price iBTC/);
  }, 90_000);

  it("reports an unreachable RPC during the probe as a transport failure", async () => {
    breakLazer("reject");
    const client = new VirtueClient({ sender: WALLET, pythLazer });
    stubProbe(client, "throw");
    await expect(
      client.buildManagePositionTransaction(withdrawal),
    ).rejects.toThrow(/transport failure, not an oracle one/);
  }, 90_000);

  it("never withdraws without a price for an unset sender", async () => {
    breakLazer("reject");
    const client = new VirtueClient({ pythLazer });
    const probe = stubProbe(client, "success");
    await expect(
      client.buildManagePositionTransaction(withdrawal),
    ).rejects.toThrow(/No oracle rule could price iBTC/);
    expect(probe).not.toHaveBeenCalled();
  }, 90_000);

  it("never withdraws without a price onto a composed transaction", async () => {
    // Commands already in the PTB (a borrow on this position, say) change the
    // state the withdrawal executes against, which the probe cannot see.
    breakLazer("reject");
    const client = new VirtueClient({ sender: WALLET, pythLazer });
    const probe = stubProbe(client, "success");
    client.resetTransaction();
    const callerTx = client.getTransaction();
    callerTx.moveCall({
      target: "0x2::clock::timestamp_ms",
      arguments: [callerTx.object.clock()],
    });
    await expect(
      client.buildManagePositionTransaction({
        ...withdrawal,
        keepTransaction: true,
      }),
    ).rejects.toThrow(/No oracle rule could price iBTC/);
    expect(probe).not.toHaveBeenCalled();
  }, 90_000);

  it("never borrows without a price, even debt-free", async () => {
    breakLazer("reject");
    const client = new VirtueClient({ sender: WALLET, pythLazer });
    const probe = stubProbe(client, "success");
    await expect(
      client.buildManagePositionTransaction({
        ...withdrawal,
        borrowAmount: "10000",
        withdrawAmount: "0",
      }),
    ).rejects.toThrow(/No oracle rule could price iBTC/);
    expect(probe).not.toHaveBeenCalled();
  }, 90_000);

  it("omits collaterals it cannot price rather than reporting them as zero", async () => {
    breakLazer("reject");
    const client = new VirtueClient({ pythLazer });
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
    const client = new VirtueClient({
      sender: `0x${"2".repeat(64)}`,
      pythLazer,
    });
    client.resetTransaction();

    const callerTx = client.getTransaction();
    callerTx.setSender(`0x${"1".repeat(64)}`);
    callerTx.moveCall({
      target: "0x2::clock::timestamp_ms",
      arguments: [callerTx.object.clock()],
    });
    const before = callerTx.serialize();

    breakLazer("reject");

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
    const client = new VirtueClient({ sender: WALLET, pythLazer });
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
   * The preflight that decides priceability must hand its verified update to the
   * build, not just its verdict. Checking and then refetching leaves a window
   * where the check passes and the refetch fails — and by then the transaction
   * has been written to and cannot be unwound.
   */
  it("carries the prepared update into the build instead of fetching twice", async () => {
    const client = new VirtueClient({ sender: WALLET, pythLazer });
    client.resetTransaction();
    const callerTx = client.getTransaction();
    const commandsBefore = callerTx.getData().commands.length;

    let lazerCalls = 0;
    globalThis.fetch = (async (input: any, init?: any) => {
      if (isLazer(input)) {
        lazerCalls += 1;
        if (lazerCalls > 1) throw new TypeError("Lazer went away");
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

    expect(lazerCalls).toBe(1);
    expect(returned).toBe(callerTx);
    expect(callerTx.getData().commands.length).toBeGreaterThan(commandsBefore);
  }, 90_000);

  /**
   * `Buffer` is a Node global that browser bundles do not provide. A
   * ReferenceError while decoding the update would be swallowed by the
   * fail-soft catch around preparation, so the only price source there is
   * would simply never contribute in a dApp — invisibly.
   *
   * Only the pure steps run with `Buffer` removed: Node's own `fetch` needs it,
   * so the network half cannot be exercised this way, and in a browser `fetch`
   * is native anyway.
   */
  it("decodes the update without the Node Buffer global", () => {
    const client = new VirtueClient({ pythLazer });
    client.resetTransaction();
    const tx = client.getTransaction();
    const body = { leEcdsa: { encoding: "hex", data: "ab".repeat(124) } };

    const savedBuffer = (globalThis as { Buffer?: unknown }).Buffer;
    delete (globalThis as { Buffer?: unknown }).Buffer;
    let update: Uint8Array | null;
    try {
      update = (client as any).lazerUpdateFromResponse(body);
      if (update) (client as any).verifyLazerUpdate(tx, update);
    } finally {
      (globalThis as { Buffer?: unknown }).Buffer = savedBuffer;
    }

    expect(update!).toBeInstanceOf(Uint8Array);
    expect(update!.length).toBe(124);
    expect(moveCallsOf(tx)).toEqual([
      "pyth_lazer::parse_and_verify_le_ecdsa_update",
    ]);
  });

  /**
   * The priceability probe must build on a transaction of its own. Parking a
   * scratch transaction on the client would expose it through
   * `getTransaction()`, and anything installed during that await would be
   * silently overwritten when the probe put the old one back.
   */
  it("hides and discards nothing while the priceability probe is in flight", async () => {
    const client = new VirtueClient({ sender: WALLET, pythLazer });
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
    const client = new VirtueClient({ sender: WALLET, pythLazer });
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
