#!/usr/bin/env node

import { stdin, stdout } from "node:process";
import { MAX_GUESSES, SOLVE_THRESHOLD } from "./constants.js";
import {
  completeSession,
  dailyPick,
  findCompleted,
  hasCompleted,
  recordGuess,
  startSession,
} from "./play.js";
import type { Guess, Puzzle, PuzzleSession } from "./play.js";

import { describe } from "./scorer.js";
import { runClaude, RunnerError } from "./runner.js";
import { loadPlayState, savePlayState } from "./store.js";
import { PUZZLES, findPuzzle } from "./puzzles.js";
import { createLineReader } from "./utils/line-reader.js";
import type { LineReader } from "./utils/line-reader.js";
import { bold } from "./utils/bold.js";
import { dim } from "./utils/dim.js";
import { green } from "./utils/green.js";
import { red } from "./utils/red.js";
import { yellow } from "./utils/yellow.js";
import { cyan } from "./utils/cyan.js";
import { supportsColor } from "./utils/supports-color.js";

interface ParsedArgs {
  command: "play" | "practice" | "stats" | "list" | "help";
  puzzleId: string | null;
  storeRoot: string | null;
  command_arg: string | null;
}

const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const args: ParsedArgs = {
    command: "help",
    puzzleId: null,
    storeRoot: null,
    command_arg: null,
  };
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) return args;
  const [first, ...rest] = argv;
  if (first === "play") args.command = "play";
  else if (first === "practice") {
    args.command = "practice";
    args.command_arg = rest[0] ?? null;
  } else if (first === "stats") args.command = "stats";
  else if (first === "list") args.command = "list";
  for (let index = 0; index < rest.length; index++) {
    const token = rest[index]!;
    if (token === "--store") args.storeRoot = rest[++index] ?? null;
    else if (token === "--puzzle") args.puzzleId = rest[++index] ?? null;
  }
  return args;
};

const printHelp = (color: boolean): void => {
  stdout.write(
    [
      color
        ? bold("inversion — guess the prompt from the LLM output")
        : "inversion — guess the prompt from the LLM output",
      "",
      "Usage:",
      "  inversion play              play today's puzzle",
      "  inversion practice <id>     play a past puzzle (does not affect streak)",
      "  inversion stats             show your streak and history",
      "  inversion list              list all bundled puzzles",
      "  inversion --help            show this message",
      "",
      "Requirements:",
      "  - `claude` CLI installed; your guess is run against the same model the",
      "    puzzle was originally produced with. You pay Anthropic for your guess",
      "    tokens (~$0.005 per round).",
      "",
      "How scoring works:",
      `  Each guess: your prompt is run live against claude. The output is`,
      `  compared to the original output via Jaccard token similarity. Hit`,
      `  ≥ ${SOLVE_THRESHOLD} to solve. You get ${MAX_GUESSES} guesses.`,
      "",
    ].join("\n"),
  );
};

const renderHeader = (puzzle: Puzzle, color: boolean): string => {
  const title = `inversion · ${puzzle.id} · ${puzzle.isoDate}`;
  return color ? bold(title) : title;
};

const renderOutput = (puzzle: Puzzle, color: boolean): string => {
  const label = color
    ? dim("output (guess the prompt that produced this):")
    : "output (guess the prompt that produced this):";
  const box = puzzle.output
    .split("\n")
    .map((line) => `  │ ${line}`)
    .join("\n");
  return `${label}\n${color ? cyan(box) : box}`;
};

const renderBucket = (bucket: "convergent" | "warm" | "tepid" | "cold", color: boolean): string => {
  if (!color) return bucket;
  if (bucket === "convergent") return green(bucket);
  if (bucket === "warm") return yellow(bucket);
  if (bucket === "tepid") return yellow(bucket);
  return red(bucket);
};

const handleAlreadyCompleted = (
  puzzle: Puzzle,
  storeRoot: string | null,
  color: boolean,
): number => {
  const state = loadPlayState(storeRoot ?? undefined);
  const completed = findCompleted(state, puzzle.id);
  if (!completed) return -1;
  const status = completed.solved ? "solved" : "missed";
  const colored = completed.solved
    ? color
      ? green(status)
      : status
    : color
      ? red(status)
      : status;
  stdout.write(
    `${color ? bold(`already played ${puzzle.id}: ${colored}`) : `already played ${puzzle.id}: ${colored}`} in ${completed.guessCount}/${MAX_GUESSES}\n`,
  );
  stdout.write(
    `${color ? dim("the original prompt was:") : "the original prompt was:"} ${puzzle.prompt}\n`,
  );
  return 0;
};

