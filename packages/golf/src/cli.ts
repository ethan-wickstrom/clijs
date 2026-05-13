#!/usr/bin/env node

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { stdout } from "node:process";
import { dailySeed } from "./seed.js";
import { allPassed, judge } from "./judge.js";
import { findPuzzle, PUZZLES } from "./puzzles.js";
import { loadStore, recordSubmission, saveStore } from "./store.js";
import { renderHistory, renderJudgement, renderPuzzle } from "./render.js";
import { supportsColor } from "./utils/supports-color.js";
import { bold } from "./utils/bold.js";
import { dim } from "./utils/dim.js";

const printHelp = (): void => {
  stdout.write(
    [
      "golf — a daily code-golf puzzle for your terminal",
      "",
      "Usage:",
      "  golf                    show today's puzzle",
      "  golf submit <file>      run your solution and score it",
      "  golf practice <id>      show a past puzzle by id (no scoring)",
      "  golf list               list all puzzles",
      "  golf history            show your records",
      "  golf --help             show this message",
      "",
      "Your solution must default-export a function matching the puzzle's signature.",
      "",
    ].join("\n"),
  );
};

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const cmdToday = async (color: boolean): Promise<number> => {
  const seed = dailySeed();
  const store = loadStore();
  stdout.write(
    `${renderPuzzle(seed.puzzle, seed.isoDate, store.records[seed.puzzle.id], { color })}\n`,
  );
  return 0;
};

const cmdPractice = async (puzzleId: string | undefined, color: boolean): Promise<number> => {
  if (!puzzleId) {
    stdout.write("usage: golf practice <id>\n");
    return 2;
  }
  const puzzle = findPuzzle(puzzleId);
  if (!puzzle) {
    stdout.write(`no puzzle with id "${puzzleId}". run \`golf list\` to see them all.\n`);
    return 1;
  }
  const store = loadStore();
  stdout.write(`${renderPuzzle(puzzle, "practice", store.records[puzzle.id], { color })}\n`);
  return 0;
};

const cmdList = (color: boolean): number => {
  const header = color ? bold("puzzles") : "puzzles";
  stdout.write(`${header}\n`);
  for (const puzzle of PUZZLES) {
    stdout.write(`  ${puzzle.id.padEnd(16)} ${puzzle.title}\n`);
  }
  return 0;
};

const cmdHistory = (color: boolean): number => {
  const store = loadStore();
  const records = PUZZLES.map((puzzle) => store.records[puzzle.id]).filter(
    (record): record is NonNullable<typeof record> => record !== undefined,
  );
  stdout.write(`${renderHistory(records, { color })}\n`);
  return 0;
};

interface SubmitArgs {
  file: string;
  puzzleId: string | undefined;
}

const parseSubmitArgs = (args: readonly string[]): SubmitArgs | null => {
  let file: string | undefined;
  let puzzleId: string | undefined;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (arg === "--puzzle" || arg === "-p") {
      puzzleId = args[++index];
    } else if (!file) {
      file = arg;
    }
  }
  if (!file) return null;
  return { file, puzzleId };
};

const cmdSubmit = async (rawArgs: readonly string[], color: boolean): Promise<number> => {
  const args = parseSubmitArgs(rawArgs);
  if (!args) {
    stdout.write("usage: golf submit <file> [--puzzle <id>]\n");
    return 2;
  }
  const absolutePath = resolve(args.file);
  if (!existsSync(absolutePath)) {
    stdout.write(`file not found: ${absolutePath}\n`);
    return 1;
  }
  const puzzle = args.puzzleId ? findPuzzle(args.puzzleId) : dailySeed().puzzle;
  if (!puzzle) {
    stdout.write(`no puzzle with id "${args.puzzleId ?? ""}".\n`);
    return 1;
  }
  const result = await judge(absolutePath, puzzle.tests);
  stdout.write(`${renderJudgement(result, { color })}\n`);
  const solved = allPassed(result);
  const store = loadStore();
  const next = recordSubmission(store, {
    puzzleId: puzzle.id,
    bytes: result.bytes,
    solved,
    isoDate: todayIso(),
  });
  saveStore(next);
  const updatedRecord = next.records[puzzle.id]!;
  if (solved && updatedRecord.bestBytes !== null && result.bytes === updatedRecord.bestBytes) {
    const message =
      updatedRecord.attempts === 1 ? "first solve." : `new best: ${result.bytes} bytes.`;
    stdout.write(`\n${color ? bold(message) : message}\n`);
  } else if (solved && updatedRecord.bestBytes !== null) {
    stdout.write(
      `\n${color ? dim(`solved but not a record — your best is ${updatedRecord.bestBytes} bytes.`) : `solved but not a record — your best is ${updatedRecord.bestBytes} bytes.`}\n`,
    );
  }
  return solved ? 0 : 1;
};

const main = async (): Promise<number> => {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return 0;
  }
  const color = supportsColor(stdout);
  const [command, ...rest] = argv;
  switch (command) {
    case undefined:
      return cmdToday(color);
    case "submit":
      return cmdSubmit(rest, color);
    case "practice":
      return cmdPractice(rest[0], color);
    case "list":
      return cmdList(color);
    case "history":
      return cmdHistory(color);
    default:
      stdout.write(`unknown command: ${command}\n`);
      printHelp();
      return 2;
  }
};

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`golf: ${message}\n`);
    process.exit(1);
  },
);
