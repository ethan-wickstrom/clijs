#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { stdin, stdout } from "node:process";
import { createLineReader } from "./utils/line-reader.js";
import type { LineReader } from "./utils/line-reader.js";
import { findScene, loadScenario } from "./scenario.js";
import type { DecisionOption, Scenario, Scene } from "./scenario.js";
import { recordDecision, summarize } from "./scoring.js";
import type { DecisionRecord } from "./scoring.js";
import { buildReport } from "./report.js";
import { scriptedLlmClient } from "./llm/scripted-llm-client.js";
import { claudeCliLlmClient } from "./llm/claude-cli-llm-client.js";
import type { LlmClient } from "./llm/llm-client.js";
import { bold } from "./utils/bold.js";
import { dim } from "./utils/dim.js";
import { green } from "./utils/green.js";
import { red } from "./utils/red.js";
import { yellow } from "./utils/yellow.js";
import { supportsColor } from "./utils/supports-color.js";

interface ParsedArgs {
  command: "play" | "scenario" | "help";
  scenarioPath: string | null;
  organisation: string;
  narrator: "scripted" | "claude-cli";
  reportPath: string | null;
  showHelp: boolean;
}

const printHelp = (): void => {
  stdout.write(
    [
      "tabletop — AI-driven cybersecurity tabletop exercises",
      "",
      "Usage:",
      "  tabletop play <scenario.json> [options]   run an exercise interactively",
      "  tabletop scenario <scenario.json>         show the scenario brief",
      "  tabletop --help                           show this message",
      "",
      "Options for `play`:",
      "  --org <name>            organisation name for the after-action report",
      "  --narrator scripted     use the canned narrative as written (default)",
      "  --narrator claude-cli   rewrite each scene with the local `claude` CLI",
      "  --report <path>         write the markdown after-action report to <path>",
      "",
    ].join("\n"),
  );
};

const parseArgs = (argv: readonly string[]): ParsedArgs => {
  const args: ParsedArgs = {
    command: "help",
    scenarioPath: null,
    organisation: "Your Organisation",
    narrator: "scripted",
    reportPath: null,
    showHelp: false,
  };
  if (argv.includes("--help") || argv.includes("-h")) {
    args.showHelp = true;
    return args;
  }
  const [first, second, ...rest] = argv;
  if (first === "play" || first === "scenario") {
    args.command = first;
    if (second) args.scenarioPath = second;
  }
  for (let index = 0; index < rest.length; index++) {
    const token = rest[index]!;
    if (token === "--org") args.organisation = rest[++index] ?? args.organisation;
    else if (token === "--narrator") {
      const value = rest[++index];
      if (value === "scripted" || value === "claude-cli") args.narrator = value;
    } else if (token === "--report") args.reportPath = rest[++index] ?? null;
  }
  return args;
};

const pickClient = (id: ParsedArgs["narrator"]): LlmClient =>
  id === "claude-cli" ? claudeCliLlmClient : scriptedLlmClient;

const renderHeader = (scenario: Scenario, organisation: string, color: boolean): string => {
  const title = `${scenario.title}`;
  const subtitle = `for ${organisation}  ·  ${scenario.durationMinutes} min  ·  v${scenario.version}`;
  return color ? `${bold(title)}\n${dim(subtitle)}` : `${title}\n${subtitle}`;
};

const renderSetting = (scenario: Scenario, color: boolean): string =>
  color ? dim(scenario.setting) : scenario.setting;

const renderOptions = (decision: { options: readonly DecisionOption[] }, color: boolean): string =>
  decision.options
    .map((option) => {
      const id = color ? bold(option.id) : option.id;
      return `  ${id}.  ${option.label}`;
    })
    .join("\n");

const requireOption = async (
  lineReader: LineReader,
  scene: Scene,
  color: boolean,
): Promise<DecisionOption | null> => {
  const validIds = new Set(scene.decision.options.map((option) => option.id.toUpperCase()));
  while (true) {
    stdout.write(color ? bold("> ") : "> ");
    const line = await lineReader.next();
    if (line === null) return null;
    const normalized = line.trim().toUpperCase();
    if (validIds.has(normalized)) {
      const found = scene.decision.options.find((option) => option.id.toUpperCase() === normalized);
      if (found) return found;
    }
    stdout.write(color ? `${red("invalid choice")}\n` : "invalid choice\n");
  }
};

const colorForScore = (score: number, color: boolean): string => {
  if (!color) return `${score >= 0 ? "+" : ""}${score}`;
  const text = `${score >= 0 ? "+" : ""}${score}`;
  if (score > 0) return green(text);
  if (score < 0) return red(text);
  return yellow(text);
};

interface PlayOutcome {
  decisions: readonly DecisionRecord[];
  startedAtIso: string;
  endedAtIso: string;
}

