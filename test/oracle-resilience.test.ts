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

  /**
   * The mirror of the case above: composing with `keepTransaction: true` means
   * the caller keeps building on the instance they already hold, so a *success*
   * must land on that same instance too. Rebuilding a replacement would leave
   * the caller holding a transaction missing the position entirely — and would
   * silently drop the instance's build plugins, which is invisible until
   * whatever they installed fails to run.
   */
  it("builds onto the caller's own transaction instance, plugins intact", async () => {
    const client = new VirtueClient({
      sender:
        "0x08e00db614b1024014b33f86e9d0baf76a48649b317d1517536502c521d20322",
    });
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

    // A zero-value deposit composes without needing a price at all, so this
    // exercises the success path rather than the oracle.
    const returned = await client.buildManagePositionTransaction({
      collateralSymbol: "IOTA",
      depositAmount: "0",
      borrowAmount: "0",
      repaymentAmount: "0",
      withdrawAmount: "0",
      keepTransaction: true,
    });

    // Same object throughout — what the caller holds, what the client uses, and
    // what came back.
    expect(returned).toBe(callerTx);
    expect(client.getTransaction()).toBe(callerTx);
    // The position landed on it, alongside the command the caller had already put there.
    expect(callerTx.getData().commands.length).toBeGreaterThan(1);
    // And the caller's own build plugin still runs.
    await callerTx.build({ client: client.getIotaClient() });
    expect(pluginRuns).toBe(1);
  }, 60_000);

  /**
   * The preflight that decides whether a collateral is priceable must hand its
   * validated update to the build, not just its verdict. Checking and then
   * refetching leaves a window where the check passes and the refetch fails —
   * and by then the transaction has been written to and cannot be unwound.
   */
  it("carries the prepared Pyth update into the build instead of fetching twice", async () => {
    const client = new VirtueClient({
      sender:
        "0x08e00db614b1024014b33f86e9d0baf76a48649b317d1517536502c521d20322",
    });
    client.resetTransaction();

    const callerTx = client.getTransaction();
    callerTx.moveCall({
      target: "0x2::clock::timestamp_ms",
      arguments: [callerTx.object.clock()],
    });
    const commandsBefore = callerTx.getData().commands.length;

    // Hermes answers once and then goes away — the transient boundary a
    // check-then-refetch would fall through.
    const conn = client.getPythConnection();
    const realFetchUpdate = conn.getPriceFeedsUpdateData.bind(conn);
    let hermesCalls = 0;
    vi.spyOn(conn, "getPriceFeedsUpdateData").mockImplementation(
      async (ids: string[]) => {
        hermesCalls += 1;
        if (hermesCalls > 1) throw new Error("hermes went away");
        return realFetchUpdate(ids);
      },
    );

    // iBTC is the case that matters: Pyth is its only source, so its
    // priceability rests entirely on that one update.
    const returned = await client.buildManagePositionTransaction({
      collateralSymbol: "iBTC",
      depositAmount: "0",
      borrowAmount: "10000",
      repaymentAmount: "0",
      withdrawAmount: "0",
      keepTransaction: true,
    });

    // The update was fetched once and reused, so the second failure never happened.
    expect(hermesCalls).toBe(1);
    // ...and the position was built onto the caller's own instance.
    expect(returned).toBe(callerTx);
    expect(client.getTransaction()).toBe(callerTx);
    expect(callerTx.getData().commands.length).toBeGreaterThan(commandsBefore);
  }, 60_000);

  /**
   * `Buffer` is a Node global that browser bundles do not provide. A
   * ReferenceError here would be swallowed by the fail-soft catch around
   * preparation, so Switchboard would simply never contribute in a dApp — and
   * the failure would be invisible until the day Pyth is the source that broke.
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
   * Being wired up to Switchboard is not the same as Switchboard currently
   * having a price. With nothing cranked and the aggregator stale the rule
   * abstains and `aggregate` fails its threshold, so a precondition that
   * answered from configuration would hand back a transaction that cannot
   * execute — after writing it onto the caller's instance.
   */
  it("refuses to build, untouched, when IOTA's configured sources are all down", async () => {
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
    breakHermes(client);

    // IOTA *is* wired to a Switchboard aggregator — that is the point. Nothing
    // can crank it, so nothing can price IOTA either.
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
   * A Switchboard submission is only accepted for `max_staleness_seconds` after
   * the oracle signed it, and it runs before the aggregation, so an expired one
   * aborts the whole PTB. A transaction going to a wallet may be approved well
   * after that window, so it must not carry one when Pyth already has the price.
   */
  it("puts no expiring Switchboard submission in a transaction bound for signing", async () => {
    const client = new VirtueClient({
      sender:
        "0x08e00db614b1024014b33f86e9d0baf76a48649b317d1517536502c521d20322",
    });
    client.resetTransaction();

    const tx = await client.buildManagePositionTransaction({
      collateralSymbol: "IOTA",
      depositAmount: "0",
      borrowAmount: "10000",
      repaymentAmount: "0",
      withdrawAmount: "0",
      keepTransaction: true,
    });

    const calls = (tx.getData().commands as any[])
      .map((c) =>
        c.MoveCall ? `${c.MoveCall.module}::${c.MoveCall.function}` : "",
      )
      .filter(Boolean);
    // Pyth carries this one, so nothing with a deadline goes to the wallet...
    expect(calls).not.toContain("aggregator_submit_result_action::run");
    expect(calls).toContain("pyth::update_single_price_feed");
    // ...while the read path, which dry-runs immediately, still cranks.
    client.resetTransaction();
    await client.aggregatePrices();
    const readCalls = (client.getTransaction().getData().commands as any[])
      .map((c) =>
        c.MoveCall ? `${c.MoveCall.module}::${c.MoveCall.function}` : "",
      )
      .filter(Boolean);
    expect(readCalls).toContain("aggregator_submit_result_action::run");
  }, 90_000);

  it("does not throw from the SDK when every update path is down", async () => {
    breakCrossbar("reject");
    const client = new VirtueClient({});
    client.resetTransaction();
    breakHermes(client);
    await expect(client.aggregatePrices()).resolves.toBeDefined();
  }, 60_000);
});
