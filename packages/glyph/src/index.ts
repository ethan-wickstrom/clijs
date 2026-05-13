export { newGame, scoreGuess, submitGuess } from "./game.js";
export type {
  GameState,
  GameStatus,
  GuessRow,
  LetterStatus,
  ScoredLetter,
  SubmitOutcome,
} from "./game.js";
export { dailySeed } from "./seed.js";
export type { DailySeed } from "./seed.js";
export { renderBoard, renderFooter, renderHeader } from "./render.js";
export type { RenderOptions } from "./render.js";
export { ANSWERS, isAccepted } from "./words.js";
export { loadStore, saveStore, recordResult } from "./store.js";
export type { DailyResult, StreakState } from "./store.js";
