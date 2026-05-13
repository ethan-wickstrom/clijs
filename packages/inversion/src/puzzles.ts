import type { Puzzle } from "./play.js";

const MODEL = "claude-sonnet";

export const PUZZLES: readonly Puzzle[] = [
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

export const findPuzzle = (id: string): Puzzle | undefined =>
  PUZZLES.find((puzzle) => puzzle.id === id);
