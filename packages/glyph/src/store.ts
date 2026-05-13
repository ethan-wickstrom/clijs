import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { STORE_DIR_NAME, STORE_FILE_NAME } from "./constants.js";

export interface DailyResult {
  isoDate: string;
  won: boolean;
  guesses: number;
  answer: string;
}

export interface StreakState {
  lastPlayedIso: string | null;
  currentStreak: number;
  longestStreak: number;
  played: number;
  won: number;
  history: Record<string, DailyResult>;
}

const emptyState = (): StreakState => ({
  lastPlayedIso: null,
  currentStreak: 0,
  longestStreak: 0,
  played: 0,
  won: 0,
  history: {},
});

const storeDir = (): string => join(homedir(), STORE_DIR_NAME);
const storePath = (): string => join(storeDir(), STORE_FILE_NAME);

export const loadStore = (): StreakState => {
  try {
    const raw = readFileSync(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<StreakState>;
    return { ...emptyState(), ...parsed, history: parsed.history ?? {} };
  } catch {
    return emptyState();
  }
};

export const saveStore = (state: StreakState): void => {
  mkdirSync(storeDir(), { recursive: true });
  writeFileSync(storePath(), `${JSON.stringify(state, null, 2)}\n`);
};

const isYesterday = (previousIso: string, currentIso: string): boolean => {
  const previousMs = Date.parse(`${previousIso}T00:00:00Z`);
  const currentMs = Date.parse(`${currentIso}T00:00:00Z`);
  return currentMs - previousMs === 86_400_000;
};

export const recordResult = (state: StreakState, result: DailyResult): StreakState => {
  if (state.history[result.isoDate]) return state;
  const continuesStreak =
    state.lastPlayedIso !== null && isYesterday(state.lastPlayedIso, result.isoDate);
  const nextStreak = result.won ? (continuesStreak ? state.currentStreak + 1 : 1) : 0;
  return {
    lastPlayedIso: result.isoDate,
    currentStreak: nextStreak,
    longestStreak: Math.max(state.longestStreak, nextStreak),
    played: state.played + 1,
    won: state.won + (result.won ? 1 : 0),
    history: { ...state.history, [result.isoDate]: result },
  };
};
