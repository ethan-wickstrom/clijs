#!/usr/bin/env node

import { stdin, stdout } from "node:process";
import {
  DIFF_DISPLAY_CAP,
  MAX_GUESSES,
  REVEAL_COMMAND,
  SOLVE_THRESHOLD,
  STOP_WORDS,
} from "./constants.js";
import {
  completeSession,
  dailyPick,
  findCompleted,
  formatShareGrid,
  hasCompleted,
  recordGuess,
  startSession,
} from "./play.js";
import type { CompletedPuzzle, Guess, Puzzle, PuzzleSession } from "./play.js";
import { describe, diffOutputs } from "./scorer.js";
import { runClaude, RunnerError } from "./runner.js";
import { loadPlayState, savePlayState } from "./store.js";
import {
  TUTORIAL_PUZZLE,
  UserPuzzleCollisionError,
  findPuzzle,
  loadAllPuzzles,
  slugify,
  writeUserPuzzle,
} from "./puzzles.js";
import { createLineReader } from "./utils/line-reader.js";
import { bold } from "./utils/bold.js";
import { dim } from "./utils/dim.js";
import { green } from "./utils/green.js";
import { red } from "./utils/red.js";
import { yellow } from "./utils/yellow.js";
import { cyan } from "./utils/cyan.js";
import { supportsColor } from "./utils/supports-color.js";

type Command = "play" | "practice" | "stats" | "list" | "seed" | "tutorial" | "help";

interface ParsedArgs {
  command: Command;
  positional: string | null;
  storeRoot: string | null;
  seedPrompt: string | null;
  seedId: string | null;
  seedModel: string | null;
}

const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const args: ParsedArgs = {
    command: "help",
    positional: null,
    storeRoot: null,
    seedPrompt: null,
    seedId: null,
    seedModel: null,
  };
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) return args;
  const [first, ...rest] = argv;
  if (first === "play") args.command = "play";
  else if (first === "practice") {
    args.command = "practice";
    args.positional = rest[0] ?? null;
  } else if (first === "stats") args.command = "stats";
  else if (first === "list") args.command = "list";
  else if (first === "seed") args.command = "seed";
  else if (first === "tutorial") args.command = "tutorial";
  for (let index = 0; index < rest.length; index++) {
    const token = rest[index]!;
    if (token === "--store") args.storeRoot = rest[++index] ?? null;
    else if (token === "--prompt") args.seedPrompt = rest[++index] ?? null;
    else if (token === "--id") args.seedId = rest[++index] ?? null;
    else if (token === "--model") args.seedModel = rest[++index] ?? null;
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
      "  inversion tutorial          walk through one practice round (no streak)",
      "  inversion play              play today's puzzle",
      "  inversion practice <id>     play a past puzzle (does not affect streak)",
      "  inversion stats             show your streak and history",
      "  inversion list              list all bundled + user-seeded puzzles",
      "  inversion seed --prompt <p> generate a new puzzle by calling claude and",
      "                                save it as a user puzzle for later play",
      "  inversion --help            show this message",
      "",
      "`seed` options:",
      "  --prompt <text>             required; the hidden prompt to be guessed",
      "  --id <kebab-case-id>        optional; defaults to a slug of the prompt",
      "  --model <claude-model>      optional; defaults to sonnet",
      "  --store <path>              override the store root (default: $HOME)",
      "",
      "Requirements:",
      "  - `claude` CLI installed; your guess (and any seed call) is run against",
      "    the same model the puzzle was originally produced with. You pay",
      "    Anthropic for your guess tokens (~$0.005 per round).",
      "",
      "How scoring works:",
      `  Each guess: your prompt is run live against claude. The output is`,
      `  compared to the original output via chrF (Popović 2015) with β=2.`,
      `  Hit ≥ ${SOLVE_THRESHOLD} to solve. You get ${MAX_GUESSES} guesses.`,
      `  Type :reveal instead of a guess to give up and see the answer early.`,
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
  emitShareGrid(puzzle, completed, color);
  return 0;
};

const emitShareGrid = (puzzle: Puzzle, completed: CompletedPuzzle, color: boolean): void => {
  const grid = formatShareGrid(puzzle, completed);
  stdout.write(`\n${color ? dim("share:") : "share:"}\n${grid}\n`);
};

const filterContent = (tokens: readonly string[]): readonly string[] =>
  tokens.filter((token) => !STOP_WORDS.has(token));

