import type { DecisionOption, Scenario, Scene } from "./scenario.js";

export interface DecisionRecord {
  sceneId: string;
  optionId: string;
  scoreDelta: number;
  techniquesExercised: readonly string[];
  consequence: string;
}

export type RubricLevel = "exemplary" | "competent" | "developing" | "needs-improvement";

export interface PlaythroughResult {
  scenarioId: string;
  startedAtIso: string;
  endedAtIso: string;
  decisions: readonly DecisionRecord[];
  totalScore: number;
  maxScore: number;
  level: RubricLevel;
  techniquesExercised: readonly string[];
  techniquesMissed: readonly string[];
}

export const recordDecision = (scene: Scene, option: DecisionOption): DecisionRecord => ({
  sceneId: scene.id,
  optionId: option.id,
  scoreDelta: option.score,
  techniquesExercised: option.techniquesExercised,
  consequence: option.consequence,
});

export const levelForScore = (score: number, scenario: Scenario): RubricLevel => {
  const { thresholds } = scenario.rubric;
  if (score >= thresholds.exemplary) return "exemplary";
  if (score >= thresholds.competent) return "competent";
  if (score >= thresholds.developing) return "developing";
  return "needs-improvement";
};

export const summarize = (
  scenario: Scenario,
  decisions: readonly DecisionRecord[],
  startedAtIso: string,
  endedAtIso: string,
): PlaythroughResult => {
  const totalScore = decisions.reduce((sum, decision) => sum + decision.scoreDelta, 0);
  const exercisedSet = new Set<string>();
  for (const decision of decisions) {
    for (const technique of decision.techniquesExercised) exercisedSet.add(technique);
  }
  const techniquesExercised = [...exercisedSet].sort();
  const declared = [
    ...scenario.frameworks.mitreAttack,
    ...scenario.frameworks.nistCsf,
    ...scenario.frameworks.nydfs500,
  ];
  const techniquesMissed = declared.filter((technique) => !exercisedSet.has(technique));
  return {
    scenarioId: scenario.id,
    startedAtIso,
    endedAtIso,
    decisions,
    totalScore,
    maxScore: scenario.rubric.maxScore,
    level: levelForScore(totalScore, scenario),
    techniquesExercised,
    techniquesMissed,
  };
};
