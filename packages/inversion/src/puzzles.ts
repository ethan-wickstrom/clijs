import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { STORE_DIR_NAME } from "./constants.js";
import type { Puzzle } from "./play.js";

const PUZZLE_DIR_NAME = "puzzles";
const MODEL = "claude-sonnet";

export const BUNDLED_PUZZLES: readonly Puzzle[] = [
  {
    id: "sat-haiku",
    isoDate: "2026-05-13",
    model: MODEL,
    prompt: "Write a haiku about Saturday.",
    output: "Sleep past the alarm,\nCoffee steams in golden light—\nNowhere else to be.",
  },
  {
    id: "merge-kitchen",
    isoDate: "2026-05-14",
    model: MODEL,
    prompt: "Explain merge sort using only kitchen metaphors, in exactly 3 sentences.",
    output:
      "Imagine you have a messy pile of recipe cards and you keep splitting them into smaller and smaller piles until each pile has just one card. Then, like a chef carefully interleaving ingredients from two bowls in the right order, you merge pairs of piles back together by always picking the smallest card from the top of either pile. You keep merging these sorted piles until all the recipe cards are back in one perfectly ordered stack, ready to use.",
  },
  {
    id: "five-unusual-hobbies",
    isoDate: "2026-05-15",
    model: MODEL,
    prompt: "List 5 unusual hobbies, one word each, lowercase, one per line, no header.",
    output: "spelunking\ntaxidermy\nfermentation\ndowsing\ncartomancy",
  },
];

const userPuzzleDir = (root?: string): string =>
  join(root ?? homedir(), STORE_DIR_NAME, PUZZLE_DIR_NAME);

export const ensureUserPuzzleDir = (root?: string): string => {
  const dir = userPuzzleDir(root);
  mkdirSync(dir, { recursive: true });
  return dir;
};

export const loadUserPuzzles = (root?: string): readonly Puzzle[] => {
  const dir = userPuzzleDir(root);
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir).filter((name) => name.endsWith(".json"));
  const loaded: Puzzle[] = [];
  for (const name of entries) {
    const raw = readFileSync(join(dir, name), "utf8");
    const parsed = JSON.parse(raw) as Puzzle;
    loaded.push(parsed);
  }
  return loaded;
};

export interface LoadResult {
  puzzles: readonly Puzzle[];
  bundledCount: number;
  userCount: number;
  rejectedIds: readonly string[];
}

export const loadAllPuzzles = (root?: string): LoadResult => {
  const bundled = BUNDLED_PUZZLES;
  const user = loadUserPuzzles(root);
  const bundledIds = new Set(bundled.map((puzzle) => puzzle.id));
  const rejected: string[] = [];
  const acceptedUser: Puzzle[] = [];
  for (const puzzle of user) {
    if (bundledIds.has(puzzle.id)) rejected.push(puzzle.id);
    else acceptedUser.push(puzzle);
  }
  acceptedUser.sort((left, right) => left.id.localeCompare(right.id));
  return {
    puzzles: [...bundled, ...acceptedUser],
    bundledCount: bundled.length,
    userCount: acceptedUser.length,
    rejectedIds: rejected,
  };
};

export const findPuzzle = (id: string, root?: string): Puzzle | undefined =>
  loadAllPuzzles(root).puzzles.find((puzzle) => puzzle.id === id);

export interface UserPuzzleInput {
  id: string;
  prompt: string;
  output: string;
  model: string;
  isoDate?: string;
}

export class UserPuzzleCollisionError extends Error {
  readonly id: string;
  constructor(id: string) {
    super(`puzzle id "${id}" collides with a bundled puzzle; choose another id`);
    this.name = "UserPuzzleCollisionError";
    this.id = id;
  }
}

export const writeUserPuzzle = (input: UserPuzzleInput, root?: string): Puzzle => {
  if (BUNDLED_PUZZLES.some((puzzle) => puzzle.id === input.id)) {
    throw new UserPuzzleCollisionError(input.id);
  }
  const dir = ensureUserPuzzleDir(root);
  const isoDate = input.isoDate ?? new Date().toISOString().slice(0, 10);
  const puzzle: Puzzle = {
    id: input.id,
    isoDate,
    model: input.model,
    prompt: input.prompt,
    output: input.output,
  };
  writeFileSync(join(dir, `${input.id}.json`), `${JSON.stringify(puzzle, null, 2)}\n`);
  return puzzle;
};

export const slugify = (text: string): string => {
  const lowered = text.toLowerCase();
  const cleaned = lowered.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const truncated = cleaned.slice(0, 48);
  return truncated.length === 0 ? "untitled" : truncated;
};
