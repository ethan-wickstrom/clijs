#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { stdin, stdout } from "node:process";
import { summarizeDiff } from "./parse-diff.js";
import { defaultProvenance, isAiAssistLevel, isVerdictDecision, newRecord } from "./record.js";
import type {
  AiAssistLevel,
  PullRequestContext,
  Provenance,
  ReviewComment,
  VerdictDecision,
} from "./record.js";
import { appendRecord, ensureStore, findRecord, readAll } from "./store.js";
import { exportRecords } from "./export.js";
import type { ExportFormat } from "./export.js";
import { createLineReader } from "./utils/line-reader.js";
import type { LineReader } from "./utils/line-reader.js";
import { bold } from "./utils/bold.js";
import { dim } from "./utils/dim.js";
import { green } from "./utils/green.js";
import { red } from "./utils/red.js";
import { yellow } from "./utils/yellow.js";
import { supportsColor } from "./utils/supports-color.js";
import { shortId } from "./utils/short-id.js";
import { parseCommentArg } from "./utils/parse-comment-arg.js";

interface RecordOptions {
  diffPath: string | null;
  repo: string | null;
  prNumber: number | null;
  title: string | null;
  author: string | null;
  description: string;
  labels: readonly string[];
  decision: VerdictDecision | null;
  reasoning: string | null;
  storeRoot: string | null;
  headSha: string | null;
  baseSha: string | null;
  upstreamLicense: string | null;
  aiAssisted: AiAssistLevel | null;
  coDevelopedBy: readonly string[];
  dcoVerified: boolean;
  comments: readonly ReviewComment[];
}

interface ExportOptions {
  format: ExportFormat;
  out: string | null;
  storeRoot: string | null;
}

const printHelp = (): void => {
  stdout.write(
    [
      "verdict — solo open-source maintainer PR triage with training-data capture",
      "",
      "Usage:",
      "  verdict init                          create the local store (~/.verdict)",
      "  verdict record [options]              capture one PR triage decision",
      "  verdict list                          list captured verdicts",
      "  verdict show <id>                     show a single verdict",
      "  verdict export [--format <fmt>]       export the dataset for fine-tuning",
      "  verdict --help                        show this message",
      "",
      "`record` reads a unified diff from stdin (default) or from --diff <path>.",
      "",
      "`record` options:",
      "  --diff <path>                read the diff from a file instead of stdin",
      "  --repo <owner/name>          repository identifier",
      "  --pr <number>                pull-request number",
      "  --title <text>               PR title",
      "  --author <handle>            PR author handle",
      "  --description <text>         PR description (single line)",
      "  --label <name>               add a label (repeatable)",
      "  --decision <choice>          one of: merge | request-changes | close",
      "  --reasoning <text>           skip the editor; use this text",
      "  --head <sha>                 head commit SHA",
      "  --base <sha>                 base commit SHA",
      "  --license <spdx>             upstream repository licence (SPDX id, e.g. Apache-2.0)",
      "  --ai-assist <level>          none | partial | majority | unknown (default: unknown)",
      "  --co-dev-by <handle>         add a Co-developed-by attribution (repeatable)",
      "  --dco-verified               assert the contributor's DCO sign-off was verified",
      "  --comment <path:lines:sev:body>",
      "                                add a per-comment review (repeatable).",
      "                                lines is `12` or `12-15`; sev in {nit,discuss,",
      "                                requested-change,block}; body is the analysis.",
      "  --store <path>               override the store root (default: $HOME)",
      "",
      "`export` options:",
      "  --format <fmt>         one of: jsonl (default) | hf | openai",
      "  --out <path>           write to file instead of stdout",
      "  --store <path>         override the store root (default: $HOME)",
      "",
    ].join("\n"),
  );
};

const readDiff = (path: string | null): string => {
  if (path) return readFileSync(path, "utf8");
  return readFileSync(0, "utf8");
};

const parseFlagValue = (
  argv: readonly string[],
  index: number,
): { value: string | null; nextIndex: number } => {
  const next = argv[index + 1];
  if (next === undefined || next.startsWith("--")) return { value: null, nextIndex: index };
  return { value: next, nextIndex: index + 1 };
};

