# `verdict`

A local-first PR triage CLI for solo open-source maintainers. Every triage
decision you make becomes a structured, exportable training row — a diff, your
verdict, and _why_ — that you can fine-tune your own model on, or contribute
to a shared data co-op.

```sh
git diff main...feature/branch | verdict record --title "Add cache eviction"
verdict list
verdict export --format openai --out reviews.jsonl
```

## The thesis

Solo OSS maintainers in 2026 are drowning in AI-generated PRs. You already
read every incoming diff and decide _merge / request-changes / close_. That
decision is the supply gap in code-model training: labs have plenty of
"merged-or-not" signal scraped from public GitHub, but very little structured
"why" from real maintainers on fresh code.

`verdict` turns the work you were doing anyway into:

1. **A workflow tool** — a structured triage queue with archived reasoning
   you can search later. ("Why did I close PR #412 last March?")
2. **Your own fine-tuning dataset** — export to JSONL / HuggingFace /
   OpenAI-chat formats. Train a review assistant that reasons the way _you_
   do, not the way the average open-source codebase does.
3. **An opt-in supply for the data co-op** (v2) — contribute anonymised
   verdicts to a shared pool that's licensed to AI labs; contributors get a
   share of the revenue.

The full reasoning trail is in `docs/synthesis.md`. The economics are in
`docs/business-case.md`. Read those before drawing conclusions.

## Why this audience, why this shape

Per the standing constraint to find something "truly defensible with creative
economics that still works": solo devs spend $300–1k/yr on tools, so direct
ARPU is bounded; the only path that adds up is **the user is the supplier of
a valuable input, and a different industry pays**. Brave Search did this for
search queries; `verdict` does it for review decisions.

The user-facing value (workflow + private fine-tuning) is real on its own —
you'd use this even if no data ever left your machine. The data play is
opt-in upside, not a bait-and-switch.

## Usage

```
verdict init                          create the local store (~/.verdict)
verdict record [options]              capture one PR triage decision
verdict list                          list captured verdicts
verdict show <id>                     show a single verdict
verdict export [--format <fmt>]       export the dataset for fine-tuning
verdict --help                        show this message
```

The most common flow:

```sh
# stdin (default)
gh pr diff 123 | verdict record --repo owner/name --pr 123 --title "Fix race in cache.ts"

# file
verdict record --diff /tmp/pr-123.diff --title "Fix race in cache.ts" \
  --decision request-changes --label tests-needed \
  --reasoning "The fix is correct but the test only covers the happy path."
```

`record` options:

```
--diff <path>          read the diff from a file instead of stdin
--repo <owner/name>    repository identifier
--pr <number>          pull-request number
--title <text>         PR title
--author <handle>      PR author handle
--description <text>   PR description (single line)
--label <name>         add a label (repeatable)
--decision <choice>    one of: merge | request-changes | close
--reasoning <text>     skip the editor; use this text
--store <path>         override the store root (default: $HOME)
```

`export` options:

```
--format <fmt>         one of: jsonl (default) | hf | openai
--out <path>           write to file instead of stdout
--store <path>         override the store root (default: $HOME)
```

## Data shape

Each row in the on-disk store (`~/.verdict/records.jsonl`):

```jsonc
{
  "id": "abc123",
  "schemaVersion": 1,
  "recordedAt": "2026-05-13T00:00:00.000Z",
  "context": {
    "source": "stdin",
    "repo": "owner/name",
    "prNumber": 42,
    "title": "Fix race in cache.ts",
    "author": "octocat",
    "description": "The eviction loop drops the read lock too early.",
    "diff": "<unified diff>",
    "filesChanged": [{ "path": "src/cache.ts", "additions": 7, "deletions": 4 }],
    "additions": 7,
    "deletions": 4,
  },
  "decision": "request-changes",
  "reasoning": "The fix is correct but the test only covers the happy path...",
  "labels": ["concurrency", "tests-needed"],
}
```

`verdict export --format openai` reshapes each row into a three-message chat
sample (system instruction, user-as-PR-context, assistant-as-verdict) that
you can feed straight into `openai fine_tuning_jobs create`.

`--format hf` produces a flat JSONL that loads cleanly with
`datasets.load_dataset("json", data_files="reviews.jsonl")` and matches the
column conventions used in adjacent public datasets.

## Programmatic API

```ts
import { newRecord, summarizeDiff, appendRecord, readAllRecords, exportRecords } from "verdict";

const summary = summarizeDiff(unifiedDiff);
const record = newRecord(
  "abc123",
  new Date().toISOString(),
  {
    /* PullRequestContext */
  },
  "merge",
  "Looks good — covered by the new integration test.",
  ["docs"],
);
appendRecord(record);

const dataset = exportRecords(readAllRecords(), "openai");
```

## What's NOT in v1

- `gh` integration (`verdict import-gh <pr-url>`) — the diff parser and
  record format are the substrate; pulling from a GitHub PR is a clean
  follow-on once a maintainer signs up to test.
- Cloud sync (the $10/mo tier in the business case).
- The data co-op endpoint + revenue-share logic.
- Web UI.

These are _deliberately_ deferred. The pre-conditions before this is sellable
as a co-op are in `docs/business-case.md`.

## License

MIT
