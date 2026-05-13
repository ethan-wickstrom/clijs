import { describe, it, expect } from "vite-plus/test";
import { PUZZLES, findPuzzle } from "../src/puzzles.js";

describe("bundled puzzles", () => {
  it("has at least one puzzle", () => {
    expect(PUZZLES.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = PUZZLES.map((puzzle) => puzzle.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every puzzle has non-empty prompt and output", () => {
    for (const puzzle of PUZZLES) {
      expect(puzzle.prompt.length).toBeGreaterThan(0);
      expect(puzzle.output.length).toBeGreaterThan(0);
    }
  });

  it("every puzzle declares its model", () => {
    for (const puzzle of PUZZLES) {
      expect(puzzle.model.length).toBeGreaterThan(0);
    }
  });

  it("findPuzzle returns the matching record or undefined", () => {
    const sample = PUZZLES[0]!;
    expect(findPuzzle(sample.id)?.id).toBe(sample.id);
    expect(findPuzzle("definitely-not-real")).toBeUndefined();
  });
});
