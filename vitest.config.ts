import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    /**
     * These are live-mainnet integration tests, not hermetic units: they
     * dry-run real transactions and devInspect oracle probes against the public
     * IOTA fullnode. Vitest runs test files in parallel by default, which puts
     * two files' worth of RPC traffic through that endpoint at once and gets
     * them throttled — tests that pass comfortably on their own then time out.
     * Run the files one at a time so the suite is bounded by the RPC rather
     * than fighting it.
     *
     * `singleThread`, not `fileParallelism` — the latter arrived in Vitest 1.x
     * and this project is pinned to 0.34.6, where an unknown key is accepted
     * and silently ignored.
     */
    singleThread: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
