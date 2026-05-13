import { MS_PER_DAY } from "./constants.js";
import { PUZZLES } from "./puzzles.js";
import type { Puzzle } from "./puzzles.js";

export interface DailySeed {
  isoDate: string;
  index: number;
  puzzle: Puzzle;
}

export const dailySeed = (now: Date = new Date()): DailySeed => {
  const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const epochDay = Math.floor(utcMidnight / MS_PER_DAY);
  const total = PUZZLES.length;
  const index = ((epochDay % total) + total) % total;
  const isoDate = new Date(utcMidnight).toISOString().slice(0, 10);
  return { isoDate, index, puzzle: PUZZLES[index]! };
};
