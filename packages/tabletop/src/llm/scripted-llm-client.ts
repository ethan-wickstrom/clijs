import type { LlmClient, NarrationRequest } from "./llm-client.js";

export const scriptedLlmClient: LlmClient = {
  id: "scripted",
  narrate: async (request: NarrationRequest): Promise<string> => request.scene.narrative,
};