const playSession = async (
  puzzle: Puzzle,
  recordResult: boolean,
  storeRoot: string | null,
  color: boolean,
): Promise<number> => {
  stdout.write(`${renderHeader(puzzle, color)}\n\n`);
  stdout.write(`${renderOutput(puzzle, color)}\n\n`);
  stdout.write(
    `${color ? dim(`model: ${puzzle.model} · ${MAX_GUESSES} guesses · solve threshold ${SOLVE_THRESHOLD}`) : `model: ${puzzle.model} · ${MAX_GUESSES} guesses · solve threshold ${SOLVE_THRESHOLD}`}\n\n`,
  );
  const reader = createLineReader(stdin);
  let session = startSession(puzzle);
  try {
    while (session.status === "in-progress") {
      stdout.write(
        `${color ? dim(`guess ${session.guesses.length + 1}/${MAX_GUESSES} — your prompt (single line, blank line submits):`) : `guess ${session.guesses.length + 1}/${MAX_GUESSES} — your prompt (single line, blank line submits):`}\n`,
      );
      const guessText = await readPrompt(reader);
      if (guessText === null) {
        stdout.write(color ? dim("\n(input ended; exiting)\n") : "\n(input ended; exiting)\n");
        break;
      }
      if (guessText.trim().length === 0) {
        stdout.write(color ? red("empty guess; try again\n") : "empty guess; try again\n");
        continue;
      }
      stdout.write(color ? dim("calling claude…\n") : "calling claude…\n");
      const result = await runGuessOrFail(guessText);
      if (result === null) return 1;
      const feedback = describe(result.output, puzzle.output);
      const guess: Guess = {
        guessText,
        resultingOutput: result.output,
        similarity: feedback.similarity,
      };
      session = recordGuess(session, guess);
      const pct = (feedback.similarity * 100).toFixed(0);
      const bucketLabel = renderBucket(feedback.bucket, color);
      stdout.write(
        `\n  ${color ? dim("their output:") : "their output:"}\n${result.output
          .split("\n")
          .map((line) => `    ${line}`)
          .join("\n")}\n\n`,
      );
      stdout.write(`  similarity: ${pct}%  ${bucketLabel}  (${feedback.lengthDelta})\n\n`);
    }
  } finally {
    reader.close();
  }
  return finishSession(puzzle, session, recordResult, storeRoot, color);
};

const readPrompt = async (reader: LineReader): Promise<string | null> => {
  const first = await reader.next();
  if (first === null) return null;
  return first;
};

const runGuessOrFail = async (prompt: string): Promise<{ output: string } | null> => {
  try {
    const { output } = await runClaude(prompt, {
      model: "sonnet",
    });
    return { output };
  } catch (error) {
    if (error instanceof RunnerError) {
      stdout.write(`${red(`claude failed: ${error.message}`)}\n`);
      if (error.stderr.trim().length > 0) stdout.write(`${dim(error.stderr.trim())}\n`);
      return null;
    }
    throw error;
  }
};

const finishSession = (
  puzzle: Puzzle,
  session: PuzzleSession,
  recordResult: boolean,
  storeRoot: string | null,
  color: boolean,
): number => {
  const solved = session.status === "solved";
  const headline = solved
    ? color
      ? green(`solved in ${session.guesses.length}/${MAX_GUESSES}`)
      : `solved in ${session.guesses.length}/${MAX_GUESSES}`
    : color
      ? red(`out of guesses (${session.guesses.length}/${MAX_GUESSES})`)
      : `out of guesses (${session.guesses.length}/${MAX_GUESSES})`;
  stdout.write(`${headline}\n`);
  stdout.write(
    `${color ? dim("the original prompt was:") : "the original prompt was:"} ${puzzle.prompt}\n`,
  );
  if (recordResult) {
    const state = loadPlayState(storeRoot ?? undefined);
    const next = completeSession(state, puzzle, session);
    savePlayState(next, storeRoot ?? undefined);
  }
  return solved ? 0 : 1;
};

const cmdPlay = async (storeRoot: string | null, color: boolean): Promise<number> => {
  if (PUZZLES.length === 0) {
    stdout.write("inversion: no puzzles bundled.\n");
    return 1;
  }
  const pick = dailyPick(PUZZLES);
  if (!pick) {
    stdout.write("inversion: no puzzle for today.\n");
    return 1;
  }
  const state = loadPlayState(storeRoot ?? undefined);
  if (hasCompleted(state, pick.puzzle.id)) {
    return handleAlreadyCompleted(pick.puzzle, storeRoot, color);
  }
  return playSession(pick.puzzle, true, storeRoot, color);
};

const cmdPractice = async (
  puzzleId: string | null,
  storeRoot: string | null,
  color: boolean,
): Promise<number> => {
  if (!puzzleId) {
    stdout.write("usage: inversion practice <puzzle-id>\n");
    return 2;
  }
  const puzzle = findPuzzle(puzzleId);
  if (!puzzle) {
    stdout.write(`inversion: no puzzle with id "${puzzleId}". try \`inversion list\`.\n`);
    return 1;
  }
  return playSession(puzzle, false, storeRoot, color);
};

const cmdStats = (storeRoot: string | null, color: boolean): number => {
  const state = loadPlayState(storeRoot ?? undefined);
  const played = state.completed.length;
  const solved = state.completed.filter((entry) => entry.solved).length;
  const rate = played === 0 ? 0 : Math.round((solved / played) * 100);
  const lines = [
    `played:   ${played}`,
    `solved:   ${solved} (${rate}%)`,
    `current:  ${state.currentStreak}`,
    `longest:  ${state.longestStreak}`,
  ];
  stdout.write(`${color ? lines.map((line) => dim(line)).join("\n") : lines.join("\n")}\n`);
  return 0;
};

const cmdList = (color: boolean): number => {
  const header = color ? bold("bundled puzzles") : "bundled puzzles";
  stdout.write(`${header}\n`);
  for (const puzzle of PUZZLES) {
    stdout.write(`  ${puzzle.id.padEnd(24)} ${puzzle.isoDate}  ${puzzle.model}\n`);
  }
  return 0;
};

const main = async (): Promise<number> => {
  const args = parseArgs(process.argv.slice(2));
  const color = supportsColor(stdout);
  if (args.command === "help") {
    printHelp(color);
    return 0;
  }
  if (args.command === "play") return cmdPlay(args.storeRoot, color);
  if (args.command === "practice") return cmdPractice(args.command_arg, args.storeRoot, color);
  if (args.command === "stats") return cmdStats(args.storeRoot, color);
  if (args.command === "list") return cmdList(color);
  printHelp(color);
  return 2;
};

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`inversion: ${message}\n`);
    process.exit(1);
  },
);
