import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { RECORDS_FILE_NAME, STORE_DIR_NAME } from "./constants.js";
import { normalizeRecord } from "./record.js";
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

export interface ReadResult {
  records: readonly VerdictRecord[];
  corruptedLines: number;
  migratedFromV1: number;
}

export const readAll = (root?: string): ReadResult => {
  const path = recordsPath(root);
  if (!existsSync(path)) return { records: [], corruptedLines: 0, migratedFromV1: 0 };
  const raw = readFileSync(path, "utf8");
  if (raw.trim().length === 0) return { records: [], corruptedLines: 0, migratedFromV1: 0 };
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const records: VerdictRecord[] = [];
  let corruptedLines = 0;
  let migratedFromV1 = 0;
  for (const line of lines) {
    try {
      const parsed: unknown = JSON.parse(line);
      if (typeof parsed !== "object" || parsed === null) {
        corruptedLines += 1;
        continue;
      }
      const asPartial = parsed as { schemaVersion?: number };
      if (asPartial.schemaVersion === undefined || asPartial.schemaVersion < 2) migratedFromV1 += 1;
      records.push(normalizeRecord(parsed));
    } catch {
      corruptedLines += 1;
    }
  }
  return { records, corruptedLines, migratedFromV1 };
};

export const readAllRecords = (root?: string): VerdictRecord[] => [...readAll(root).records];

export const findRecord = (id: string, root?: string): VerdictRecord | undefined =>
  readAllRecords(root).find((record) => record.id === id);
