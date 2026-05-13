import type { Puzzle, TestCase } from "./puzzles.js";
import type { JudgeResult } from "./judge.js";
import type { TestOutcome } from "./worker.js";
import type { PuzzleRecord } from "./store.js";
import { bold } from "./utils/bold.js";
import { dim } from "./utils/dim.js";
import { green } from "./utils/green.js";
import { red } from "./utils/red.js";

export interface RenderOptions {
  color: boolean;
}

const formatValue = (value: unknown): string => JSON.stringify(value);

const formatCase = (testCase: TestCase): string =>
  `f(${testCase.input.map(formatValue).join(", ")}) → ${formatValue(testCase.output)}`;

export const renderPuzzle = (
  puzzle: Puzzle,
  isoDate: string,
  record: PuzzleRecord | undefined,
  options: RenderOptions,
): string => {
  const title = `${puzzle.title}  ·  ${isoDate}`;
  const lines: string[] = [
    options.color ? bold(title) : title,
    "",
    puzzle.prompt,
    "",
    options.color ? dim(`signature: ${puzzle.signature}`) : `signature: ${puzzle.signature}`,
    "",
    options.color ? dim("examples:") : "examples:",
    ...puzzle.examples.map((example) => `  ${formatCase(example)}`),
  ];
  if (record?.bestBytes !== undefined && record.bestBytes !== null) {
    lines.push(
      "",
      options.color
        ? bold(`your best: ${record.bestBytes} bytes`)
        : `your best: ${record.bestBytes} bytes`,
    );
  }
  lines.push(
    "",
    options.color ? dim("submit:  golf submit <file.js>") : "submit:  golf submit <file.js>",
  );
  return lines.join("\n");
};

const formatOutcome = (outcome: TestOutcome, index: number, color: boolean): string => {
  if (outcome.ok) {
    const label = `✓ test ${index + 1}`;
    return color ? green(label) : label;
  }
  const head = color ? red(`✗ test ${index + 1}`) : `✗ test ${index + 1}`;
  if (outcome.error) return `${head}  threw: ${outcome.error}`;
  return `${head}  expected ${formatValue(outcome.expected)} got ${formatValue(outcome.actual)}`;
};

export const renderJudgement = (result: JudgeResult, options: RenderOptions): string => {
  if (!result.loaded) {
    const head = options.color ? red("load failed") : "load failed";
    return `${head}: ${result.loadError ?? "unknown error"}`;
  }
  if (result.timedOut) {
    return options.color
      ? red("timed out — your code took too long.")
      : "timed out — your code took too long.";
  }
  const passed = result.outcomes.filter((outcome) => outcome.ok).length;
  const total = result.outcomes.length;
  const summary = `${passed}/${total} tests passed  ·  ${result.bytes} bytes`;
  const header =
    passed === total
      ? options.color
        ? green(bold(summary))
        : summary
      : options.color
        ? red(summary)
        : summary;
  const detail = result.outcomes
    .map((outcome, index) => formatOutcome(outcome, index, options.color))
    .join("\n");
  return `${header}\n\n${detail}`;
};

export const renderHistory = (records: readonly PuzzleRecord[], options: RenderOptions): string => {
  if (records.length === 0) return options.color ? dim("no attempts yet.") : "no attempts yet.";
  const rows = records.map((record) => {
    const status = record.solved
      ? options.color
        ? green("solved")
        : "solved"
      : options.color
        ? dim("unsolved")
        : "unsolved";
    const best = record.bestBytes === null ? "—" : `${record.bestBytes}b`;
    return `  ${record.puzzleId.padEnd(16)} ${status.padEnd(8)} best ${best.padStart(5)}  attempts ${record.attempts}`;
  });
  return rows.join("\n");
};
