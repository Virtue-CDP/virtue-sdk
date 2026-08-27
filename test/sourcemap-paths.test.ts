import { describe, expect, it } from "vitest";
import { toPortableSource } from "../tsup.config";

/**
 * Published source maps must not carry the build machine's absolute paths: it
 * leaks whoever built it and makes the artifact differ per checkout. The build
 * runs on POSIX today, but the sanitizer is the only thing standing between a
 * Windows or CI build and a leaked path, so pin every absolute form.
 */
describe("source map path sanitizer", () => {
  it.each([
    ["POSIX", "/Users/someone/virtue-sdk/dist/index.js"],
    [
      "Windows drive, backslashes",
      "C:\\Users\\someone\\virtue-sdk\\dist\\index.js",
    ],
    [
      "Windows drive, forward slashes",
      "C:/Users/someone/virtue-sdk/dist/index.js",
    ],
    ["lowercase drive letter", "d:\\build\\dist\\index.js"],
    ["UNC share", "\\\\buildserver\\share\\virtue-sdk\\dist\\index.js"],
  ])("reduces an absolute path to its filename (%s)", (_label, absolute) => {
    expect(toPortableSource(absolute)).toBe("index.js");
    expect(toPortableSource(absolute)).not.toMatch(/[/\\]/);
  });

  it.each([
    "../src/client.ts",
    "../../src/constants/object.ts",
    "index.js",
    "src/utils/format.ts",
  ])("leaves the relative path %s alone", (relative) => {
    // These are the entries that make a source map useful — never touch them.
    expect(toPortableSource(relative)).toBe(relative);
  });
});
