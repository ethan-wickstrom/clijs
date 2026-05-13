import { describe, it, expect } from "vite-plus/test";
import { recordSubmission } from "../src/store.js";
import type { GolfStore } from "../src/store.js";

const empty: GolfStore = { records: {} };

describe("recordSubmission", () => {
  it("creates a record on first attempt", () => {
    const next = recordSubmission(empty, {
      puzzleId: "fizzbuzz",
      bytes: 42,
      solved: true,
      isoDate: "2026-05-13",
    });
    expect(next.records.fizzbuzz).toEqual({
      puzzleId: "fizzbuzz",
      bestBytes: 42,
      attempts: 1,
      solved: true,
      lastTriedIso: "2026-05-13",
    });
  });

  it("does not set bestBytes on a failed first attempt", () => {
    const next = recordSubmission(empty, {
      puzzleId: "fizzbuzz",
      bytes: 99,
      solved: false,
      isoDate: "2026-05-13",
    });
    expect(next.records.fizzbuzz?.bestBytes).toBeNull();
    expect(next.records.fizzbuzz?.solved).toBe(false);
  });

  it("keeps the smaller bestBytes when solved again", () => {
    let store = recordSubmission(empty, {
      puzzleId: "fizzbuzz",
      bytes: 80,
      solved: true,
      isoDate: "2026-05-13",
    });
    store = recordSubmission(store, {
      puzzleId: "fizzbuzz",
      bytes: 65,
      solved: true,
      isoDate: "2026-05-14",
    });
    expect(store.records.fizzbuzz?.bestBytes).toBe(65);
    expect(store.records.fizzbuzz?.attempts).toBe(2);
  });

  it("does not increase bestBytes when a later solve is worse", () => {
    let store = recordSubmission(empty, {
      puzzleId: "fizzbuzz",
      bytes: 50,
      solved: true,
      isoDate: "2026-05-13",
    });
    store = recordSubmission(store, {
      puzzleId: "fizzbuzz",
      bytes: 70,
      solved: true,
      isoDate: "2026-05-14",
    });
    expect(store.records.fizzbuzz?.bestBytes).toBe(50);
  });

  it("solved status is sticky once true", () => {
    let store = recordSubmission(empty, {
      puzzleId: "fizzbuzz",
      bytes: 50,
      solved: true,
      isoDate: "2026-05-13",
    });
    store = recordSubmission(store, {
      puzzleId: "fizzbuzz",
      bytes: 200,
      solved: false,
      isoDate: "2026-05-14",
    });
    expect(store.records.fizzbuzz?.solved).toBe(true);
    expect(store.records.fizzbuzz?.bestBytes).toBe(50);
  });
});
