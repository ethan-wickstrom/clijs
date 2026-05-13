#!/usr/bin/env node

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { ANSWERS } from "./words.js";
import { dailySeed } from "./seed.js";
import { newGame, submitGuess } from "./game.js";
import type { GameState } from "./game.js";
import { renderBoard, renderFooter, renderHeader } from "./render.js";
import { loadStore, recordResult, saveStore } from "./store.js";
import type { StreakState } from "./store.js";
import { bold } from "./utils/bold.js";
import { dim } from "./utils/dim.js";
import { supportsColor } from "./utils/supports-color.js";
import { WORD_LENGTH } from "./constants.js";

interface ParsedArgs {
  demo: boolean;
  stats: boolean;
  help: boolean;
}

const parseArgs = (argv: readonly string[]): ParsedArgs => ({
  demo: argv.includes("--demo"),
  stats: argv.includes("--stats"),
  help: argv.includes("--help") || argv.includes("-h"),
});

const printHelp = (): void => {
  stdout.write(
    [
      "glyph — a daily 5-letter terminal puzzle",
      "",
      "Usage:",
      "  glyph             play today's puzzle",
      "  glyph --demo      play a random off-the-record game",
      "  glyph --stats     show your streak",
      "  glyph --help      show this message",
      "",
    ].join("\n"),
  );
};

const renderStats = (store: StreakState, color: boolean): string => {
  const winRate = store.played === 0 ? 0 : Math.round((store.won / store.played) * 100);
  const lines = [
    `played:   ${store.played}`,
    `won:      ${store.won} (${winRate}%)`,
    `current:  ${store.currentStreak}`,
    `longest:  ${store.longestStreak}`,
  ];
  return color ? lines.map((line) => dim(line)).join("\n") : lines.join("\n");
};

const reasonMessage = (reason: "wrong-length" | "not-a-word" | "already-finished"): string => {
  if (reason === "wrong-length") return `enter a ${WORD_LENGTH}-letter word`;
  if (reason === "not-a-word") return "not in word list";
  return "game already finished";
};

const repaint = (state: GameState, isoDate: string, color: boolean, hint?: string): void => {
  if (stdout.isTTY) stdout.write("\x1b[2J\x1b[H");
  stdout.write(`${renderHeader(isoDate, { color })}\n\n`);
  stdout.write(`${renderBoard(state, { color })}\n\n`);
  stdout.write(`${renderFooter(state, { color })}\n`);
  if (hint) stdout.write(`${color ? dim(hint) : hint}\n`);
};

const playGame = async (
  initialState: GameState,
  isoDate: string,
  color: boolean,
): Promise<GameState> => {
  const rl = createInterface({ input: stdin, output: stdout });
  let state = initialState;
  let hint: string | undefined;
  try {
    while (state.status === "playing") {
      repaint(state, isoDate, color, hint);
      hint = undefined;
      const answer = await rl.question("> ");
      const outcome = submitGuess(state, answer);
      if (!outcome.ok) {
        hint = reasonMessage(outcome.reason);
        continue;
      }
      state = outcome.state;
    }
  } finally {
    rl.close();
  }
  repaint(state, isoDate, color);
  return state;
};

const main = async (): Promise<number> => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return 0;
  }

  const color = supportsColor(stdout);

  if (args.stats) {
    const store = loadStore();
    stdout.write(`${renderStats(store, color)}\n`);
    return 0;
  }

  if (args.demo) {
    const word = ANSWERS[Math.floor(Math.random() * ANSWERS.length)]!;
    await playGame(newGame(word), "demo", color);
    return 0;
  }

  const seed = dailySeed();
  const store = loadStore();
  const alreadyPlayed = store.history[seed.isoDate];

  if (alreadyPlayed) {
    stdout.write(
      `${color ? bold(`already played ${seed.isoDate}`) : `already played ${seed.isoDate}`}\n`,
    );
    const result = `${alreadyPlayed.won ? "solved" : "missed"} in ${alreadyPlayed.guesses} — answer: ${alreadyPlayed.answer.toUpperCase()}`;
    stdout.write(`${result}\n\n`);
    stdout.write(`${renderStats(store, color)}\n`);
    return 0;
  }

  const finalState = await playGame(newGame(seed.word), seed.isoDate, color);
  const updated = recordResult(store, {
    isoDate: seed.isoDate,
    won: finalState.status === "won",
    guesses: finalState.rows.length,
    answer: seed.word,
  });
  saveStore(updated);
  stdout.write(`\n${renderStats(updated, color)}\n`);
  return finalState.status === "won" ? 0 : 1;
};

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`glyph: ${message}\n`);
    process.exit(1);
  },
);
