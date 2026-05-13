import { describe, it, expect } from "vite-plus/test";
import {
  completeSession,
  dailyPick,
  emptyPlayState,
  findCompleted,
  formatShareGrid,
  hasCompleted,
  recordGuess,
  startSession,
} from "../src/play.js";
import type { CompletedPuzzle, Guess, Puzzle } from "../src/play.js";
import { MAX_GUESSES, SOLVE_THRESHOLD } from "../src/constants.js";

const makePuzzle = (id: string, isoDate: string): Puzzle => ({
  id,
  isoDate,
  model: "claude-sonnet",
  prompt: "a prompt",
  output: "an output",
});

const guess = (similarity: number): Guess => ({
  guessText: "p",
  resultingOutput: "o",
  similarity,
});

describe("dailyPick", () => {
  it("returns null for an empty bank", () => {
    expect(dailyPick([])).toBeNull();
  });

  it("is deterministic for the same UTC date", () => {
    const puzzles = [makePuzzle("a", "x"), makePuzzle("b", "y"), makePuzzle("c", "z")];
    const morning = dailyPick(puzzles, new Date("2026-05-13T03:14:00Z"));
    const evening = dailyPick(puzzles, new Date("2026-05-13T23:59:00Z"));
    expect(morning?.puzzle.id).toBe(evening?.puzzle.id);
    expect(morning?.isoDate).toBe("2026-05-13");
  });

  it("advances by one on the next UTC day", () => {
    const puzzles = [makePuzzle("a", "x"), makePuzzle("b", "y"), makePuzzle("c", "z")];
    const today = dailyPick(puzzles, new Date("2026-05-13T12:00:00Z"));
    const tomorrow = dailyPick(puzzles, new Date("2026-05-14T12:00:00Z"));
    const expectedNext = (today!.index + 1) % puzzles.length;
    expect(tomorrow?.index).toBe(expectedNext);
  });
});

describe("session state machine", () => {
  it("starts in-progress with no guesses", () => {
    const session = startSession(makePuzzle("p", "2026-05-13"));
    expect(session.guesses).toEqual([]);
    expect(session.status).toBe("in-progress");
  });

  it("stays in-progress on a low-similarity guess", () => {
    let session = startSession(makePuzzle("p", "2026-05-13"));
    session = recordGuess(session, guess(0.1));
    expect(session.status).toBe("in-progress");
  });

  it("flips to solved at threshold", () => {
    let session = startSession(makePuzzle("p", "2026-05-13"));
    session = recordGuess(session, guess(SOLVE_THRESHOLD));
    expect(session.status).toBe("solved");
  });

  it("flips to exhausted after MAX_GUESSES misses", () => {
    let session = startSession(makePuzzle("p", "2026-05-13"));
    for (let index = 0; index < MAX_GUESSES; index++) {
      session = recordGuess(session, guess(0.05));
    }
    expect(session.status).toBe("exhausted");
    expect(session.guesses.length).toBe(MAX_GUESSES);
  });

  it("stops at solved even if it would otherwise exhaust", () => {
    let session = startSession(makePuzzle("p", "2026-05-13"));
    for (let index = 0; index < MAX_GUESSES - 1; index++) {
      session = recordGuess(session, guess(0.05));
    }
    session = recordGuess(session, guess(0.9));
    expect(session.status).toBe("solved");
  });
});

