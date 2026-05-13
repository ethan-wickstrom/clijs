import { describe, it, expect } from "vite-plus/test";
import { exportRecords } from "../src/export.js";
import { newRecord } from "../src/record.js";
import type { PullRequestContext, VerdictRecord } from "../src/record.js";

const sampleContext: PullRequestContext = {
  source: "stdin",
  repo: "owner/repo",
  prNumber: 42,
  title: "Fix typo in README",
  author: "octocat",
  description: "Found a typo on line 12.",
  diff: "--- a/README.md\n+++ b/README.md\n@@ -1,1 +1,1 @@\n-hi\n+hello",
  filesChanged: [{ path: "README.md", additions: 1, deletions: 1 }],
  additions: 1,
  deletions: 1,
};

const sampleRecord: VerdictRecord = newRecord(
  "abc123",
  "2026-05-13T00:00:00Z",
  sampleContext,
  "merge",
  "Clear, scoped, no side-effects.",
  ["docs"],
);

describe("exportRecords", () => {
  it("returns empty string for no records", () => {
    expect(exportRecords([], "jsonl")).toBe("");
    expect(exportRecords([], "hf")).toBe("");
    expect(exportRecords([], "openai")).toBe("");
  });

  it("jsonl format preserves the on-disk schema", () => {
    const output = exportRecords([sampleRecord], "jsonl").trim();
    const parsed = JSON.parse(output) as VerdictRecord;
    expect(parsed.id).toBe("abc123");
    expect(parsed.decision).toBe("merge");
    expect(parsed.context.filesChanged[0]?.path).toBe("README.md");
  });

  it("hf format flattens the context for dataset loading", () => {
    const output = exportRecords([sampleRecord], "hf").trim();
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed.id).toBe("abc123");
    expect(parsed.repo).toBe("owner/repo");
    expect(parsed.pr_number).toBe(42);
    expect(parsed.decision).toBe("merge");
    expect(parsed.reasoning).toBe("Clear, scoped, no side-effects.");
    expect(Array.isArray(parsed.files_changed)).toBe(true);
  });

  it("openai format produces a system/user/assistant chat row", () => {
    const output = exportRecords([sampleRecord], "openai").trim();
    const parsed = JSON.parse(output) as { messages: { role: string; content: string }[] };
    expect(parsed.messages.length).toBe(3);
    expect(parsed.messages[0]?.role).toBe("system");
    expect(parsed.messages[1]?.role).toBe("user");
    expect(parsed.messages[2]?.role).toBe("assistant");
    expect(parsed.messages[1]?.content).toContain("Title: Fix typo in README");
    expect(parsed.messages[1]?.content).toContain("Diff:");
    expect(parsed.messages[2]?.content).toContain("Decision: merge");
    expect(parsed.messages[2]?.content).toContain("Clear, scoped, no side-effects.");
  });
});
