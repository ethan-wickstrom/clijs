import type { Scene } from "../scenario.js";

export interface NarrationRequest {
  organisation: string;
  scenarioTitle: string;
  scene: Scene;
  history: readonly string[];
}

export interface LlmClient {
  readonly id: string;
  narrate: (request: NarrationRequest) => Promise<string>;
}
