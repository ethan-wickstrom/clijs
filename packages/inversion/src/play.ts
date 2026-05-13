import { MAX_GUESSES, MS_PER_DAY, SOLVE_THRESHOLD } from "./constants.js";

export interface Puzzle {
  id: string;
  isoDate: string;
  model: string;
  prompt: string;
  output: string;
}

export interface Guess {
  guessText: string;
  resultingOutput: string;
  similarity: number;
}

export type PuzzleStatus = "in-progress" | "solved" | "exhausted";

export interface PuzzleSession {
  puzzleId: string;
  startedAtIso: string;
  guesses: readonly Guess[];
  status: PuzzleStatus;
}

export interface CompletedPuzzle {
  puzzleId: string;
  isoDate: string;
  completedAtIso: string;
  guesses: readonly Guess[];
  solved: boolean;
  guessCount: number;
}

export interface PlayState {
  completed: readonly CompletedPuzzle[];
  currentStreak: number;
  longestStreak: number;
}

export interface DailyPick {
  isoDate: string;
  index: number;
  puzzle: Puzzle;
}

export const dailyPick = (puzzles: readonly Puzzle[], now: Date = new Date()): DailyPick | null => {
  if (puzzles.length === 0) return null;
  const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const epochDay = Math.floor(utcMidnight / MS_PER_DAY);
  const index = ((epochDay % puzzles.length) + puzzles.length) % puzzles.length;
  const isoDate = new Date(utcMidnight).toISOString().slice(0, 10);
  return { isoDate, index, puzzle: puzzles[index]! };
};

export const emptyPlayState = (): PlayState => ({
  completed: [],
  currentStreak: 0,
  longestStreak: 0,
});

export const hasCompleted = (state: PlayState, puzzleId: string): boolean =>
  state.completed.some((entry) => entry.puzzleId === puzzleId);

export const findCompleted = (state: PlayState, puzzleId: string): CompletedPuzzle | undefined =>
  state.completed.find((entry) => entry.puzzleId === puzzleId);

const SHARE_EMOJI = {
  convergent: "🟩",
  warm: "🟨",
  tepid: "🟧",
  cold: "⬛",
} as const;

const bucketForSimilarity = (similarity: number): keyof typeof SHARE_EMOJI =>
  similarity >= 0.6
    ? "convergent"
    : similarity >= 0.4
      ? "warm"
      : similarity >= 0.2
        ? "tepid"
        : "cold";

export const formatShareGrid = (puzzle: Puzzle, completed: CompletedPuzzle): string => {
  const score = completed.solved ? `${completed.guessCount}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const header = `inversion · ${puzzle.id} · ${puzzle.isoDate} · ${score}`;
  const cells = completed.guesses
    .map((guess) => SHARE_EMOJI[bucketForSimilarity(guess.similarity)])
    .join("");
  return cells.length === 0 ? header : `${header}\n${cells}`;
};

export const startSession = (puzzle: Puzzle): PuzzleSession => ({
  puzzleId: puzzle.id,
  startedAtIso: new Date().toISOString(),
  guesses: [],
  status: "in-progress",
});

export const recordGuess = (session: PuzzleSession, guess: Guess): PuzzleSession => {
  const guesses = [...session.guesses, guess];
  const solved = guess.similarity >= SOLVE_THRESHOLD;
  const exhausted = guesses.length >= MAX_GUESSES && !solved;
  const status: PuzzleStatus = solved ? "solved" : exhausted ? "exhausted" : "in-progress";
  return { ...session, guesses, status };
};

const isoDayBefore = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

export const completeSession = (
  state: PlayState,
  puzzle: Puzzle,
  session: PuzzleSession,
): PlayState => {
  const solved = session.status === "solved";
  const previousIso = state.completed.at(-1)?.isoDate;
  const continuesStreak = previousIso !== undefined && isoDayBefore(puzzle.isoDate) === previousIso;
  const nextStreak = solved ? (continuesStreak ? state.currentStreak + 1 : 1) : 0;
  const completed: CompletedPuzzle = {
    puzzleId: puzzle.id,
    isoDate: puzzle.isoDate,
    completedAtIso: new Date().toISOString(),
    guesses: session.guesses,
    solved,
    guessCount: session.guesses.length,
  };
  return {
    completed: [...state.completed, completed],
    currentStreak: nextStreak,
    longestStreak: Math.max(state.longestStreak, nextStreak),
  };
};