const parseRecordArgs = (argv: readonly string[]): RecordOptions => {
  const options: RecordOptions = {
    diffPath: null,
    repo: null,
    prNumber: null,
    title: null,
    author: null,
    description: "",
    labels: [],
    decision: null,
    reasoning: null,
    storeRoot: null,
    headSha: null,
    baseSha: null,
    upstreamLicense: null,
    aiAssisted: null,
    coDevelopedBy: [],
    dcoVerified: false,
    comments: [],
  };
  const labels: string[] = [];
  const coDev: string[] = [];
  const comments: ReviewComment[] = [];
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index]!;
    if (token === "--diff") {
      const parsed = parseFlagValue(argv, index);
      options.diffPath = parsed.value;
      index = parsed.nextIndex;
    } else if (token === "--repo") {
      const parsed = parseFlagValue(argv, index);
      options.repo = parsed.value;
      index = parsed.nextIndex;
    } else if (token === "--pr") {
      const parsed = parseFlagValue(argv, index);
      const numberValue = parsed.value ? Number(parsed.value) : Number.NaN;
      options.prNumber = Number.isFinite(numberValue) ? numberValue : null;
      index = parsed.nextIndex;
    } else if (token === "--title") {
      const parsed = parseFlagValue(argv, index);
      options.title = parsed.value;
      index = parsed.nextIndex;
    } else if (token === "--author") {
      const parsed = parseFlagValue(argv, index);
      options.author = parsed.value;
      index = parsed.nextIndex;
    } else if (token === "--description") {
      const parsed = parseFlagValue(argv, index);
      options.description = parsed.value ?? "";
      index = parsed.nextIndex;
    } else if (token === "--label") {
      const parsed = parseFlagValue(argv, index);
      if (parsed.value) labels.push(parsed.value);
      index = parsed.nextIndex;
    } else if (token === "--decision") {
      const parsed = parseFlagValue(argv, index);
      if (parsed.value && isVerdictDecision(parsed.value)) options.decision = parsed.value;
      index = parsed.nextIndex;
    } else if (token === "--reasoning") {
      const parsed = parseFlagValue(argv, index);
      options.reasoning = parsed.value;
      index = parsed.nextIndex;
    } else if (token === "--head") {
      const parsed = parseFlagValue(argv, index);
      options.headSha = parsed.value;
      index = parsed.nextIndex;
    } else if (token === "--base") {
      const parsed = parseFlagValue(argv, index);
      options.baseSha = parsed.value;
      index = parsed.nextIndex;
    } else if (token === "--license") {
      const parsed = parseFlagValue(argv, index);
      options.upstreamLicense = parsed.value;
      index = parsed.nextIndex;
    } else if (token === "--ai-assist") {
      const parsed = parseFlagValue(argv, index);
      if (parsed.value && isAiAssistLevel(parsed.value)) options.aiAssisted = parsed.value;
      index = parsed.nextIndex;
    } else if (token === "--co-dev-by") {
      const parsed = parseFlagValue(argv, index);
      if (parsed.value) coDev.push(parsed.value);
      index = parsed.nextIndex;
    } else if (token === "--dco-verified") {
      options.dcoVerified = true;
    } else if (token === "--comment") {
      const parsed = parseFlagValue(argv, index);
      if (parsed.value) {
        const comment = parseCommentArg(parsed.value);
        if (comment) comments.push(comment);
      }
      index = parsed.nextIndex;
    } else if (token === "--store") {
      const parsed = parseFlagValue(argv, index);
      options.storeRoot = parsed.value;
      index = parsed.nextIndex;
    }
  }
  options.labels = labels;
  options.coDevelopedBy = coDev;
  options.comments = comments;
  return options;
};

const parseExportArgs = (argv: readonly string[]): ExportOptions => {
  const options: ExportOptions = { format: "jsonl", out: null, storeRoot: null };
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index]!;
    if (token === "--format") {
      const parsed = parseFlagValue(argv, index);
      if (parsed.value === "jsonl" || parsed.value === "hf" || parsed.value === "openai") {
        options.format = parsed.value;
      }
      index = parsed.nextIndex;
    } else if (token === "--out") {
      const parsed = parseFlagValue(argv, index);
      options.out = parsed.value;
      index = parsed.nextIndex;
    } else if (token === "--store") {
      const parsed = parseFlagValue(argv, index);
      options.storeRoot = parsed.value;
      index = parsed.nextIndex;
    }
  }
  return options;
};

const promptLine = async (reader: LineReader, label: string, color: boolean): Promise<string> => {
  stdout.write(color ? bold(`${label}: `) : `${label}: `);
  const line = await reader.next();
  return line === null ? "" : line.trim();
};

