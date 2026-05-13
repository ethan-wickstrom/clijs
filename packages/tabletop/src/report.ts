import type { Scenario } from "./scenario.js";
import type { DecisionRecord, PlaythroughResult, RubricLevel } from "./scoring.js";

const LEVEL_LABEL: Record<RubricLevel, string> = {
  exemplary: "Exemplary",
  competent: "Competent",
  developing: "Developing",
  "needs-improvement": "Needs Improvement",
};

const formatDecision = (scenario: Scenario, decision: DecisionRecord, index: number): string => {
  const scene = scenario.scenes.find((candidate) => candidate.id === decision.sceneId);
  const option = scene?.decision.options.find((candidate) => candidate.id === decision.optionId);
  const sceneTitle = scene?.id ?? decision.sceneId;
  const choice = option?.label ?? decision.optionId;
  const direction = decision.scoreDelta >= 0 ? "+" : "";
  const techniques =
    decision.techniquesExercised.length === 0
      ? "_(none)_"
      : decision.techniquesExercised.map((technique) => `\`${technique}\``).join(", ");
  return [
    `### Decision ${index + 1} — \`${sceneTitle}\``,
    "",
    `**Chose:** ${choice}`,
    "",
    `**Score:** ${direction}${decision.scoreDelta}`,
    "",
    `**Controls exercised:** ${techniques}`,
    "",
    `**Consequence:** ${decision.consequence}`,
  ].join("\n");
};

export const buildReport = (
  scenario: Scenario,
  result: PlaythroughResult,
  organisation: string,
): string => {
  const lines: string[] = [];
  lines.push(`# After-Action Report — ${scenario.title}`);
  lines.push("");
  lines.push(`**Organisation:** ${organisation}`);
  lines.push(`**Scenario:** \`${scenario.id}\` v${scenario.version}`);
  lines.push(`**Started:** ${result.startedAtIso}`);
  lines.push(`**Ended:** ${result.endedAtIso}`);
  lines.push("");
  lines.push("## Score");
  lines.push("");
  lines.push(`**${result.totalScore} / ${result.maxScore}** — ${LEVEL_LABEL[result.level]}`);
  lines.push("");
  lines.push("## Timeline");
  lines.push("");
  result.decisions.forEach((decision, index) => {
    lines.push(formatDecision(scenario, decision, index));
    lines.push("");
  });
  lines.push("## Control coverage");
  lines.push("");
  if (result.techniquesExercised.length === 0) {
    lines.push("_No declared controls were exercised by the choices made._");
  } else {
    lines.push("**Exercised:**");
    lines.push("");
    for (const technique of result.techniquesExercised) lines.push(`- \`${technique}\``);
  }
  lines.push("");
  if (result.techniquesMissed.length > 0) {
    lines.push("**Missed (declared in scenario, never exercised):**");
    lines.push("");
    for (const technique of result.techniquesMissed) lines.push(`- \`${technique}\``);
    lines.push("");
  }
  lines.push("## Frameworks declared in this scenario");
  lines.push("");
  lines.push(`- **MITRE ATT&CK:** ${formatList(scenario.frameworks.mitreAttack)}`);
  lines.push(`- **NIST CSF:** ${formatList(scenario.frameworks.nistCsf)}`);
  lines.push(`- **NYDFS 500:** ${formatList(scenario.frameworks.nydfs500)}`);
  return `${lines.join("\n")}\n`;
};

const formatList = (values: readonly string[]): string =>
  values.length === 0 ? "_(none)_" : values.map((value) => `\`${value}\``).join(", ");
