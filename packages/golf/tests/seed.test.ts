import { describe, it, expect } from "vite-plus/test";
import { dailySeed } from "../src/seed.js";
import { PUZZLES } from "../src/puzzles.js";

describe("dailySeed", () => {
  it("is deterministic for the same UTC date", () => {
    const a = dailySeed(new Date("2026-05-13T03:14:15Z"));
    const b = dailySeed(new Date("2026-05-13T22:30:00Z"));
    expect(a.isoDate).toBe("2026-05-13");
    expect(b.isoDate).toBe("2026-05-13");
    expect(a.index).toBe(b.index);
    expect(a.puzzle.id).toBe(b.puzzle.id);
  });

  it("advances by one when the UTC date advances", () => {
    const today = dailySeed(new Date("2026-05-13T12:00:00Z"));
    const tomorrow = dailySeed(new Date("2026-05-14T12:00:00Z"));
    const expectedNext = (today.index + 1) % PUZZLES.length;
    expect(tomorrow.index).toBe(expectedNext);
  });

  it("returns a puzzle for every valid date", () => {
    const seed = dailySeed(new Date("2000-01-01T00:00:00Z"));
    expect(PUZZLES).toContain(seed.puzzle);
  });
});
