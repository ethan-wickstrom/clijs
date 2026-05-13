import { describe, it, expect, beforeEach } from "vite-plus/test";
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendRecord, ensureStore, findRecord, readAll, readAllRecords } from "../src/store.js";
import { newRecord } from "../src/record.js";
import type { PullRequestContext, VerdictRecord } from "../src/record.js";

const emptyContext = (): PullRequestContext => ({
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
});

const makeRecord = (id: string): VerdictRecord =>
  newRecord({
    id,
    recordedAt: "2026-05-13T00:00:00Z",
    context: emptyContext(),
    decision: "merge",
    reasoning: "looks good",
    labels: [],
  });

describe("store", () => {
  let storeRoot: string;
  beforeEach(() => {
    storeRoot = mkdtempSync(join(tmpdir(), "verdict-test-"));
    return () => rmSync(storeRoot, { recursive: true, force: true });
  });

  it("ensureStore creates the directory and an empty records file", () => {
    const dir = ensureStore(storeRoot);
    expect(dir).toBe(join(storeRoot, ".verdict"));
    expect(readFileSync(join(dir, "records.jsonl"), "utf8")).toBe("");
  });

  it("appendRecord writes one JSONL line per record", () => {
    appendRecord(makeRecord("aaa"), storeRoot);
    appendRecord(makeRecord("bbb"), storeRoot);
    const raw = readFileSync(join(storeRoot, ".verdict", "records.jsonl"), "utf8");
    expect(raw.trim().split("\n").length).toBe(2);
  });

  it("readAllRecords returns records in append order", () => {
    appendRecord(makeRecord("aaa"), storeRoot);
    appendRecord(makeRecord("bbb"), storeRoot);
    const records = readAllRecords(storeRoot);
    expect(records.map((record) => record.id)).toEqual(["aaa", "bbb"]);
  });

  it("findRecord returns undefined when missing", () => {
    appendRecord(makeRecord("aaa"), storeRoot);
    expect(findRecord("nope", storeRoot)).toBeUndefined();
    expect(findRecord("aaa", storeRoot)?.id).toBe("aaa");
  });

  it("readAll migrates v1 records on read and counts them", () => {
    mkdirSync(join(storeRoot, ".verdict"), { recursive: true });
    const v1Path = join(storeRoot, ".verdict", "records.jsonl");
    const v1Line = JSON.stringify({
      id: "legacy-1",
      recordedAt: "2026-01-01T00:00:00Z",
      context: {
        source: "stdin",
        repo: "owner/old",
        prNumber: 1,
        title: "legacy",
        author: null,
        description: "",
        diff: "",
        filesChanged: [],
        additions: 0,
        deletions: 0,
      },
      decision: "merge",
      reasoning: "ok",
      labels: [],
    });
    appendFileSync(v1Path, `${v1Line}\n`);
    appendRecord(makeRecord("modern-1"), storeRoot);
    const result = readAll(storeRoot);
    expect(result.records.length).toBe(2);
    expect(result.migratedFromV1).toBe(1);
    expect(result.records[0]?.schemaVersion).toBe(2);
    expect(result.records[0]?.context.headSha).toBeNull();
    expect(result.records[0]?.comments).toEqual([]);
  });

  it("readAll skips corrupted lines and counts them", () => {
    mkdirSync(join(storeRoot, ".verdict"), { recursive: true });
    const path = join(storeRoot, ".verdict", "records.jsonl");
    appendFileSync(path, `${JSON.stringify(makeRecord("good"))}\n`);
    appendFileSync(path, "{not valid json\n");
    appendFileSync(path, `${JSON.stringify(makeRecord("good-2"))}\n`);
    const result = readAll(storeRoot);
    expect(result.records.length).toBe(2);
    expect(result.corruptedLines).toBe(1);
    expect(result.records.map((record) => record.id)).toEqual(["good", "good-2"]);
  });
});