const promptDecision = async (reader: LineReader, color: boolean): Promise<VerdictDecision> => {
  while (true) {
    stdout.write(
      color
        ? bold("decision [m=merge / r=request-changes / c=close]: ")
        : "decision [m=merge / r=request-changes / c=close]: ",
    );
    const line = await reader.next();
    const normalized = (line ?? "").trim().toLowerCase();
    if (normalized === "m" || normalized === "merge") return "merge";
    if (normalized === "r" || normalized === "request-changes") return "request-changes";
    if (normalized === "c" || normalized === "close") return "close";
    stdout.write(color ? `${red("invalid choice")}\n` : "invalid choice\n");
  }
};

const colorForDecision = (decision: VerdictDecision, color: boolean): string => {
  if (!color) return decision;
  if (decision === "merge") return green(decision);
  if (decision === "close") return red(decision);
  return yellow(decision);
};

const buildProvenance = (options: RecordOptions): Provenance => {
  const baseline = defaultProvenance();
  return {
    aiAssisted: options.aiAssisted ?? baseline.aiAssisted,
    coDevelopedBy: options.coDevelopedBy,
    dcoVerified: options.dcoVerified,
  };
};

const cmdInit = (color: boolean, storeRoot: string | null): number => {
  const dir = ensureStore(storeRoot ?? undefined);
  stdout.write(`${color ? bold("initialised:") : "initialised:"} ${dir}\n`);
  return 0;
};

const cmdRecord = async (options: RecordOptions, color: boolean): Promise<number> => {
  if (!options.diffPath && stdin.isTTY) {
    stdout.write(
      "verdict record: a diff is required. pipe one in (`git diff main... | verdict record`) or pass --diff <path>.\n",
    );
    return 2;
  }
  const diff = readDiff(options.diffPath);
  if (!diff.trim()) {
    stdout.write("verdict record: empty diff.\n");
    return 2;
  }
  const summary = summarizeDiff(diff);
  const reader = createLineReader(stdin);
  let title = options.title ?? "";
  let description = options.description ?? "";
  let decision = options.decision;
  let reasoning = options.reasoning ?? null;
  try {
    if (!title) title = await promptLine(reader, "title", color);
    if (!description) description = await promptLine(reader, "description (one line)", color);
    if (!decision) decision = await promptDecision(reader, color);
    if (reasoning === null) {
      stdout.write(
        color
          ? dim("reasoning (multi-line; end with a single '.' on its own line):\n")
          : "reasoning (multi-line; end with a single '.' on its own line):\n",
      );
      reasoning = await reader.readMultiline(".");
    }
  } finally {
    reader.close();
  }
  const context: PullRequestContext = {
    source: options.diffPath ? "file" : "stdin",
    repo: options.repo,
    prNumber: options.prNumber,
    title,
    author: options.author,
    description,
    diff,
    filesChanged: summary.filesChanged,
    additions: summary.totalAdditions,
    deletions: summary.totalDeletions,
    headSha: options.headSha,
    baseSha: options.baseSha,
    upstreamLicense: options.upstreamLicense,
  };
  const record = newRecord({
    id: shortId(),
    recordedAt: new Date().toISOString(),
    context,
    decision,
    reasoning: reasoning ?? "",
    labels: options.labels,
    comments: options.comments,
    provenance: buildProvenance(options),
  });
  appendRecord(record, options.storeRoot ?? undefined);
  stdout.write(
    `${color ? bold("recorded") : "recorded"} ${record.id} · ${colorForDecision(decision, color)} · ${summary.filesChanged.length} file${summary.filesChanged.length === 1 ? "" : "s"} · +${summary.totalAdditions}/-${summary.totalDeletions} · ${record.comments.length} comment${record.comments.length === 1 ? "" : "s"}\n`,
  );
  return 0;
};

const cmdList = (color: boolean, storeRoot: string | null): number => {
  const result = readAll(storeRoot ?? undefined);
  if (result.records.length === 0) {
    stdout.write(color ? dim("no verdicts recorded yet.\n") : "no verdicts recorded yet.\n");
    return 0;
  }
  for (const record of result.records) {
    const stamp = record.recordedAt.slice(0, 16).replace("T", " ");
    const decision = colorForDecision(record.decision, color);
    const repo = record.context.repo ?? "—";
    const pr = record.context.prNumber === null ? "—" : `#${record.context.prNumber}`;
    stdout.write(
      `  ${record.id}  ${stamp}  ${decision.padEnd(color ? 28 : 17)}  ${repo} ${pr}  ${record.context.title}\n`,
    );
  }
  if (result.migratedFromV1 > 0) {
    const message = `(${result.migratedFromV1} record${result.migratedFromV1 === 1 ? "" : "s"} normalised from a pre-v2 schema)`;
    stdout.write(`${color ? dim(message) : message}\n`);
  }
  if (result.corruptedLines > 0) {
    const message = `(${result.corruptedLines} corrupted line${result.corruptedLines === 1 ? "" : "s"} skipped)`;
    stdout.write(`${color ? red(message) : message}\n`);
  }
  return 0;
};

