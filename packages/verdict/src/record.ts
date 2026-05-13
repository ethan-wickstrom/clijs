import { SCHEMA_VERSION } from "./constants.js";

export type VerdictDecision = "merge" | "request-changes" | "close";

export type CommentSeverity = "nit" | "discuss" | "requested-change" | "block";

export type AiAssistLevel = "none" | "partial" | "majority" | "unknown";

export interface ChangedFile {
  path: string;
  additions: number;
  deletions: number;
}

export interface ReviewComment {
  filePath: string;
  lineStart: number;
  lineEnd: number | null;
  severity: CommentSeverity;
  body: string;
}

export interface Provenance {
  aiAssisted: AiAssistLevel;
  coDevelopedBy: readonly string[];
  dcoVerified: boolean;
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
  headSha: string | null;
  baseSha: string | null;
  upstreamLicense: string | null;
}

export interface VerdictRecord {
  id: string;
  schemaVersion: number;
  recordedAt: string;
  context: PullRequestContext;
  decision: VerdictDecision;
  reasoning: string;
  labels: readonly string[];
  comments: readonly ReviewComment[];
  provenance: Provenance;
}

export interface NewRecordInput {
  id: string;
  recordedAt: string;
  context: PullRequestContext;
  decision: VerdictDecision;
  reasoning: string;
  labels: readonly string[];
  comments?: readonly ReviewComment[];
  provenance?: Provenance;
}

export const defaultProvenance = (): Provenance => ({
  aiAssisted: "unknown",
  coDevelopedBy: [],
  dcoVerified: false,
});

export const newRecord = (input: NewRecordInput): VerdictRecord => ({
  id: input.id,
  schemaVersion: SCHEMA_VERSION,
  recordedAt: input.recordedAt,
  context: input.context,
  decision: input.decision,
  reasoning: input.reasoning,
  labels: input.labels,
  comments: input.comments ?? [],
  provenance: input.provenance ?? defaultProvenance(),
});

export const isVerdictDecision = (value: string): value is VerdictDecision =>
  value === "merge" || value === "request-changes" || value === "close";

export const isCommentSeverity = (value: string): value is CommentSeverity =>
  value === "nit" || value === "discuss" || value === "requested-change" || value === "block";

export const isAiAssistLevel = (value: string): value is AiAssistLevel =>
  value === "none" || value === "partial" || value === "majority" || value === "unknown";

interface UnknownPullRequestContext {
  source?: string;
  repo?: string | null;
  prNumber?: number | null;
  title?: string;
  author?: string | null;
  description?: string;
  diff?: string;
  filesChanged?: readonly { path?: string; additions?: number; deletions?: number }[];
  additions?: number;
  deletions?: number;
  headSha?: string | null;
  baseSha?: string | null;
  upstreamLicense?: string | null;
}

interface UnknownRecord {
  id?: string;
  schemaVersion?: number;
  recordedAt?: string;
  context?: UnknownPullRequestContext;
  decision?: string;
  reasoning?: string;
  labels?: readonly string[];
  comments?: readonly Partial<ReviewComment>[];
  provenance?: Partial<Provenance>;
}

const normalizeContext = (raw: UnknownPullRequestContext | undefined): PullRequestContext => ({
  source: raw?.source === "file" || raw?.source === "github" ? raw.source : "stdin",
  repo: raw?.repo ?? null,
  prNumber: raw?.prNumber ?? null,
  title: raw?.title ?? "",
  author: raw?.author ?? null,
  description: raw?.description ?? "",
  diff: raw?.diff ?? "",
  filesChanged: (raw?.filesChanged ?? []).map((file) => ({
    path: file.path ?? "?",
    additions: file.additions ?? 0,
    deletions: file.deletions ?? 0,
  })),
  additions: raw?.additions ?? 0,
  deletions: raw?.deletions ?? 0,
  headSha: raw?.headSha ?? null,
  baseSha: raw?.baseSha ?? null,
  upstreamLicense: raw?.upstreamLicense ?? null,
});

const normalizeComment = (raw: Partial<ReviewComment>): ReviewComment => ({
  filePath: raw.filePath ?? "?",
  lineStart: raw.lineStart ?? 0,
  lineEnd: raw.lineEnd ?? null,
  severity: raw.severity && isCommentSeverity(raw.severity) ? raw.severity : "discuss",
  body: raw.body ?? "",
});

const normalizeProvenance = (raw: Partial<Provenance> | undefined): Provenance => ({
  aiAssisted: raw?.aiAssisted && isAiAssistLevel(raw.aiAssisted) ? raw.aiAssisted : "unknown",
  coDevelopedBy: raw?.coDevelopedBy ?? [],
  dcoVerified: raw?.dcoVerified ?? false,
});

export const normalizeRecord = (raw: UnknownRecord): VerdictRecord => {
  const decision: VerdictDecision =
    raw.decision && isVerdictDecision(raw.decision) ? raw.decision : "close";
  return {
    id: raw.id ?? "",
    schemaVersion: SCHEMA_VERSION,
    recordedAt: raw.recordedAt ?? "",
    context: normalizeContext(raw.context),
    decision,
    reasoning: raw.reasoning ?? "",
    labels: raw.labels ?? [],
    comments: (raw.comments ?? []).map(normalizeComment),
    provenance: normalizeProvenance(raw.provenance),
  };
};

export const wasMigrated = (raw: UnknownRecord): boolean =>
  raw.schemaVersion === undefined || raw.schemaVersion < SCHEMA_VERSION;
