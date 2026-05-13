import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { STORE_DIR_NAME, STORE_FILE_NAME } from "./constants.js";
import { emptyPlayState } from "./play.js";
import type { PlayState } from "./play.js";

const storeDir = (root?: string): string => join(root ?? homedir(), STORE_DIR_NAME);
const playPath = (root?: string): string => join(storeDir(root), STORE_FILE_NAME);

export const loadPlayState = (root?: string): PlayState => {
  const path = playPath(root);
  if (!existsSync(path)) return emptyPlayState();
  const raw = readFileSync(path, "utf8");
  if (raw.trim().length === 0) return emptyPlayState();
  const parsed = JSON.parse(raw) as Partial<PlayState>;
  const baseline = emptyPlayState();
  return {
    completed: parsed.completed ?? baseline.completed,
    currentStreak: parsed.currentStreak ?? baseline.currentStreak,
    longestStreak: parsed.longestStreak ?? baseline.longestStreak,
  };
};

export const savePlayState = (state: PlayState, root?: string): void => {
  mkdirSync(storeDir(root), { recursive: true });
  writeFileSync(playPath(root), `${JSON.stringify(state, null, 2)}\n`);
};
