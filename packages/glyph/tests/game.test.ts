import { describe, it, expect } from "vite-plus/test";
import { newGame, scoreGuess, submitGuess } from "../src/game.js";
import { ANSWERS } from "../src/words.js";
import { WORD_LENGTH } from "../src/constants.js";

describe("scoreGuess", () => {
  it("marks every position as hit when guess equals answer", () => {
    const row = scoreGuess("crane", "crane");
    expect(row.scored.map((cell) => cell.status)).toEqual(["hit", "hit", "hit", "hit", "hit"]);
  });

  it("marks unrelated letters as miss", () => {
    const row = scoreGuess("plumb", "crane");
    expect(row.scored.map((cell) => cell.status)).toEqual(["miss", "miss", "miss", "miss", "miss"]);
  });

  it("marks correct letter in wrong position as near and same-position match as hit", () => {
    const row = scoreGuess("react", "crane");
    expect(row.scored.map((cell) => cell.status)).toEqual(["near", "near", "hit", "near", "miss"]);
  });

  it("does not double-count near letters beyond the answer's letter count", () => {
    const row = scoreGuess("speed", "abide");
    expect(row.scored.map((cell) => cell.status)).toEqual(["miss", "miss", "near", "miss", "near"]);
  });

  it("prefers hits over nears when a duplicate guessed letter has a hit elsewhere", () => {
    const row = scoreGuess("level", "lemon");
    const statuses = row.scored.map((cell) => cell.status);
    expect(statuses[0]).toBe("hit");
    expect(statuses[1]).toBe("hit");
    expect(statuses[2]).toBe("miss");
    expect(statuses[3]).toBe("miss");
    expect(statuses[4]).toBe("miss");
  });
});

describe("submitGuess", () => {
  it("rejects guesses of the wrong length", () => {
    const outcome = submitGuess(newGame("crane"), "hi");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("wrong-length");
  });

  it("rejects unknown words", () => {
    const outcome = submitGuess(newGame("crane"), "zzzzz");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.reason).toBe("not-a-word");
  });

  it("ends the game in a win when the guess matches", () => {
    const outcome = submitGuess(newGame("crane"), "crane");
    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.state.status).toBe("won");
  });

  it("ends the game in a loss after MAX_GUESSES wrong attempts", () => {
    let state = newGame("crane");
    const wrongGuesses = ["plumb", "fight", "vivid", "world", "study", "today"];
    for (const guess of wrongGuesses) {
      const outcome = submitGuess(state, guess);
      expect(outcome.ok).toBe(true);
      if (outcome.ok) state = outcome.state;
    }
    expect(state.status).toBe("lost");
  });
});

describe("ANSWERS word list", () => {
  it("contains only lowercase letters of the configured length", () => {
    for (const word of ANSWERS) {
      expect(word.length).toBe(WORD_LENGTH);
      expect(/^[a-z]+$/.test(word)).toBe(true);
    }
  });

  it("contains no duplicates", () => {
    expect(new Set(ANSWERS).size).toBe(ANSWERS.length);
  });
});
