import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { STORE_DIR_NAME, STORE_FILE_NAME } from "./constants.js";

export interface PuzzleRecord {
  puzzleId: string;
  bestBytes: number | null;
  attempts: number;
  solved: boolean;
  lastTriedIso: string;
}

export interface GolfStore {
  records: Record<string, PuzzleRecord>;
}

const emptyStore = (): GolfStore => ({ records: {} });

const storeDir = (): string => join(homedir(), STORE_DIR_NAME);
const storePath = (): string => join(storeDir(), STORE_FILE_NAME);

export const loadStore = (): GolfStore => {
  try {
    const raw = readFileSync(storePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<GolfStore>;
    return { records: parsed.records ?? {} };
  } catch {
    return emptyStore();
  }
};

export const saveStore = (store: GolfStore): void => {
  mkdirSync(storeDir(), { recursive: true });
  writeFileSync(storePath(), `${JSON.stringify(store, null, 2)}\n`);
};

export interface SubmissionResult {
  puzzleId: string;
  bytes: number;
  solved: boolean;
  isoDate: string;
}

export const recordSubmission = (store: GolfStore, result: SubmissionResult): GolfStore => {
  const existing = store.records[result.puzzleId];
  const previousBest = existing?.bestBytes ?? null;
  const nextBest = result.solved
    ? previousBest === null
      ? result.bytes
      : Math.min(previousBest, result.bytes)
    : previousBest;
  const next: PuzzleRecord = {
    puzzleId: result.puzzleId,
    bestBytes: nextBest,
    attempts: (existing?.attempts ?? 0) + 1,
    solved: (existing?.solved ?? false) || result.solved,
    lastTriedIso: result.isoDate,
  };
  return { records: { ...store.records, [result.puzzleId]: next } };
};
