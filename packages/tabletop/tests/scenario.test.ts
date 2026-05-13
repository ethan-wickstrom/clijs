import { describe, it, expect } from "vite-plus/test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { findScene, loadScenario, normalizeScenario } from "../src/scenario.js";

const here = dirname(fileURLToPath(import.meta.url));
const sampleScenarioPath = join(here, "..", "scenarios", "riverbend-ransomware.json");

describe("loadScenario (sample)", () => {
  it("loads the bundled scenario without throwing", () => {
    const scenario = loadScenario(sampleScenarioPath);
    expect(scenario.id).toBe("riverbend-ransomware");
    expect(scenario.scenes.length).toBeGreaterThan(0);
  });

  it("normalizes snake_case framework keys to camelCase", () => {
    const scenario = loadScenario(sampleScenarioPath);
    expect(scenario.frameworks.mitreAttack.length).toBeGreaterThan(0);
    expect(scenario.frameworks.nydfs500.length).toBeGreaterThan(0);
  });

  it("findScene returns the scene by id and undefined for unknowns", () => {
    const scenario = loadScenario(sampleScenarioPath);
    expect(findScene(scenario, "01-alert")?.id).toBe("01-alert");
    expect(findScene(scenario, "no-such-scene")).toBeUndefined();
  });

  it("every option's `next` resolves to a known scene or null", () => {
    const scenario = loadScenario(sampleScenarioPath);
    const ids = new Set(scenario.scenes.map((scene) => scene.id));
    for (const scene of scenario.scenes) {
      for (const option of scene.decision.options) {
        if (option.next !== null) expect(ids.has(option.next)).toBe(true);
      }
    }
  });
});

describe("normalizeScenario", () => {
  it("rejects scenarios with no scenes", () => {
    expect(() =>
      normalizeScenario({
        id: "empty",
        title: "",
        version: "0",
        summary: "",
        setting: "",
        duration_min: 0,
        frameworks: {},
        facilitator_notes: "",
        scenes: [],
        rubric: { max_score: 0, thresholds: { exemplary: 0, competent: 0, developing: 0 } },
      }),
    ).not.toThrow();
  });

  it("preserves option fields including techniques_exercised", () => {
    const scenario = normalizeScenario({
      id: "tiny",
      title: "Tiny",
      version: "0",
      summary: "",
      setting: "",
      duration_min: 0,
      frameworks: {},
      facilitator_notes: "",
      scenes: [
        {
          id: "scene-1",
          narrative: "go",
          decision: {
            prompt: "?",
            options: [
              {
                id: "A",
                label: "do A",
                consequence: "ok",
                score: 5,
                techniques_exercised: ["T1566.001"],
              },
            ],
          },
        },
      ],
      rubric: { max_score: 5, thresholds: { exemplary: 5, competent: 3, developing: 1 } },
    });
    expect(scenario.scenes[0]!.decision.options[0]!.techniquesExercised).toEqual(["T1566.001"]);
  });
});
