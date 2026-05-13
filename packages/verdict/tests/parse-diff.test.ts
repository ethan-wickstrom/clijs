import { describe, it, expect } from "vite-plus/test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { summarizeDiff } from "../src/parse-diff.js";

const here = dirname(fileURLToPath(import.meta.url));
const examplePath = (name: string): string => join(here, "..", "examples", name);

describe("summarizeDiff", () => {
  it("returns no files for empty input", () => {
    const summary = summarizeDiff("");
    expect(summary.filesChanged).toEqual([]);
    expect(summary.totalAdditions).toBe(0);
    expect(summary.totalDeletions).toBe(0);
  });

  it("counts a one-line typo fix correctly across two files", () => {
    const diff = readFileSync(examplePath("typo-fix.diff"), "utf8");
    const summary = summarizeDiff(diff);
    expect(summary.filesChanged.map((file) => file.path)).toEqual(["README.md", "src/index.ts"]);
    expect(summary.totalAdditions).toBe(2);
    expect(summary.totalDeletions).toBe(2);
  });

  it("counts a risky rewrite as many adds and deletes", () => {
    const diff = readFileSync(examplePath("risky-rewrite.diff"), "utf8");
    const summary = summarizeDiff(diff);
    expect(summary.filesChanged.length).toBe(1);
    expect(summary.filesChanged[0]?.path).toBe("src/cache.ts");
    expect(summary.totalAdditions).toBeGreaterThan(50);
    expect(summary.totalDeletions).toBeGreaterThan(20);
  });

  it("ignores hunk metadata lines starting with @@", () => {
    const diff = [
      "--- a/foo.ts",
      "+++ b/foo.ts",
      "@@ -1,2 +1,3 @@",
      " context",
      "+added",
      "-removed",
    ].join("\n");
    const summary = summarizeDiff(diff);
    expect(summary.totalAdditions).toBe(1);
    expect(summary.totalDeletions).toBe(1);
  });
});
