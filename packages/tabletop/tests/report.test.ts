import { describe, it, expect } from "vite-plus/test";
import { buildReport } from "../src/report.js";
import { recordDecision, summarize } from "../src/scoring.js";
import type { Scenario, Scene } from "../src/scenario.js";

const tinyScenario: Scenario = {
  id: "tiny",
  title: "Tiny Drill",
  version: "0.1.0",
  summary: "",
  setting: "",
  durationMinutes: 0,
  frameworks: {
    mitreAttack: ["T1566.001"],
    nistCsf: ["DE.AE-2"],
    nydfs500: [],
  },
  facilitatorNotes: "",
  scenes: [
    {
      id: "s1",
      narrative: "",
      decision: {
        prompt: "",
        options: [
          {
            id: "A",
            label: "investigate",
            consequence: "you find the indicator",
            score: 10,
            techniquesExercised: ["T1566.001", "DE.AE-2"],
            next: null,
          },
        ],
      },
    },
  ],
  rubric: { maxScore: 10, thresholds: { exemplary: 8, competent: 5, developing: 1 } },
};

describe("buildReport", () => {
  it("produces markdown with score, decision, exercised, missed, frameworks", () => {
    const scene: Scene = tinyScenario.scenes[0]!;
    const option = scene.decision.options[0]!;
    const decisions = [recordDecision(scene, option)];
    const result = summarize(
      tinyScenario,
      decisions,
      "2026-05-13T00:00:00Z",
      "2026-05-13T00:30:00Z",
    );
    const report = buildReport(tinyScenario, result, "Test Bank");
    expect(report).toContain("After-Action Report");
    expect(report).toContain("Test Bank");
    expect(report).toContain("Tiny Drill");
    expect(report).toContain("**10 / 10** — Exemplary");
    expect(report).toContain("`T1566.001`");
    expect(report).toContain("`DE.AE-2`");
    expect(report).toContain("Frameworks declared in this scenario");
  });

  it("lists missed controls when none were exercised", () => {
    const result = summarize(tinyScenario, [], "a", "b");
    const report = buildReport(tinyScenario, result, "Org");
    expect(report).toContain("Missed (declared in scenario, never exercised)");
    expect(report).toContain("`T1566.001`");
    expect(report).toContain("`DE.AE-2`");
  });
});
