import { describe, it, expect, beforeEach } from "vite-plus/test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendRecord, ensureStore, findRecord, readAllRecords } from "../src/store.js";
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
});

const makeRecord = (id: string): VerdictRecord =>
  newRecord(id, "2026-05-13T00:00:00Z", emptyContext(), "merge", "looks good", []);

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

  it("readAllRecords returns the records in append order", () => {
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
});
