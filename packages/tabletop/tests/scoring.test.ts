import { describe, it, expect } from "vite-plus/test";
import { levelForScore, recordDecision, summarize } from "../src/scoring.js";
import type { DecisionOption, Scenario, Scene } from "../src/scenario.js";

const buildScene = (id: string, options: readonly DecisionOption[]): Scene => ({
  id,
  narrative: "",
  decision: { prompt: "", options },
});

const buildOption = (
  id: string,
  score: number,
  techniques: readonly string[] = [],
): DecisionOption => ({
  id,
  label: "",
  consequence: "",
  score,
  techniquesExercised: techniques,
  next: null,
});

const buildScenario = (): Scenario => ({
  id: "test",
  title: "Test",
  version: "0",
  summary: "",
  setting: "",
  durationMinutes: 0,
  frameworks: {
    mitreAttack: ["T1566.001", "T1486"],
    nistCsf: ["DE.AE-2"],
    nydfs500: ["500.16"],
  },
  facilitatorNotes: "",
  scenes: [buildScene("s1", [])],
  rubric: { maxScore: 100, thresholds: { exemplary: 70, competent: 40, developing: 10 } },
});

describe("levelForScore", () => {
  const scenario = buildScenario();
  it("maps thresholds correctly", () => {
    expect(levelForScore(90, scenario)).toBe("exemplary");
    expect(levelForScore(70, scenario)).toBe("exemplary");
    expect(levelForScore(50, scenario)).toBe("competent");
    expect(levelForScore(40, scenario)).toBe("competent");
    expect(levelForScore(20, scenario)).toBe("developing");
    expect(levelForScore(0, scenario)).toBe("needs-improvement");
    expect(levelForScore(-5, scenario)).toBe("needs-improvement");
  });
});

describe("summarize", () => {
  it("sums scores and de-duplicates exercised techniques", () => {
    const scenario = buildScenario();
    const scene = buildScene("s1", []);
    const decisions = [
      recordDecision(scene, buildOption("A", 15, ["T1566.001"])),
      recordDecision(scene, buildOption("B", 10, ["T1566.001", "DE.AE-2"])),
      recordDecision(scene, buildOption("C", -5, [])),
    ];
    const result = summarize(scenario, decisions, "2026-05-13T00:00:00Z", "2026-05-13T01:00:00Z");
    expect(result.totalScore).toBe(20);
    expect(result.techniquesExercised).toEqual(["DE.AE-2", "T1566.001"]);
    expect(result.techniquesMissed).toEqual(["T1486", "500.16"]);
    expect(result.level).toBe("developing");
  });

  it("treats every declared framework item as missed when no decisions exercise any", () => {
    const scenario = buildScenario();
    const result = summarize(scenario, [], "a", "b");
    expect(result.totalScore).toBe(0);
    expect(result.techniquesExercised).toEqual([]);
    expect(result.techniquesMissed).toEqual(["T1566.001", "T1486", "DE.AE-2", "500.16"]);
  });
});
