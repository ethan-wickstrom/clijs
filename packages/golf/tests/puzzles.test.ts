import { describe, it, expect } from "vite-plus/test";
import { PUZZLES, findPuzzle } from "../src/puzzles.js";

describe("PUZZLES", () => {
  it("has unique ids", () => {
    const ids = PUZZLES.map((puzzle) => puzzle.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses kebab-case ids", () => {
    for (const puzzle of PUZZLES) {
      expect(/^[a-z][a-z0-9-]*$/.test(puzzle.id)).toBe(true);
    }
  });

  it("every example appears in the tests list", () => {
    for (const puzzle of PUZZLES) {
      for (const example of puzzle.examples) {
        const matched = puzzle.tests.some(
          (test) =>
            JSON.stringify(test.input) === JSON.stringify(example.input) &&
            JSON.stringify(test.output) === JSON.stringify(example.output),
        );
        expect(matched).toBe(true);
      }
    }
  });

  it("every puzzle has at least one example and one hidden test", () => {
    for (const puzzle of PUZZLES) {
      expect(puzzle.examples.length).toBeGreaterThan(0);
      expect(puzzle.tests.length).toBeGreaterThan(puzzle.examples.length);
    }
  });

  it("findPuzzle locates by id", () => {
    expect(findPuzzle("fizzbuzz")?.id).toBe("fizzbuzz");
    expect(findPuzzle("not-a-real-puzzle")).toBeUndefined();
  });
});
