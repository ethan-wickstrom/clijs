import { MS_PER_DAY } from "./constants.js";
import { ANSWERS } from "./words.js";

export interface DailySeed {
  isoDate: string;
  index: number;
  word: string;
}

export const dailySeed = (now: Date = new Date()): DailySeed => {
  const utcMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const epochDay = Math.floor(utcMidnight / MS_PER_DAY);
  const total = ANSWERS.length;
  const index = ((epochDay % total) + total) % total;
  const isoDate = new Date(utcMidnight).toISOString().slice(0, 10);
  return { isoDate, index, word: ANSWERS[index]! };
};
