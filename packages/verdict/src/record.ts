import { SCHEMA_VERSION } from "./constants.js";

export type VerdictDecision = "merge" | "request-changes" | "close";

export interface ChangedFile {
  path: string;
  additions: number;
  deletions: number;
}

export interface PullRequestContext {
  source: "stdin" | "file" | "github";
  repo: string | null;
  prNumber: number | null;
  title: string;
  author: string | null;
  description: string;
  diff: string;
  filesChanged: readonly ChangedFile[];
  additions: number;
  deletions: number;
}

export interface VerdictRecord {
  id: string;
  schemaVersion: number;
  recordedAt: string;
  context: PullRequestContext;
  decision: VerdictDecision;
  reasoning: string;
  labels: readonly string[];
}

export const newRecord = (
  id: string,
  recordedAt: string,
  context: PullRequestContext,
  decision: VerdictDecision,
  reasoning: string,
  labels: readonly string[],
): VerdictRecord => ({
  id,
  schemaVersion: SCHEMA_VERSION,
  recordedAt,
  context,
  decision,
  reasoning,
  labels,
});

export const isVerdictDecision = (value: string): value is VerdictDecision =>
  value === "merge" || value === "request-changes" || value === "close";
