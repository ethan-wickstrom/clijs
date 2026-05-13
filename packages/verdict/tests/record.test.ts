import { describe, it, expect } from "vite-plus/test";
import {
  defaultProvenance,
  isAiAssistLevel,
  isCommentSeverity,
  isVerdictDecision,
  newRecord,
  normalizeRecord,
  wasMigrated,
} from "../src/record.js";
import { SCHEMA_VERSION } from "../src/constants.js";
import type { PullRequestContext } from "../src/record.js";

const emptyContext: PullRequestContext = {
  source: "stdin",
  repo: null,
  prNumber: null,
  title: "",
  author: null,
  description: "",
  diff: "",
  filesChanged: [],
  additions: 0,
  deletions: 0,
  headSha: null,
  baseSha: null,
  upstreamLicense: null,
};

describe("type guards", () => {
  it("isVerdictDecision accepts merge / request-changes / close", () => {
    expect(isVerdictDecision("merge")).toBe(true);
    expect(isVerdictDecision("request-changes")).toBe(true);
    expect(isVerdictDecision("close")).toBe(true);
    expect(isVerdictDecision("approve")).toBe(false);
  });

  it("isCommentSeverity accepts the four levels", () => {
    expect(isCommentSeverity("nit")).toBe(true);
    expect(isCommentSeverity("discuss")).toBe(true);
    expect(isCommentSeverity("requested-change")).toBe(true);
    expect(isCommentSeverity("block")).toBe(true);
    expect(isCommentSeverity("critical")).toBe(false);
  });

  it("isAiAssistLevel accepts the four levels", () => {
    expect(isAiAssistLevel("none")).toBe(true);
    expect(isAiAssistLevel("partial")).toBe(true);
    expect(isAiAssistLevel("majority")).toBe(true);
    expect(isAiAssistLevel("unknown")).toBe(true);
    expect(isAiAssistLevel("yes")).toBe(false);
  });
});

describe("newRecord", () => {
  it("stamps the current schema version", () => {
    const record = newRecord({
      id: "id",
      recordedAt: "iso",
      context: emptyContext,
      decision: "merge",
      reasoning: "ok",
      labels: [],
    });
    expect(record.schemaVersion).toBe(SCHEMA_VERSION);
    expect(record.schemaVersion).toBe(2);
  });

  it("defaults comments to empty array and provenance to baseline", () => {
    const record = newRecord({
      id: "id",
      recordedAt: "iso",
      context: emptyContext,
      decision: "merge",
      reasoning: "ok",
      labels: [],
    });
    expect(record.comments).toEqual([]);
    expect(record.provenance).toEqual(defaultProvenance());
  });

  it("preserves provided comments and provenance", () => {
    const record = newRecord({
      id: "id",
      recordedAt: "iso",
      context: emptyContext,
      decision: "request-changes",
      reasoning: "see comments",
      labels: ["security"],
      comments: [
        {
          filePath: "src/foo.ts",
          lineStart: 10,
          lineEnd: null,
          severity: "block",
          body: "race condition",
        },
      ],
      provenance: { aiAssisted: "partial", coDevelopedBy: ["alice"], dcoVerified: true },
    });
    expect(record.comments.length).toBe(1);
    expect(record.comments[0]?.severity).toBe("block");
    expect(record.provenance.aiAssisted).toBe("partial");
    expect(record.provenance.dcoVerified).toBe(true);
  });
});

describe("normalizeRecord (v1 → v2 migration)", () => {
  it("upgrades a v1 record (no schemaVersion, no comments, no provenance) to v2 with defaults", () => {
    const v1 = {
      id: "old",
      recordedAt: "2026-01-01T00:00:00Z",
      context: {
        source: "stdin",
        repo: "owner/name",
        prNumber: 7,
        title: "old",
        author: "alice",
        description: "",
        diff: "--- a/f\n+++ b/f\n",
        filesChanged: [{ path: "f", additions: 1, deletions: 0 }],
        additions: 1,
        deletions: 0,
      },
      decision: "merge",
      reasoning: "lgtm",
      labels: [],
    };
    expect(wasMigrated(v1)).toBe(true);
    const v2 = normalizeRecord(v1);
    expect(v2.schemaVersion).toBe(2);
    expect(v2.comments).toEqual([]);
    expect(v2.provenance).toEqual(defaultProvenance());
    expect(v2.context.headSha).toBeNull();
    expect(v2.context.baseSha).toBeNull();
    expect(v2.context.upstreamLicense).toBeNull();
    expect(v2.id).toBe("old");
    expect(v2.context.filesChanged[0]?.path).toBe("f");
  });

  it("leaves a v2 record unchanged", () => {
    const v2 = {
      id: "new",
      schemaVersion: 2,
      recordedAt: "iso",
      context: { ...emptyContext, headSha: "abc", baseSha: "def", upstreamLicense: "MIT" },
      decision: "merge",
      reasoning: "good",
      labels: ["docs"],
      comments: [{ filePath: "x", lineStart: 1, lineEnd: 2, severity: "nit", body: "tiny" }],
      provenance: { aiAssisted: "none", coDevelopedBy: [], dcoVerified: true },
    };
    expect(wasMigrated(v2)).toBe(false);
    const normalized = normalizeRecord(v2);
    expect(normalized.context.headSha).toBe("abc");
    expect(normalized.context.upstreamLicense).toBe("MIT");
    expect(normalized.comments[0]?.severity).toBe("nit");
    expect(normalized.provenance.aiAssisted).toBe("none");
    expect(normalized.provenance.dcoVerified).toBe(true);
  });

  it("normalises malformed nested fields to safe defaults", () => {
    const malformed = {
      id: "weird",
      recordedAt: "iso",
      context: { source: "rogue", repo: null, title: "x", filesChanged: [{ path: "f" }] },
      decision: "approve",
      reasoning: "x",
      labels: ["spam"],
      comments: [{ filePath: "y", lineStart: 1, severity: "critical", body: "bad" }],
      provenance: { aiAssisted: "yes" },
    };
    const out = normalizeRecord(malformed);
    expect(out.context.source).toBe("stdin");
    expect(out.context.filesChanged[0]?.additions).toBe(0);
    expect(out.decision).toBe("close");
    expect(out.comments[0]?.severity).toBe("discuss");
    expect(out.provenance.aiAssisted).toBe("unknown");
  });
});
