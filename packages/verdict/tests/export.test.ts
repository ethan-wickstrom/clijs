import { describe, it, expect } from "vite-plus/test";
import { exportRecords } from "../src/export.js";
import { newRecord } from "../src/record.js";
import type { PullRequestContext, VerdictRecord } from "../src/record.js";

const sampleContext: PullRequestContext = {
  source: "stdin",
  repo: "owner/repo",
  prNumber: 42,
  title: "Fix race in cache.ts",
  author: "octocat",
  description: "Drops the read lock too early.",
  diff: "--- a/cache.ts\n+++ b/cache.ts\n@@ -1,1 +1,1 @@\n-hi\n+hello",
  filesChanged: [{ path: "cache.ts", additions: 1, deletions: 1 }],
  additions: 1,
  deletions: 1,
  headSha: "abcd1234",
  baseSha: "00001111",
  upstreamLicense: "Apache-2.0",
};

const sampleRecord: VerdictRecord = newRecord({
  id: "abc123",
  recordedAt: "2026-05-13T00:00:00Z",
  context: sampleContext,
  decision: "request-changes",
  reasoning: "Touches three subsystems for one symptom.",
  labels: ["concurrency", "tests-needed"],
  comments: [
    {
      filePath: "cache.ts",
      lineStart: 12,
      lineEnd: 15,
      severity: "block",
      body: "The lock is released before the consistent read finishes.",
    },
    {
      filePath: "cache.ts",
      lineStart: 30,
      lineEnd: null,
      severity: "nit",
      body: "Rename `c` to `cache` for clarity.",
    },
  ],
  provenance: { aiAssisted: "partial", coDevelopedBy: ["alice"], dcoVerified: true },
});

describe("exportRecords", () => {
  it("returns empty string for no records", () => {
    expect(exportRecords([], "jsonl")).toBe("");
    expect(exportRecords([], "hf")).toBe("");
    expect(exportRecords([], "openai")).toBe("");
  });

  it("jsonl format preserves the on-disk schema including comments and provenance", () => {
    const output = exportRecords([sampleRecord], "jsonl").trim();
    const parsed = JSON.parse(output) as VerdictRecord;
    expect(parsed.id).toBe("abc123");
    expect(parsed.schemaVersion).toBe(2);
    expect(parsed.comments.length).toBe(2);
    expect(parsed.comments[0]?.severity).toBe("block");
    expect(parsed.provenance.aiAssisted).toBe("partial");
    expect(parsed.provenance.dcoVerified).toBe(true);
    expect(parsed.context.headSha).toBe("abcd1234");
    expect(parsed.context.upstreamLicense).toBe("Apache-2.0");
  });

  it("hf format includes the new flat fields", () => {
    const output = exportRecords([sampleRecord], "hf").trim();
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect(parsed.head_sha).toBe("abcd1234");
    expect(parsed.upstream_license).toBe("Apache-2.0");
    expect(parsed.ai_assisted).toBe("partial");
    expect(parsed.dco_verified).toBe(true);
    expect(Array.isArray(parsed.comments)).toBe(true);
    const comments = parsed.comments as { severity: string; body: string }[];
    expect(comments[0]?.severity).toBe("block");
  });

  it("openai format includes provenance and comments in the assistant message", () => {
    const output = exportRecords([sampleRecord], "openai").trim();
    const parsed = JSON.parse(output) as { messages: { role: string; content: string }[] };
    const assistant = parsed.messages.find((message) => message.role === "assistant");
    expect(assistant?.content).toContain("Decision: request-changes");
    expect(assistant?.content).toContain("Provenance: ai-assist=partial, dco-verified=yes");
    expect(assistant?.content).toContain("Co-developed-by: alice");
    expect(assistant?.content).toContain("[block] cache.ts:12-15");
    expect(assistant?.content).toContain("[nit] cache.ts:30");
  });

  it("openai user message exposes head/base/license for context", () => {
    const output = exportRecords([sampleRecord], "openai").trim();
    const parsed = JSON.parse(output) as { messages: { role: string; content: string }[] };
    const user = parsed.messages.find((message) => message.role === "user");
    expect(user?.content).toContain("Head: abcd1234");
    expect(user?.content).toContain("Base: 00001111");
    expect(user?.content).toContain("Upstream licence: Apache-2.0");
  });
});
