import type { VerdictRecord } from "./record.js";

export type ExportFormat = "jsonl" | "hf" | "openai";

export interface HfDatasetRow {
  id: string;
  recorded_at: string;
  repo: string | null;
  pr_number: number | null;
  title: string;
  description: string;
  diff: string;
  files_changed: readonly string[];
  additions: number;
  deletions: number;
  decision: string;
  reasoning: string;
  labels: readonly string[];
}

export interface OpenAiChatRow {
  messages: readonly { role: "system" | "user" | "assistant"; content: string }[];
}

const toHfRow = (record: VerdictRecord): HfDatasetRow => ({
  id: record.id,
  recorded_at: record.recordedAt,
  repo: record.context.repo,
  pr_number: record.context.prNumber,
  title: record.context.title,
  description: record.context.description,
  diff: record.context.diff,
  files_changed: record.context.filesChanged.map((file) => file.path),
  additions: record.context.additions,
  deletions: record.context.deletions,
  decision: record.decision,
  reasoning: record.reasoning,
  labels: record.labels,
});

const systemPrompt =
  "You are an experienced open-source maintainer triaging an incoming pull request. Return your decision (merge, request-changes, close) and concise reasoning.";

const toUserPrompt = (record: VerdictRecord): string => {
  const lines: string[] = [];
  if (record.context.repo) lines.push(`Repository: ${record.context.repo}`);
  if (record.context.prNumber !== null) lines.push(`PR #${record.context.prNumber}`);
  lines.push(`Title: ${record.context.title}`);
  if (record.context.author) lines.push(`Author: ${record.context.author}`);
  if (record.context.description.trim().length > 0) {
    lines.push("");
    lines.push("Description:");
    lines.push(record.context.description.trim());
  }
  lines.push("");
  lines.push("Diff:");
  lines.push(record.context.diff);
  return lines.join("\n");
};

const toAssistantResponse = (record: VerdictRecord): string => {
  const parts: string[] = [`Decision: ${record.decision}`];
  if (record.labels.length > 0) parts.push(`Labels: ${record.labels.join(", ")}`);
  parts.push("");
  parts.push(record.reasoning.trim());
  return parts.join("\n");
};

const toOpenAiRow = (record: VerdictRecord): OpenAiChatRow => ({
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: toUserPrompt(record) },
    { role: "assistant", content: toAssistantResponse(record) },
  ],
});

export const exportRecords = (records: readonly VerdictRecord[], format: ExportFormat): string => {
  if (format === "jsonl")
    return (
      records.map((record) => JSON.stringify(record)).join("\n") + (records.length > 0 ? "\n" : "")
    );
  if (format === "hf")
    return (
      records.map((record) => JSON.stringify(toHfRow(record))).join("\n") +
      (records.length > 0 ? "\n" : "")
    );
  return (
    records.map((record) => JSON.stringify(toOpenAiRow(record))).join("\n") +
    (records.length > 0 ? "\n" : "")
  );
};