const formatTokenRow = (
  label: string,
  marker: string,
  tokens: readonly string[],
  colorFn: ((text: string) => string) | null,
): string | null => {
  const displayable = filterContent(tokens);
  if (displayable.length === 0) return null;
  const shown = displayable.slice(0, DIFF_DISPLAY_CAP);
  const overflow =
    displayable.length > DIFF_DISPLAY_CAP
      ? ` (+${displayable.length - DIFF_DISPLAY_CAP} more)`
      : "";
  const text = `  ${marker} ${label.padEnd(7)} ${shown.join(", ")}${overflow}`;
  return colorFn ? colorFn(text) : text;
};

const renderDiff = (playerOutput: string, targetOutput: string, color: boolean): void => {
  const diff = diffOutputs(playerOutput, targetOutput);
  const sharedLine = formatTokenRow("shared:", "✓", diff.shared, color ? green : null);
  const missedLine = formatTokenRow("missed:", "+", diff.onlyInTarget, color ? yellow : null);
  const extraLine = formatTokenRow("extra: ", "−", diff.onlyInPlayer, color ? dim : null);
  if (sharedLine) stdout.write(`${sharedLine}\n`);
  if (missedLine) stdout.write(`${missedLine}\n`);
  if (extraLine) stdout.write(`${extraLine}\n`);
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
  let revealedEarly = false;
  try {
    while (session.status === "in-progress") {
      stdout.write(
        `${color ? dim(`guess ${session.guesses.length + 1}/${MAX_GUESSES} — your prompt  (:reveal to give up):`) : `guess ${session.guesses.length + 1}/${MAX_GUESSES} — your prompt  (:reveal to give up):`}\n`,
      );
      const guessText = await reader.next();
      if (guessText === null) {
        stdout.write(color ? dim("\n(input ended; exiting)\n") : "\n(input ended; exiting)\n");
        break;
      }
      if (guessText.trim() === REVEAL_COMMAND) {
        revealedEarly = true;
        break;
      }
      if (guessText.trim().length === 0) {
        stdout.write(color ? red("empty guess; try again\n") : "empty guess; try again\n");
        continue;
      }
      stdout.write(color ? dim("calling claude…\n") : "calling claude…\n");
      const result = await runGuessOrFail(guessText, puzzle.model);
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
      renderDiff(result.output, puzzle.output, color);
      stdout.write(`  similarity: ${pct}%  ${bucketLabel}  (${feedback.lengthDelta})\n\n`);
    }
  } finally {
    reader.close();
  }
  return finishSession(puzzle, session, recordResult, storeRoot, color, revealedEarly);
};

