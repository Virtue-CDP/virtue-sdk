import { describe, expect, it, afterEach } from "vitest";
import { VirtueClient } from "../src/index";

/**
 * `crankSwitchboard` is a best-effort contributor to the price aggregation, so a
 * crossbar failure must degrade to "feed nothing" rather than raise out of the
 * SDK — otherwise an outage at Switchboard takes down price reads, and every
 * position build depending on them, that the other rules could have served.
 */
describe("Switchboard crank resilience", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  /** Break only crossbar; Pyth and the RPC keep working. */
  const breakCrossbar = (mode: "reject" | "garbage" | "http500") => {
    globalThis.fetch = (async (input: any, init?: any) => {
      const url = typeof input === "string" ? input : input?.url ?? "";
      if (!url.includes("crossbar.switchboard.xyz")) {
        return realFetch(input, init);
      }
      if (mode === "reject") throw new TypeError("fetch failed");
      if (mode === "http500") return new Response("nope", { status: 500 });
      return new Response("{not json", { status: 200 });
    }) as typeof fetch;
  };

  it.each(["reject", "garbage", "http500"] as const)(
    "still prices collaterals when crossbar %s",
    async (mode) => {
      breakCrossbar(mode);
      const client = new VirtueClient({});
      client.resetTransaction();
      const prices = await client.getCollateralPrices();
      expect(prices.IOTA).toBeGreaterThan(0);
    },
    30_000,
  );
});
