import { describe, expect, it, afterEach, vi } from "vitest";
import { VirtueClient } from "../src/index";

/**
 * Every oracle rule is a best-effort contributor to the price aggregation, so a
 * failure at any one source must degrade to "that rule feeds nothing" rather
 * than raise out of the SDK — otherwise an outage at Switchboard or at Pyth's
 * Hermes takes down price reads, and every position build depending on them,
 * that the remaining rules could have served on their own.
 */
describe("oracle source resilience", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  type Mode = "reject" | "garbage" | "http500";

  /**
   * Break crossbar only. The Switchboard crank calls `fetch` directly, so this
   * is the real seam; Pyth's connection uses axios and is untouched by it.
   */
  const breakCrossbar = (mode: Mode) => {
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
  const breakHermes = (client: VirtueClient) => {
    const conn = client.getPythConnection();
    vi.spyOn(conn, "getPriceFeedsUpdateData").mockRejectedValue(
      new Error("hermes unreachable"),
    );
  };

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

  const moveCalls = (client: VirtueClient) =>
    (client.getTransaction().getData().commands as any[])
      .map((c) =>
        c.MoveCall ? `${c.MoveCall.module}::${c.MoveCall.function}` : "",
      )
      .filter(Boolean);

  const pricesStillResolve = async (client: VirtueClient) => {
    const prices = await client.getCollateralPrices();
    expect(prices.IOTA).toBeGreaterThan(0);
  };

  it.each(["reject", "garbage", "http500"] as const)(
    "prices collaterals when crossbar is %s",
    async (mode) => {
      breakCrossbar(mode);
      const client = new VirtueClient({});
      client.resetTransaction();
      await pricesStillResolve(client);
    },
    30_000,
  );

  it(
    "drops the Pyth update but still feeds the rule when hermes is unreachable",
    async () => {
      const client = new VirtueClient({});
      client.resetTransaction();
      breakHermes(client);
      await client.aggregatePrices();
      const calls = moveCalls(client);
      // No update was attempted...
      expect(calls).not.toContain("vaa::parse_and_verify");
      expect(calls).not.toContain("pyth::update_single_price_feed");
      // ...but the rule still reads the existing PriceInfoObject, and decides
      // for itself whether that value is fresh enough to contribute.
      expect(calls).toContain("pyth_rule::feed");
    },
    30_000,
  );

  it(
    "drops the Pyth update when its VAA would abort on chain",
    async () => {
      const client = new VirtueClient({});
      client.resetTransaction();
      breakVaaVerification(client);
      await client.aggregatePrices();
      const calls = moveCalls(client);
      expect(calls).not.toContain("pyth::update_single_price_feed");
      expect(calls).toContain("pyth_rule::feed");
    },
    30_000,
  );

  it(
    "still applies the Pyth update when everything is healthy",
    async () => {
      const client = new VirtueClient({});
      client.resetTransaction();
      await client.aggregatePrices();
      const calls = moveCalls(client);
      expect(calls).toContain("vaa::parse_and_verify");
      expect(calls).toContain("pyth::update_single_price_feed");
    },
    30_000,
  );

  /**
   * With both update paths down, each rule falls back to the value already on
   * chain and its own staleness gate decides. The SDK's job is only to not be
   * the thing that fails.
   */
  it(
    "does not throw from the SDK when every update path is down",
    async () => {
      breakCrossbar("reject");
      const client = new VirtueClient({});
      client.resetTransaction();
      breakHermes(client);
      await expect(client.aggregatePrices()).resolves.toBeDefined();
    },
    30_000,
  );
});
