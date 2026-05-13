import { describe, it, expect } from "vite-plus/test";
import { isVerdictDecision, newRecord } from "../src/record.js";
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
};

describe("isVerdictDecision", () => {
  it("accepts the three valid decisions", () => {
    expect(isVerdictDecision("merge")).toBe(true);
    expect(isVerdictDecision("request-changes")).toBe(true);
    expect(isVerdictDecision("close")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isVerdictDecision("approve")).toBe(false);
    expect(isVerdictDecision("")).toBe(false);
    expect(isVerdictDecision("MERGE")).toBe(false);
  });
});

describe("newRecord", () => {
  it("stamps the current schema version", () => {
    const record = newRecord("id", "iso", emptyContext, "merge", "ok", []);
    expect(record.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("preserves all input fields verbatim", () => {
    const record = newRecord("xyz", "2026-05-13", emptyContext, "close", "out of scope", ["spam"]);
    expect(record.id).toBe("xyz");
    expect(record.recordedAt).toBe("2026-05-13");
    expect(record.decision).toBe("close");
    expect(record.reasoning).toBe("out of scope");
    expect(record.labels).toEqual(["spam"]);
  });
});
