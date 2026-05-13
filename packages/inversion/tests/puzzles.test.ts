import { describe, it, expect, beforeEach } from "vite-plus/test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BUNDLED_PUZZLES,
  UserPuzzleCollisionError,
  findPuzzle,
  loadAllPuzzles,
  slugify,
  writeUserPuzzle,
} from "../src/puzzles.js";

describe("bundled puzzles", () => {
  it("has at least one puzzle", () => {
    expect(BUNDLED_PUZZLES.length).toBeGreaterThan(0);
  });

  it("has unique ids", () => {
    const ids = BUNDLED_PUZZLES.map((puzzle) => puzzle.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every puzzle has non-empty prompt and output and model", () => {
    for (const puzzle of BUNDLED_PUZZLES) {
      expect(puzzle.prompt.length).toBeGreaterThan(0);
      expect(puzzle.output.length).toBeGreaterThan(0);
      expect(puzzle.model.length).toBeGreaterThan(0);
    }
  });
});

describe("slugify", () => {
  it("normalises to kebab-case-ascii", () => {
    expect(slugify("Write a haiku about Saturday.")).toBe("write-a-haiku-about-saturday");
  });

  it("collapses runs of non-alphanumerics", () => {
    expect(slugify("hello   world!!")).toBe("hello-world");
  });

  it("trims leading/trailing dashes", () => {
    expect(slugify("---hi---")).toBe("hi");
  });

  it("falls back to a placeholder if everything was punctuation", () => {
    expect(slugify("!!!---???")).toBe("untitled");
  });

  it("truncates very long inputs", () => {
    const long = "a".repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(48);
  });
});

describe("loadAllPuzzles + writeUserPuzzle", () => {
  let storeRoot: string;
  beforeEach(() => {
    storeRoot = mkdtempSync(join(tmpdir(), "inversion-puz-"));
    return () => rmSync(storeRoot, { recursive: true, force: true });
  });

  it("returns only bundled when no user puzzles exist", () => {
    const result = loadAllPuzzles(storeRoot);
    expect(result.bundledCount).toBe(BUNDLED_PUZZLES.length);
    expect(result.userCount).toBe(0);
    expect(result.rejectedIds).toEqual([]);
    expect(result.puzzles.length).toBe(BUNDLED_PUZZLES.length);
  });

  it("appends a seeded user puzzle alphabetically after bundled", () => {
    writeUserPuzzle(
      {
        id: "zzz-extra",
        prompt: "Write a limerick about debugging.",
        output: "There once was a coder named Sue …",
        model: "claude-sonnet",
      },
      storeRoot,
    );
    const result = loadAllPuzzles(storeRoot);
    expect(result.userCount).toBe(1);
    expect(result.puzzles.at(-1)?.id).toBe("zzz-extra");
  });

  it("rejects a user puzzle with a bundled id at write time", () => {
    expect(() =>
      writeUserPuzzle(
        {
          id: BUNDLED_PUZZLES[0]!.id,
          prompt: "x",
          output: "y",
          model: "claude-sonnet",
        },
        storeRoot,
      ),
    ).toThrow(UserPuzzleCollisionError);
  });

  it("reports rejected ids when a user file later collides with a bundled id", () => {
    writeUserPuzzle(
      {
        id: "user-fine",
        prompt: "ok",
        output: "ok",
        model: "claude-sonnet",
      },
      storeRoot,
    );
    const colliding = BUNDLED_PUZZLES[0]!.id;
    const path = join(storeRoot, ".inversion", "puzzles", `${colliding}.json`);
    const corrupt = {
      id: colliding,
      isoDate: "2026-05-13",
      model: "claude-sonnet",
      prompt: "shadow",
      output: "shadow",
    };
    require("node:fs").writeFileSync(path, JSON.stringify(corrupt));
    const result = loadAllPuzzles(storeRoot);
    expect(result.rejectedIds).toEqual([colliding]);
    expect(result.puzzles.find((puzzle) => puzzle.id === colliding)?.prompt).toBe(
      BUNDLED_PUZZLES[0]!.prompt,
    );
  });

  it("findPuzzle finds bundled and user puzzles by id", () => {
    writeUserPuzzle(
      {
        id: "user-find-me",
        prompt: "p",
        output: "o",
        model: "claude-sonnet",
      },
      storeRoot,
    );
    expect(findPuzzle(BUNDLED_PUZZLES[0]!.id, storeRoot)?.id).toBe(BUNDLED_PUZZLES[0]!.id);
    expect(findPuzzle("user-find-me", storeRoot)?.prompt).toBe("p");
    expect(findPuzzle("nope", storeRoot)).toBeUndefined();
  });

  it("writeUserPuzzle persists a re-readable JSON file", () => {
    const written = writeUserPuzzle(
      {
        id: "haiku-debug",
        prompt: "Write a haiku about debugging.",
        output: "Stacktrace returns / I sip cold coffee at three / the bug winks at me",
        model: "claude-sonnet",
      },
      storeRoot,
    );
    const path = join(storeRoot, ".inversion", "puzzles", "haiku-debug.json");
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed.id).toBe("haiku-debug");
    expect(parsed.prompt).toBe(written.prompt);
    expect(parsed.output).toBe(written.output);
    expect(parsed.isoDate.length).toBe("2026-05-13".length);
  });
});
