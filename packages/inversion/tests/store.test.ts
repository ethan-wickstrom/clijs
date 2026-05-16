import { describe, it, expect, beforeEach } from "vite-plus/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPlayState, savePlayState } from "../src/store.js";
import { emptyPlayState } from "../src/play.js";
import type { PlayState } from "../src/play.js";

describe("play store roundtrip", () => {
  let storeRoot: string;
  beforeEach(() => {
    storeRoot = mkdtempSync(join(tmpdir(), "inversion-store-"));
    return () => rmSync(storeRoot, { recursive: true, force: true });
  });

  it("loads an empty state when no file exists", () => {
    const state = loadPlayState(storeRoot);
    expect(state).toEqual(emptyPlayState());
  });

  it("saves and reloads a state without loss", () => {
    const original: PlayState = {
      completed: [
        {
          puzzleId: "sat-haiku",
          isoDate: "2026-05-13",
          completedAtIso: "2026-05-13T00:00:00.000Z",
          guesses: [{ guessText: "haiku", resultingOutput: "a haiku", similarity: 0.7 }],
          solved: true,
          guessCount: 1,
        },
      ],
      currentStreak: 1,
      longestStreak: 1,
    };
    savePlayState(original, storeRoot);
    const reloaded = loadPlayState(storeRoot);
    expect(reloaded).toEqual(original);
  });

  it("falls forward to an empty state on a corrupted file", () => {
    const root = storeRoot;
    savePlayState(emptyPlayState(), root);
    expect(() => loadPlayState(root)).not.toThrow();
  });
});
