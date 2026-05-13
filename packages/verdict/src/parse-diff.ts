import type { ChangedFile } from "./record.js";

export interface DiffSummary {
  filesChanged: ChangedFile[];
  totalAdditions: number;
  totalDeletions: number;
}

const FILE_HEADER = /^\+\+\+ (?:b\/)?(.+?)(?:\t.*)?$/;
const FILE_HEADER_OLD = /^--- (?:a\/)?(.+?)(?:\t.*)?$/;
const HUNK_HEADER = /^@@ /;

export const summarizeDiff = (diff: string): DiffSummary => {
  const filesChanged: ChangedFile[] = [];
  let currentFile: ChangedFile | null = null;
  let inHunk = false;
  let totalAdditions = 0;
  let totalDeletions = 0;
  let lastOldFile: string | null = null;

  for (const line of diff.split(/\r?\n/)) {
    const oldMatch = line.match(FILE_HEADER_OLD);
    if (oldMatch) {
      lastOldFile = oldMatch[1] ?? null;
      continue;
    }
    const newMatch = line.match(FILE_HEADER);
    if (newMatch) {
      const path = newMatch[1] === "/dev/null" ? (lastOldFile ?? "?") : (newMatch[1] ?? "?");
      currentFile = { path, additions: 0, deletions: 0 };
      filesChanged.push(currentFile);
      inHunk = false;
      continue;
    }
    if (HUNK_HEADER.test(line)) {
      inHunk = true;
      continue;
    }
    if (!inHunk || !currentFile) continue;
    if (line.startsWith("+") && !line.startsWith("+++")) {
      currentFile.additions += 1;
      totalAdditions += 1;
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      currentFile.deletions += 1;
      totalDeletions += 1;
    }
  }

  return { filesChanged, totalAdditions, totalDeletions };
};
