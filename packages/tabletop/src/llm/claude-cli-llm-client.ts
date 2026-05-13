import { spawn } from "node:child_process";
import { NARRATOR_TIMEOUT_MS } from "../constants.js";
import type { LlmClient, NarrationRequest } from "./llm-client.js";

const buildPrompt = (request: NarrationRequest): string => {
  const lines: string[] = [];
  lines.push(
    `You are the facilitator narrating a cybersecurity tabletop exercise titled "${request.scenarioTitle}" for ${request.organisation}.`,
  );
  lines.push("");
  lines.push(
    "Rewrite the following scene in your own words to make it feel immediate and specific to the organisation. Keep the same facts, branching points, and tension. Output 3 to 6 sentences only — no preamble, no headings.",
  );
  lines.push("");
  if (request.history.length > 0) {
    lines.push("Recent history (so the narration stays consistent):");
    for (const entry of request.history.slice(-4)) lines.push(`- ${entry}`);
    lines.push("");
  }
  lines.push("Scene to rewrite:");
  lines.push(request.scene.narrative);
  return lines.join("\n");
};

const runClaude = (prompt: string, timeoutMs: number): Promise<string> =>
  new Promise<string>((resolveCall, rejectCall) => {
    const child = spawn("claude", ["--print", "--model", "sonnet"], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const killer = setTimeout(() => {
      child.kill("SIGKILL");
      rejectCall(new Error("claude CLI timed out"));
    }, timeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error: Error) => {
      clearTimeout(killer);
      rejectCall(error);
    });
    child.on("close", (exitCode: number | null) => {
      clearTimeout(killer);
      if (exitCode === 0) resolveCall(stdout.trim());
      else rejectCall(new Error(`claude exited ${exitCode ?? "null"}: ${stderr.trim()}`));
    });
    child.stdin.write(prompt);
    child.stdin.end();
  });

export const claudeCliLlmClient: LlmClient = {
  id: "claude-cli",
  narrate: async (request: NarrationRequest): Promise<string> => {
    try {
      const result = await runClaude(buildPrompt(request), NARRATOR_TIMEOUT_MS);
      return result.length > 0 ? result : request.scene.narrative;
    } catch {
      return request.scene.narrative;
    }
  },
};
