import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export interface FrameworkMappings {
  mitreAttack: readonly string[];
  nistCsf: readonly string[];
  nydfs500: readonly string[];
}

export interface RubricThresholds {
  exemplary: number;
  competent: number;
  developing: number;
}

export interface Rubric {
  maxScore: number;
  thresholds: RubricThresholds;
}

export interface DecisionOption {
  id: string;
  label: string;
  consequence: string;
  score: number;
  techniquesExercised: readonly string[];
  next: string | null;
}

export interface Decision {
  prompt: string;
  options: readonly DecisionOption[];
}

export interface Scene {
  id: string;
  narrative: string;
  decision: Decision;
}

export interface Scenario {
  id: string;
  title: string;
  version: string;
  summary: string;
  setting: string;
  durationMinutes: number;
  frameworks: FrameworkMappings;
  facilitatorNotes: string;
  scenes: readonly Scene[];
  rubric: Rubric;
}

interface RawDecisionOption {
  id: string;
  label: string;
  consequence: string;
  score: number;
  techniques_exercised?: readonly string[];
  next?: string | null;
}

interface RawScene {
  id: string;
  narrative: string;
  decision: {
    prompt: string;
    options: readonly RawDecisionOption[];
  };
}

interface RawScenario {
  id: string;
  title: string;
  version: string;
  summary: string;
  setting: string;
  duration_min: number;
  frameworks: {
    mitre_attack?: readonly string[];
    nist_csf?: readonly string[];
    nydfs_500?: readonly string[];
  };
  facilitator_notes: string;
  scenes: readonly RawScene[];
  rubric: {
    max_score: number;
    thresholds: RubricThresholds;
  };
}

const normalizeOption = (raw: RawDecisionOption): DecisionOption => ({
  id: raw.id,
  label: raw.label,
  consequence: raw.consequence,
  score: raw.score,
  techniquesExercised: raw.techniques_exercised ?? [],
  next: raw.next ?? null,
});

const normalizeScene = (raw: RawScene): Scene => ({
  id: raw.id,
  narrative: raw.narrative,
  decision: {
    prompt: raw.decision.prompt,
    options: raw.decision.options.map(normalizeOption),
  },
});

export const normalizeScenario = (raw: RawScenario): Scenario => ({
  id: raw.id,
  title: raw.title,
  version: raw.version,
  summary: raw.summary,
  setting: raw.setting,
  durationMinutes: raw.duration_min,
  frameworks: {
    mitreAttack: raw.frameworks.mitre_attack ?? [],
    nistCsf: raw.frameworks.nist_csf ?? [],
    nydfs500: raw.frameworks.nydfs_500 ?? [],
  },
  facilitatorNotes: raw.facilitator_notes,
  scenes: raw.scenes.map(normalizeScene),
  rubric: {
    maxScore: raw.rubric.max_score,
    thresholds: raw.rubric.thresholds,
  },
});

export const loadScenario = (filePath: string): Scenario => {
  const absolute = resolve(filePath);
  const raw = JSON.parse(readFileSync(absolute, "utf8")) as RawScenario;
  validateRaw(raw, absolute);
  return normalizeScenario(raw);
};

const validateRaw = (raw: RawScenario, sourcePath: string): void => {
  if (!raw.id) throw new Error(`scenario ${sourcePath}: missing id`);
  if (!raw.scenes || raw.scenes.length === 0) {
    throw new Error(`scenario ${raw.id}: must have at least one scene`);
  }
  const sceneIds = new Set(raw.scenes.map((scene) => scene.id));
  for (const scene of raw.scenes) {
    if (!scene.decision || !scene.decision.options || scene.decision.options.length === 0) {
      throw new Error(`scene ${scene.id}: must have at least one decision option`);
    }
    for (const option of scene.decision.options) {
      if (option.next !== null && option.next !== undefined && !sceneIds.has(option.next)) {
        throw new Error(`scene ${scene.id} option ${option.id}: next "${option.next}" not found`);
      }
    }
  }
};

export const findScene = (scenario: Scenario, sceneId: string): Scene | undefined =>
  scenario.scenes.find((scene) => scene.id === sceneId);