describe("completeSession streak math", () => {
  const puzzleA = makePuzzle("a", "2026-05-13");
  const puzzleB = makePuzzle("b", "2026-05-14");
  const puzzleC = makePuzzle("c", "2026-05-15");
  const puzzleSkip = makePuzzle("z", "2026-05-17");
  const solvedSession = (puzzle: Puzzle) => recordGuess(startSession(puzzle), guess(0.9));

  it("a single solve sets streak to 1", () => {
    const next = completeSession(emptyPlayState(), puzzleA, solvedSession(puzzleA));
    expect(next.currentStreak).toBe(1);
    expect(next.longestStreak).toBe(1);
  });

  it("a consecutive-day solve advances streak to 2", () => {
    let state = completeSession(emptyPlayState(), puzzleA, solvedSession(puzzleA));
    state = completeSession(state, puzzleB, solvedSession(puzzleB));
    expect(state.currentStreak).toBe(2);
    expect(state.longestStreak).toBe(2);
  });

  it("a same-day duplicate solve does NOT advance streak (invariant)", () => {
    let state = completeSession(emptyPlayState(), puzzleA, solvedSession(puzzleA));
    state = completeSession(state, puzzleA, solvedSession(puzzleA));
    expect(state.currentStreak).toBe(1);
  });

  it("a gap day resets streak", () => {
    let state = completeSession(emptyPlayState(), puzzleA, solvedSession(puzzleA));
    state = completeSession(state, puzzleB, solvedSession(puzzleB));
    state = completeSession(state, puzzleSkip, solvedSession(puzzleSkip));
    expect(state.currentStreak).toBe(1);
    expect(state.longestStreak).toBe(2);
  });

  it("a miss resets streak to zero but preserves longest", () => {
    let state = completeSession(emptyPlayState(), puzzleA, solvedSession(puzzleA));
    state = completeSession(state, puzzleB, solvedSession(puzzleB));
    const missed = startSession(puzzleC);
    state = completeSession(state, puzzleC, missed);
    expect(state.currentStreak).toBe(0);
    expect(state.longestStreak).toBe(2);
  });
});

describe("hasCompleted / findCompleted", () => {
  const puzzle = makePuzzle("p", "2026-05-13");
  it("are false / undefined for an unplayed puzzle", () => {
    expect(hasCompleted(emptyPlayState(), "p")).toBe(false);
    expect(findCompleted(emptyPlayState(), "p")).toBeUndefined();
  });

  it("are true / found after completion", () => {
    const state = completeSession(
      emptyPlayState(),
      puzzle,
      recordGuess(startSession(puzzle), guess(0.9)),
    );
    expect(hasCompleted(state, "p")).toBe(true);
    expect(findCompleted(state, "p")?.solved).toBe(true);
  });
});

describe("formatShareGrid", () => {
  const puzzle = makePuzzle("haiku-test", "2026-05-13");
  const completed = (similarities: readonly number[], solved: boolean): CompletedPuzzle => ({
    puzzleId: puzzle.id,
    isoDate: puzzle.isoDate,
    completedAtIso: "2026-05-13T00:00:00.000Z",
    guesses: similarities.map((similarity) => ({
      guessText: "",
      resultingOutput: "",
      similarity,
    })),
    solved,
    guessCount: similarities.length,
  });

  it("emits a header with id + date + solved score", () => {
    const grid = formatShareGrid(puzzle, completed([0.9], true));
    expect(grid).toContain(`inversion · ${puzzle.id} · 2026-05-13 · 1/${MAX_GUESSES}`);
  });

  it("emits X/N for an unsolved playthrough", () => {
    const grid = formatShareGrid(puzzle, completed([0.05, 0.05, 0.05, 0.05, 0.05, 0.05], false));
    expect(grid).toContain(`X/${MAX_GUESSES}`);
  });

  it("maps similarity buckets to the right emoji", () => {
    const grid = formatShareGrid(puzzle, completed([0.05, 0.25, 0.45, 0.85], true));
    expect(grid).toContain("⬛🟧🟨🟩");
  });

  it("emits a one-cell grid for a one-guess solve", () => {
    const grid = formatShareGrid(puzzle, completed([0.8], true));
    expect(grid.split("\n")[1]).toBe("🟩");
  });

  it("does not leak the original prompt", () => {
    const grid = formatShareGrid(puzzle, completed([0.05, 0.5, 0.8], true));
    expect(grid).not.toContain(puzzle.prompt);
    expect(grid).not.toContain(puzzle.output);
  });
});
