import { MAX_GUESSES, WORD_LENGTH } from "./constants.js";
import { isAccepted } from "./words.js";

export type LetterStatus = "hit" | "near" | "miss";

export interface ScoredLetter {
  letter: string;
  status: LetterStatus;
}

export interface GuessRow {
  guess: string;
  scored: readonly ScoredLetter[];
}

export type GameStatus = "playing" | "won" | "lost";

export interface GameState {
  answer: string;
  rows: readonly GuessRow[];
  status: GameStatus;
}

export type SubmitOutcome =
  | { ok: true; state: GameState }
  | { ok: false; reason: "wrong-length" | "not-a-word" | "already-finished" };

export const newGame = (answer: string): GameState => ({
  answer,
  rows: [],
  status: "playing",
});

export const scoreGuess = (guess: string, answer: string): GuessRow => {
  const length = guess.length;
  const statuses: LetterStatus[] = Array.from({ length }, () => "miss");
  const remainingByLetter = new Map<string, number>();
  for (let position = 0; position < length; position++) {
    if (guess[position] === answer[position]) {
      statuses[position] = "hit";
      continue;
    }
    const answerLetter = answer[position]!;
    remainingByLetter.set(answerLetter, (remainingByLetter.get(answerLetter) ?? 0) + 1);
  }
  for (let position = 0; position < length; position++) {
    if (statuses[position] === "hit") continue;
    const guessLetter = guess[position]!;
    const remainingForLetter = remainingByLetter.get(guessLetter) ?? 0;
    if (remainingForLetter > 0) {
      statuses[position] = "near";
      remainingByLetter.set(guessLetter, remainingForLetter - 1);
    }
  }
  const scored = statuses.map((status, position) => ({
    letter: guess[position]!,
    status,
  }));
  return { guess, scored };
};

export const submitGuess = (state: GameState, rawGuess: string): SubmitOutcome => {
  if (state.status !== "playing") return { ok: false, reason: "already-finished" };
  const normalized = rawGuess.trim().toLowerCase();
  if (normalized.length !== WORD_LENGTH) return { ok: false, reason: "wrong-length" };
  if (!isAccepted(normalized)) return { ok: false, reason: "not-a-word" };
  const row = scoreGuess(normalized, state.answer);
  const rows = [...state.rows, row];
  const didWin = normalized === state.answer;
  const didExhaustGuesses = rows.length >= MAX_GUESSES;
  const status: GameStatus = didWin ? "won" : didExhaustGuesses ? "lost" : "playing";
  return { ok: true, state: { ...state, rows, status } };
};
