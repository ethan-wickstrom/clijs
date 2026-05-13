# `tabletop`

AI-driven cybersecurity tabletop exercises for regulated mid-market firms. The
binary loads a scenario, walks the team through a branching incident, scores
their decisions against MITRE ATT&CK / NIST CSF / NYDFS-500 controls, and emits
a markdown after-action report you can hand to an auditor.

```sh
tabletop play scenarios/riverbend-ransomware.json --org "Riverbend Bank" --report ./aar.md
```

## Why this and not another puzzle game

The repo has the receipts in `docs/synthesis.md` and `docs/business-case.md`.
Short version: nine parallel research agents argued both for and against
several "video game company" theses. Direct-to-consumer puzzles, AI-eval
markets, and verified-skill hiring leaderboards each failed the test. The one
shape that survived adversarial scrutiny:

- **Buyer:** CISO at a mid-market regulated firm (US community bank, regional
  hospital system, defense subcontractor).
- **Trigger:** annual regulatory mandate (NIST CSF, 23 NYCRR 500, HIPAA
  Security Rule, EU DORA) requires documented incident-response exercises.
- **Today's alternative:** $20–50k consulting engagements that produce one
  in-person facilitated tabletop and a slide deck.
- **What we sell:** a scenario library + AI-driven facilitator + auditor-ready
  report, $25–75k ACV per year, 60–120 day sales cycle.
- **Defensibility:** scenario library compounds; auto-mapping to ATT&CK / CSF /
  NYDFS controls turns the report itself into the audit deliverable; AI
  customisation of scenarios for each customer's environment is moat over
  static consulting decks.
- **Time-tested primitive:** decision-making under uncertainty in a structured
  scenario. Older than computers (military war games, business case method).

## Usage

```
tabletop play <scenario.json>      run an exercise interactively
tabletop scenario <scenario.json>  show the scenario brief
tabletop --help                    show this message
```

`play` options:

```
--org <name>            organisation name shown in the after-action report
--narrator scripted     use the canned narrative as written (default)
--narrator claude-cli   rewrite each scene with the local `claude` CLI
--report <path>         write the markdown after-action report to <path>
```

## The bundled scenario

`scenarios/riverbend-ransomware.json` is a 60-minute exercise modelled on a
$1.8B-asset US community bank under NYDFS Cybersecurity Regulation (23 NYCRR
500). Seven scenes, branching consequences, decisions tagged with MITRE
ATT&CK techniques and NIST CSF subcategories. The scoring rubric maps to four
levels (Exemplary / Competent / Developing / Needs Improvement).

## Scenario format

A scenario is a single JSON file. The shape is intentionally small so
external scenario authors (consultants, partner CISOs) can write them by
hand:

```json
{
  "id": "kebab-case",
  "title": "Human-readable title",
  "version": "0.1.0",
  "summary": "One paragraph for the brief.",
  "setting": "Who you are, what tools, what regulations apply.",
  "duration_min": 60,
  "frameworks": {
    "mitre_attack": ["T1566.001"],
    "nist_csf": ["DE.AE-2", "RS.RP-1"],
    "nydfs_500": ["500.16"]
  },
  "facilitator_notes": "Notes for the person running the session.",
  "scenes": [
    {
      "id": "01-alert",
      "narrative": "What just happened.",
      "decision": {
        "prompt": "What do you do?",
        "options": [
          {
            "id": "A",
            "label": "Wake the CISO",
            "consequence": "She joins the bridge in 12 minutes.",
            "score": 15,
            "techniques_exercised": ["RS.RP-1"],
            "next": "02-isolate"
          }
        ]
      }
    }
  ],
  "rubric": {
    "max_score": 100,
    "thresholds": { "exemplary": 70, "competent": 40, "developing": 10 }
  }
}
```

`next` of `null` (or omitted) ends the exercise.

## Programmatic API

```ts
import { loadScenario, summarize, buildReport, scriptedLlmClient } from "tabletop";

const scenario = loadScenario("./scenarios/riverbend-ransomware.json");
const decisions = [
  /* … records from your own UI … */
];
const result = summarize(scenario, decisions, startedIso, endedIso);
const report = buildReport(scenario, result, "Riverbend Community Bank");
```

## License

MIT
