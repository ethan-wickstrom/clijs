import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { RUNNER_SYSTEM_PROMPT, RUNNER_TIMEOUT_MS } from "./constants.js";

export interface RunOptions {
  command?: string;
  model?: string;
  timeoutMs?: number;
  systemPrompt?: string;
  cwd?: string;
}

export interface RunResult {
  output: string;
  durationMs: number;
}

export class RunnerError extends Error {
  readonly exitCode: number | null;
  readonly stderr: string;
  constructor(message: string, exitCode: number | null, stderr: string) {
    super(message);
    this.name = "RunnerError";
    this.exitCode = exitCode;
    this.stderr = stderr;
  }
}

export const runClaude = (prompt: string, options: RunOptions = {}): Promise<RunResult> =>
  new Promise<RunResult>((resolveCall, rejectCall) => {
    const command = options.command ?? "claude";
    const model = options.model ?? "sonnet";
    const timeoutMs = options.timeoutMs ?? RUNNER_TIMEOUT_MS;
    const startedAt = Date.now();
    const systemPrompt = options.systemPrompt ?? RUNNER_SYSTEM_PROMPT;
    const cwd = options.cwd ?? tmpdir();
    const child = spawn(
      command,
      [
        "--print",
        "--model",
        model,
        "--tools",
        "",
        "--system-prompt",
        systemPrompt,
        "--no-session-persistence",
      ],
      {
        stdio: ["pipe", "pipe", "pipe"],
        cwd,
      },
    );
    let stdout = "";
    let stderr = "";
    const killer = setTimeout(() => {
      child.kill("SIGKILL");
      rejectCall(new RunnerError(`${command} timed out after ${timeoutMs}ms`, null, stderr));
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error: Error) => {
      clearTimeout(killer);
      rejectCall(new RunnerError(error.message, null, stderr));
    });
    child.on("close", (exitCode: number | null) => {
      clearTimeout(killer);
      if (exitCode !== 0) {
        rejectCall(
          new RunnerError(
            `${command} exited with ${exitCode ?? "null"}: ${stderr.trim()}`,
            exitCode,
            stderr,
          ),
        );
        return;
      }
      resolveCall({ output: stdout.trim(), durationMs: Date.now() - startedAt });
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });
