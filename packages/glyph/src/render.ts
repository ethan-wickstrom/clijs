import { MAX_GUESSES, WORD_LENGTH } from "./constants.js";
import type { GameState, GuessRow, LetterStatus } from "./game.js";
import { bold } from "./utils/bold.js";
import { dim } from "./utils/dim.js";
import { onGray } from "./utils/on-gray.js";
import { onGreen } from "./utils/on-green.js";
import { onYellow } from "./utils/on-yellow.js";

export interface RenderOptions {
  color: boolean;
}

const tile = (letter: string, status: LetterStatus, color: boolean): string => {
  const display = ` ${letter.toUpperCase()} `;
  if (!color) {
    if (status === "hit") return `[${letter.toUpperCase()}]`;
    if (status === "near") return `(${letter.toUpperCase()})`;
    return ` ${letter.toUpperCase()} `;
  }
  if (status === "hit") return onGreen(display);
  if (status === "near") return onYellow(display);
  return onGray(display);
};

const renderRow = (row: GuessRow, color: boolean): string =>
  row.scored.map((cell) => tile(cell.letter, cell.status, color)).join(" ");

const renderEmptyRow = (color: boolean): string => {
  const cell = " . ";
  const cells = Array.from({ length: WORD_LENGTH }, () => cell).join(" ");
  return color ? dim(cells) : cells;
};

export const renderBoard = (state: GameState, options: RenderOptions): string => {
  const lines: string[] = [];
  for (let rowIndex = 0; rowIndex < MAX_GUESSES; rowIndex++) {
    const row = state.rows[rowIndex];
    lines.push(row ? renderRow(row, options.color) : renderEmptyRow(options.color));
  }
  return lines.join("\n");
};

export const renderHeader = (isoDate: string, options: RenderOptions): string => {
  const heading = `glyph — ${isoDate}`;
  return options.color ? bold(heading) : heading;
};

export const renderFooter = (state: GameState, options: RenderOptions): string => {
  if (state.status === "playing") {
    const guessesUsed = state.rows.length;
    const remaining = MAX_GUESSES - guessesUsed;
    const message = `${remaining} ${remaining === 1 ? "guess" : "guesses"} left`;
    return options.color ? dim(message) : message;
  }
  if (state.status === "won") {
    const guesses = state.rows.length;
    return options.color
      ? bold(`solved in ${guesses}/${MAX_GUESSES}`)
      : `solved in ${guesses}/${MAX_GUESSES}`;
  }
  return options.color
    ? bold(`out of guesses — answer was ${state.answer.toUpperCase()}`)
    : `out of guesses — answer was ${state.answer.toUpperCase()}`;
};
