import { parentPort, workerData } from "node:worker_threads";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";
import type { TestCase } from "./puzzles.js";
import { equalsJson } from "./utils/equals-json.js";

export interface WorkerInput {
  solutionPath: string;
  tests: readonly TestCase[];
}

export interface TestOutcome {
  ok: boolean;
  actual?: unknown;
  expected: unknown;
  error?: string;
  durationMs: number;
}

export type WorkerMessage =
  | { kind: "load-error"; message: string }
  | { kind: "results"; outcomes: readonly TestOutcome[] };

const post = (message: WorkerMessage): void => {
  parentPort?.postMessage(message);
};

const run = async (): Promise<void> => {
  const { solutionPath, tests } = workerData as WorkerInput;
  let solution: (...args: readonly unknown[]) => unknown;
  try {
    const mod = (await import(pathToFileURL(solutionPath).href)) as { default?: unknown };
    if (typeof mod.default !== "function") {
      post({ kind: "load-error", message: "solution must default-export a function" });
      return;
    }
    solution = mod.default as (...args: readonly unknown[]) => unknown;
  } catch (error) {
    post({ kind: "load-error", message: error instanceof Error ? error.message : String(error) });
    return;
  }
  const outcomes: TestOutcome[] = [];
  for (const test of tests) {
    const startedAt = performance.now();
    try {
      const actual = solution(...test.input);
      outcomes.push({
        ok: equalsJson(actual, test.output),
        actual,
        expected: test.output,
        durationMs: performance.now() - startedAt,
      });
    } catch (error) {
      outcomes.push({
        ok: false,
        expected: test.output,
        error: error instanceof Error ? error.message : String(error),
        durationMs: performance.now() - startedAt,
      });
    }
  }
  post({ kind: "results", outcomes });
};

void run();
