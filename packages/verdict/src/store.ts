import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { RECORDS_FILE_NAME, STORE_DIR_NAME } from "./constants.js";
import type { VerdictRecord } from "./record.js";

const storeDir = (root?: string): string => join(root ?? homedir(), STORE_DIR_NAME);
const recordsPath = (root?: string): string => join(storeDir(root), RECORDS_FILE_NAME);

export const ensureStore = (root?: string): string => {
  const dir = storeDir(root);
  mkdirSync(dir, { recursive: true });
  const path = recordsPath(root);
  if (!existsSync(path)) writeFileSync(path, "");
  return dir;
};

export const appendRecord = (record: VerdictRecord, root?: string): void => {
  ensureStore(root);
  appendFileSync(recordsPath(root), `${JSON.stringify(record)}\n`);
};

export const readAllRecords = (root?: string): VerdictRecord[] => {
  const path = recordsPath(root);
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf8");
  if (raw.trim().length === 0) return [];
  return raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as VerdictRecord);
};

export const findRecord = (id: string, root?: string): VerdictRecord | undefined =>
  readAllRecords(root).find((record) => record.id === id);