const runGuessOrFail = async (
  prompt: string,
  model: string,
): Promise<{ output: string } | null> => {
  try {
    const { output } = await runClaude(prompt, { model: shortModelName(model) });
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

const shortModelName = (full: string): string => {
  if (full.startsWith("claude-")) return full.slice("claude-".length);
  return full;
};

const finishSession = (
  puzzle: Puzzle,
  session: PuzzleSession,
  recordResult: boolean,
  storeRoot: string | null,
  color: boolean,
  revealedEarly: boolean = false,
): number => {
  const solved = session.status === "solved";
  const guessCount = session.guesses.length;
  const headlineText = solved
    ? `solved in ${guessCount}/${MAX_GUESSES}`
    : revealedEarly
      ? `revealed (${guessCount}/${MAX_GUESSES} guesses used)`
      : `out of guesses (${guessCount}/${MAX_GUESSES})`;
  const headline = solved
    ? color
      ? green(headlineText)
      : headlineText
    : color
      ? red(headlineText)
      : headlineText;
  stdout.write(`${headline}\n`);
  stdout.write(
    `${color ? dim("the original prompt was:") : "the original prompt was:"} ${puzzle.prompt}\n`,
  );
  const completed: CompletedPuzzle = {
    puzzleId: puzzle.id,
    isoDate: puzzle.isoDate,
    completedAtIso: new Date().toISOString(),
    guesses: session.guesses,
    solved,
    guessCount,
  };
  emitShareGrid(puzzle, completed, color);
  if (recordResult) {
    const state = loadPlayState(storeRoot ?? undefined);
    const next = completeSession(state, puzzle, session);
    savePlayState(next, storeRoot ?? undefined);
  }
  return solved ? 0 : 1;
};

const cmdTutorial = async (color: boolean): Promise<number> => {
  const intro = [
    color ? bold("inversion tutorial") : "inversion tutorial",
    "",
    "You'll see an LLM output. Your job: write a prompt that would have",
    "produced it. Your guess is sent to claude (live, BYOK). The output you",
    "get is compared to the cached one via chrF; ≥ 60% solves it.",
    "",
    "The shared/missed/extra rows after each guess tell you which tokens you",
    "matched, which target tokens you missed, and which you produced extra.",
    "Type :reveal at any time to give up and see the answer early.",
    "This round does not count toward your streak.",
    "",
  ];
  stdout.write(`${intro.join("\n")}\n`);
  return playSession(TUTORIAL_PUZZLE, false, null, color);
};

const cmdPlay = async (storeRoot: string | null, color: boolean): Promise<number> => {
  const load = loadAllPuzzles(storeRoot ?? undefined);
  if (load.puzzles.length === 0) {
    stdout.write("inversion: no puzzles available.\n");
    return 1;
  }
  const pick = dailyPick(load.puzzles);
  if (!pick) return 1;
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
  const puzzle = findPuzzle(puzzleId, storeRoot ?? undefined);
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

const cmdList = (storeRoot: string | null, color: boolean): number => {
  const load = loadAllPuzzles(storeRoot ?? undefined);
  const header = color ? bold("puzzles") : "puzzles";
  stdout.write(`${header}\n`);
  for (const puzzle of load.puzzles) {
    const isBundled = load.puzzles.indexOf(puzzle) < load.bundledCount;
    const tag = isBundled ? "bundled" : "user";
    const tagged = color ? dim(`[${tag}]`) : `[${tag}]`;
    stdout.write(`  ${puzzle.id.padEnd(28)} ${tagged}  ${puzzle.isoDate}  ${puzzle.model}\n`);
  }
  if (load.rejectedIds.length > 0) {
    const message = `rejected user puzzles (collide with bundled ids): ${load.rejectedIds.join(", ")}`;
    stdout.write(`${color ? red(message) : message}\n`);
  }
  return 0;
};

const cmdSeed = async (
  prompt: string | null,
  customId: string | null,
  model: string | null,
  storeRoot: string | null,
  color: boolean,
): Promise<number> => {
  if (!prompt) {
    stdout.write('usage: inversion seed --prompt "<text>" [--id <id>] [--model <name>]\n');
    return 2;
  }
  const targetId = customId ?? slugify(prompt);
  const targetModel = model ?? "sonnet";
  stdout.write(
    color
      ? dim(`generating with claude (${targetModel})…\n`)
      : `generating with claude (${targetModel})…\n`,
  );
  let output: string;
  try {
    const result = await runClaude(prompt, { model: targetModel });
    output = result.output;
  } catch (error) {
    if (error instanceof RunnerError) {
      stdout.write(
        `${color ? red(`claude failed: ${error.message}`) : `claude failed: ${error.message}`}\n`,
      );
      if (error.stderr.trim().length > 0)
        stdout.write(`${color ? dim(error.stderr.trim()) : error.stderr.trim()}\n`);
      return 1;
    }
    throw error;
  }
  try {
    const puzzle = writeUserPuzzle(
      { id: targetId, prompt, output, model: `claude-${targetModel}` },
      storeRoot ?? undefined,
    );
    stdout.write(`${color ? bold("seeded") : "seeded"} ${puzzle.id} (${puzzle.isoDate})\n`);
    stdout.write(`${color ? dim("preview:") : "preview:"}\n`);
    const preview = puzzle.output
      .split("\n")
      .slice(0, 4)
      .map((line) => `  ${line}`)
      .join("\n");
    stdout.write(`${color ? cyan(preview) : preview}\n`);
    return 0;
  } catch (error) {
    if (error instanceof UserPuzzleCollisionError) {
      stdout.write(`${color ? red(error.message) : error.message}\n`);
      return 2;
    }
    throw error;
  }
};

const main = async (): Promise<number> => {
  const args = parseArgs(process.argv.slice(2));
  const color = supportsColor(stdout);
  if (args.command === "help") {
    printHelp(color);
    return 0;
  }
  if (args.command === "tutorial") return cmdTutorial(color);
  if (args.command === "play") return cmdPlay(args.storeRoot, color);
  if (args.command === "practice") return cmdPractice(args.positional, args.storeRoot, color);
  if (args.command === "stats") return cmdStats(args.storeRoot, color);
  if (args.command === "list") return cmdList(args.storeRoot, color);
  if (args.command === "seed")
    return cmdSeed(args.seedPrompt, args.seedId, args.seedModel, args.storeRoot, color);
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