const playScenario = async (
  scenario: Scenario,
  client: LlmClient,
  organisation: string,
  color: boolean,
): Promise<PlayOutcome> => {
  const lineReader = createLineReader(stdin);
  const decisions: DecisionRecord[] = [];
  const history: string[] = [];
  const startedAtIso = new Date().toISOString();
  try {
    stdout.write(`${renderHeader(scenario, organisation, color)}\n\n`);
    stdout.write(`${renderSetting(scenario, color)}\n\n`);
    if (client.id !== "scripted") {
      stdout.write(color ? dim(`narrator: ${client.id}\n\n`) : `narrator: ${client.id}\n\n`);
    }
    let currentScene: Scene | undefined = scenario.scenes[0];
    while (currentScene) {
      const narrative = await client.narrate({
        organisation,
        scenarioTitle: scenario.title,
        scene: currentScene,
        history,
      });
      stdout.write(`${color ? bold(`— ${currentScene.id} —`) : `— ${currentScene.id} —`}\n\n`);
      stdout.write(`${narrative}\n\n`);
      stdout.write(
        `${color ? bold(currentScene.decision.prompt) : currentScene.decision.prompt}\n`,
      );
      stdout.write(`${renderOptions(currentScene.decision, color)}\n\n`);
      const choice = await requireOption(lineReader, currentScene, color);
      if (choice === null) {
        stdout.write(
          color
            ? dim("\n(input ended; ending exercise early)\n")
            : "\n(input ended; ending exercise early)\n",
        );
        break;
      }
      const record = recordDecision(currentScene, choice);
      decisions.push(record);
      history.push(`At ${currentScene.id}, the team chose: ${choice.label}`);
      stdout.write(`\n${color ? dim(`→ ${choice.consequence}`) : `→ ${choice.consequence}`}\n`);
      stdout.write(
        `${color ? dim(`score: ${colorForScore(choice.score, color)}`) : `score: ${choice.score >= 0 ? "+" : ""}${choice.score}`}\n\n`,
      );
      currentScene = choice.next ? findScene(scenario, choice.next) : undefined;
    }
  } finally {
    lineReader.close();
  }
  const endedAtIso = new Date().toISOString();
  return { decisions, startedAtIso, endedAtIso };
};

const cmdScenario = (scenarioPath: string, color: boolean): number => {
  const scenario = loadScenario(scenarioPath);
  stdout.write(`${renderHeader(scenario, "—", color)}\n\n`);
  stdout.write(`${scenario.summary}\n\n`);
  stdout.write(`${renderSetting(scenario, color)}\n\n`);
  stdout.write(color ? bold("scenes:\n") : "scenes:\n");
  for (const scene of scenario.scenes) stdout.write(`  - ${scene.id}\n`);
  stdout.write(`\n${color ? bold("frameworks:") : "frameworks:"}\n`);
  stdout.write(`  MITRE ATT&CK: ${scenario.frameworks.mitreAttack.join(", ")}\n`);
  stdout.write(`  NIST CSF:     ${scenario.frameworks.nistCsf.join(", ")}\n`);
  stdout.write(`  NYDFS 500:    ${scenario.frameworks.nydfs500.join(", ")}\n`);
  return 0;
};

const cmdPlay = async (args: ParsedArgs, color: boolean): Promise<number> => {
  if (!args.scenarioPath) {
    stdout.write(
      "usage: tabletop play <scenario.json> [--org NAME] [--narrator scripted|claude-cli] [--report PATH]\n",
    );
    return 2;
  }
  const scenario = loadScenario(args.scenarioPath);
  const client = pickClient(args.narrator);
  const outcome = await playScenario(scenario, client, args.organisation, color);
  const result = summarize(scenario, outcome.decisions, outcome.startedAtIso, outcome.endedAtIso);
  stdout.write(
    `${color ? bold(`Final score: ${result.totalScore}/${result.maxScore} — ${result.level}`) : `Final score: ${result.totalScore}/${result.maxScore} — ${result.level}`}\n\n`,
  );
  if (args.reportPath) {
    const report = buildReport(scenario, result, args.organisation);
    writeFileSync(args.reportPath, report);
    stdout.write(`${color ? dim(`report → ${args.reportPath}`) : `report → ${args.reportPath}`}\n`);
  }
  return 0;
};

const main = async (): Promise<number> => {
  const args = parseArgs(process.argv.slice(2));
  if (args.showHelp || args.command === "help") {
    printHelp();
    return 0;
  }
  const color = supportsColor(stdout);
  if (args.command === "scenario") {
    if (!args.scenarioPath) {
      stdout.write("usage: tabletop scenario <scenario.json>\n");
      return 2;
    }
    return cmdScenario(args.scenarioPath, color);
  }
  return cmdPlay(args, color);
};

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`tabletop: ${message}\n`);
    process.exit(1);
  },
);
