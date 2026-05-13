import { Worker } from "node:worker_threads";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { WORKER_TIMEOUT_MS } from "./constants.js";
import { byteCount } from "./utils/byte-count.js";
import type { TestCase } from "./puzzles.js";
import type { TestOutcome, WorkerMessage } from "./worker.js";

export interface JudgeResult {
  loaded: boolean;
  loadError?: string;
  timedOut: boolean;
  outcomes: readonly TestOutcome[];
  bytes: number;
}

const workerEntry = new URL("./worker.mjs", import.meta.url);

export const judge = async (
  solutionPath: string,
  tests: readonly TestCase[],
  timeoutMs: number = WORKER_TIMEOUT_MS,
): Promise<JudgeResult> => {
  const absolutePath = resolve(solutionPath);
  const source = readFileSync(absolutePath, "utf8");
  const bytes = byteCount(source);
  return new Promise<JudgeResult>((resolveJudge) => {
    const worker = new Worker(workerEntry, {
      workerData: { solutionPath: absolutePath, tests },
    });
    let settled = false;
    const settle = (result: JudgeResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      resolveJudge(result);
    };
    const timer = setTimeout(() => {
      settle({ loaded: true, timedOut: true, outcomes: [], bytes });
    }, timeoutMs);
    worker.on("message", (message: WorkerMessage) => {
      if (message.kind === "load-error") {
        settle({ loaded: false, loadError: message.message, timedOut: false, outcomes: [], bytes });
      } else {
        settle({ loaded: true, timedOut: false, outcomes: message.outcomes, bytes });
      }
    });
    worker.on("error", (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      settle({
        loaded: false,
        loadError: message,
        timedOut: false,
        outcomes: [],
        bytes,
      });
    });
  });
};

export const allPassed = (result: JudgeResult): boolean =>
  result.loaded &&
  !result.timedOut &&
  result.outcomes.length > 0 &&
  result.outcomes.every((outcome) => outcome.ok);
