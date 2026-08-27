import { defineConfig } from 'tsup';
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Absolute on every platform we might build from: POSIX (`/x`), Windows drive
 * letters (`C:\x`, `C:/x`) and UNC shares (`\\server\share\x`). Relative
 * entries like `../src/client.ts` must not match — those are the useful ones.
 */
const ABSOLUTE_PATH = /^(?:[/\\]|[A-Za-z]:[/\\])/;

/**
 * Reduce an absolute path to its bare filename, leaving relative paths alone.
 * Exported so the platform cases can be tested without running a build.
 */
export const toPortableSource = (entry: string): string =>
  typeof entry === 'string' && ABSOLUTE_PATH.test(entry)
    ? entry.split(/[/\\]/).pop()!
    : entry;

/**
 * The CJS bundle is emitted from the ESM one (`legacyOutput`), and that second
 * pass records the build machine's absolute path in the map's `file`/`sources`.
 * That ships a developer's home directory in the published package and makes the
 * artifact differ per checkout, so rewrite those entries to bare filenames.
 */
const stripAbsolutePaths = (mapPath: string) => {
  let map;
  try {
    map = JSON.parse(readFileSync(mapPath, 'utf8'));
  } catch {
    return; // format not emitted in this build
  }
  if (map.file) map.file = toPortableSource(map.file);
  if (Array.isArray(map.sources)) map.sources = map.sources.map(toPortableSource);
  delete map.sourceRoot;
  writeFileSync(mapPath, JSON.stringify(map));
};

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: true,
  sourcemap: true,
  clean: true,
  format: ['esm', 'cjs'],
  platform: 'node',
  tsconfig: './tsconfig.json',
  shims: false,
  dts: true,
  legacyOutput: true,
  onSuccess: async () => {
    writeFileSync('dist/esm/package.json', JSON.stringify({ type: 'module' }));
    stripAbsolutePaths('dist/index.js.map');
    stripAbsolutePaths('dist/esm/index.js.map');
  },
});