const cmdShow = (id: string | undefined, color: boolean, storeRoot: string | null): number => {
  if (!id) {
    stdout.write("usage: verdict show <id>\n");
    return 2;
  }
  const record = findRecord(id, storeRoot ?? undefined);
  if (!record) {
    stdout.write(`no verdict with id ${id}.\n`);
    return 1;
  }
  stdout.write(`${color ? bold(record.id) : record.id}\n`);
  stdout.write(`recorded:    ${record.recordedAt}\n`);
  stdout.write(`repo:        ${record.context.repo ?? "—"}\n`);
  if (record.context.prNumber !== null) stdout.write(`pr:          #${record.context.prNumber}\n`);
  stdout.write(`title:       ${record.context.title}\n`);
  if (record.context.author) stdout.write(`author:      ${record.context.author}\n`);
  stdout.write(`decision:    ${colorForDecision(record.decision, color)}\n`);
  if (record.context.headSha) stdout.write(`head:        ${record.context.headSha}\n`);
  if (record.context.baseSha) stdout.write(`base:        ${record.context.baseSha}\n`);
  if (record.context.upstreamLicense)
    stdout.write(`licence:     ${record.context.upstreamLicense}\n`);
  if (record.labels.length > 0) stdout.write(`labels:      ${record.labels.join(", ")}\n`);
  stdout.write(
    `changes:     ${record.context.filesChanged.length} file${record.context.filesChanged.length === 1 ? "" : "s"} · +${record.context.additions}/-${record.context.deletions}\n`,
  );
  stdout.write(
    `provenance:  ai-assist=${record.provenance.aiAssisted} dco-verified=${record.provenance.dcoVerified ? "yes" : "no"}\n`,
  );
  if (record.provenance.coDevelopedBy.length > 0) {
    stdout.write(`co-dev-by:   ${record.provenance.coDevelopedBy.join(", ")}\n`);
  }
  if (record.comments.length > 0) {
    stdout.write(`\n${color ? bold("comments") : "comments"}\n`);
    for (const comment of record.comments) {
      const lines =
        comment.lineEnd === null
          ? `${comment.lineStart}`
          : `${comment.lineStart}-${comment.lineEnd}`;
      stdout.write(`  [${comment.severity}] ${comment.filePath}:${lines}\n      ${comment.body}\n`);
    }
  }
  stdout.write(`\n${color ? bold("reasoning") : "reasoning"}\n${record.reasoning}\n`);
  return 0;
};

const cmdExport = (options: ExportOptions, color: boolean): number => {
  const records = readAll(options.storeRoot ?? undefined).records;
  const output = exportRecords(records, options.format);
  if (options.out) {
    writeFileSync(options.out, output);
    stdout.write(
      `${color ? dim(`wrote ${records.length} record${records.length === 1 ? "" : "s"} → ${options.out}`) : `wrote ${records.length} records → ${options.out}`}\n`,
    );
  } else {
    stdout.write(output);
  }
  return 0;
};

const main = async (): Promise<number> => {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h") || argv[0] === "help") {
    printHelp();
    return 0;
  }
  const color = supportsColor(stdout);
  const [command, ...rest] = argv;
  if (command === "init") {
    const storeRoot = rest.includes("--store") ? (rest[rest.indexOf("--store") + 1] ?? null) : null;
    return cmdInit(color, storeRoot);
  }
  if (command === "record") return cmdRecord(parseRecordArgs(rest), color);
  if (command === "list") {
    const storeRoot = rest.includes("--store") ? (rest[rest.indexOf("--store") + 1] ?? null) : null;
    return cmdList(color, storeRoot);
  }
  if (command === "show") {
    const storeRoot = rest.includes("--store") ? (rest[rest.indexOf("--store") + 1] ?? null) : null;
    const filtered = rest.filter(
      (token, index) => token !== "--store" && rest[index - 1] !== "--store",
    );
    return cmdShow(filtered[0], color, storeRoot);
  }
  if (command === "export") return cmdExport(parseExportArgs(rest), color);
  stdout.write(`unknown command: ${command ?? "(none)"}\n\n`);
  printHelp();
  return 2;
};

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`verdict: ${message}\n`);
    process.exit(1);
  },
);
