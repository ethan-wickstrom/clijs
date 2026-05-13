# `verdict`

A local-first PR triage CLI for solo open-source maintainers. Every triage
decision you make becomes a structured, exportable training row — a diff
(or its commit references), your per-comment severity-graded feedback, your
verdict, your reasoning, and your provenance attestation about whether the
patch was AI-assisted. Use the resulting JSONL to fine-tune your own model,
or opt in to a shared data co-op.

```sh
git diff main...feature/branch | verdict record --title "Add cache eviction"
verdict list
verdict export --format openai --out reviews.jsonl
```

## Why this audience, why this shape

Solo OSS maintainers in 2026 already triage incoming PRs daily. The pain is
now **structurally documented** — the Jazzband Python collective (84 projects,
~93M monthly downloads) [shut down in March 2026](https://jazzband.co/news/2026/03/14/sunsetting-jazzband)
citing AI-PR overhead as an explicit cause; the curl bug bounty closed in
Jan 2026 because [slop reports "hamper the will to live"](https://daniel.haxx.se/blog/2024/01/02/the-i-in-llm-stands-for-intelligence/);
named maintainers (Stenberg, Hashimoto, Ruiz, Valsorda) have shipped
zero-tolerance AI policies.

The data shape solo devs _already produce_ — accept/reject decisions with
free-text reasoning — is what AI training-data pipelines are currently
_missing_. Code-review benchmark limitations sections (MelcotCR,
ContextCRBench, "Too Noisy to Learn") converge on the same supply gap:
**per-hunk anchored comments with severity grading and the reviewer's
analytical reasoning chain**, not just diff + binary label.

`verdict` captures that data as a clean byproduct of the maintainer's
existing workflow.

## Schema v2 — what's new versus v1

The on-disk record (`schemaVersion: 2`) extends v1 with three new
capability clusters; v1 records are migrated on read with safe defaults.

| Field                                 | Why                                                                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `comments: ReviewComment[]`           | Per-hunk anchored feedback with severity (`nit / discuss / requested-change / block`). Aligns with the SOTA dataset supply gap.                         |
| `provenance.aiAssisted`               | `none / partial / majority / unknown`. Closes the DCO gap that QEMU, Gentoo, and Linux all flagged for AI-touched patches.                              |
| `provenance.coDevelopedBy`            | List of `Co-developed-by:` git-trailer authors. Lets the maintainer record attribution explicitly.                                                      |
| `provenance.dcoVerified`              | Did the maintainer verify the contributor's DCO sign-off?                                                                                               |
| `context.headSha` / `context.baseSha` | Commit references. Lets future tooling reconstruct the diff without storing it inline (legal cleanliness for L3 redistribution).                        |
| `context.upstreamLicense`             | SPDX id of the upstream repo (e.g. `Apache-2.0`). Filters which records can flow into a commercial training-data co-op (MIT/Apache OK; GPL/AGPL toxic). |

See `docs/research-notes.md` for the primary-source reasoning behind every
one of these additions, including which research agent surfaced each
finding and the calibration delta on the prior hypotheses.

## Usage

```
verdict init                          create the local store (~/.verdict)
verdict record [options]              capture one PR triage decision
verdict list                          list captured verdicts
verdict show <id>                     show a single verdict
verdict export [--format <fmt>]       export the dataset for fine-tuning
verdict --help                        show this message
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
--head <sha>           head commit SHA
--base <sha>           base commit SHA
--license <spdx>       upstream repository licence (SPDX id)
--ai-assist <level>    none | partial | majority | unknown (default: unknown)
--co-dev-by <handle>   add a Co-developed-by attribution (repeatable)
--dco-verified         assert the contributor's DCO sign-off was verified
--comment <path:lines:sev:body>
                       add a per-comment review (repeatable).
                       lines is `12` or `12-15`; sev in
                       {nit, discuss, requested-change, block}.
--store <path>         override the store root (default: $HOME)
```

`export` options:

```
--format <fmt>         one of: jsonl (default) | hf | openai
--out <path>           write to file instead of stdout
--store <path>         override the store root (default: $HOME)
```

## The most common flow

```sh
# stdin (default). All metadata via flags because stdin is occupied by the diff.
gh pr diff 123 | verdict record \
  --repo owner/name \
  --pr 123 \
  --title "Fix race in cache.ts" \
  --author drive-by-contributor \
  --head abc123 \
  --base def456 \
  --license Apache-2.0 \
  --decision request-changes \
  --ai-assist majority \
  --comment "src/cache.ts:12-15:block:Lock released before consistent read finishes." \
  --comment "src/cache.ts:30:nit:Rename c to cache for clarity." \
  --reasoning "The fix is correct but the test only covers the happy path."

# file mode. stdin is free for the interactive prompts.
verdict record --diff /tmp/pr-123.diff --title "Fix race"
```

## Data shape

Each row in the on-disk store (`~/.verdict/records.jsonl`) at v2:

```jsonc
{
  "id": "abc123",
  "schemaVersion": 2,
  "recordedAt": "2026-05-13T00:00:00.000Z",
  "context": {
    "source": "stdin",
    "repo": "owner/name",
    "prNumber": 42,
    "title": "Fix race in cache.ts",
    "author": "octocat",
    "description": "...",
    "diff": "<unified diff>",
    "filesChanged": [{ "path": "src/cache.ts", "additions": 7, "deletions": 4 }],
    "additions": 7,
    "deletions": 4,
    "headSha": "abc123",
    "baseSha": "def456",
    "upstreamLicense": "Apache-2.0",
  },
  "decision": "request-changes",
  "reasoning": "The fix is correct but the test only covers the happy path...",
  "labels": ["concurrency", "tests-needed"],
  "comments": [
    {
      "filePath": "src/cache.ts",
      "lineStart": 12,
      "lineEnd": 15,
      "severity": "block",
      "body": "Lock released before consistent read finishes.",
    },
  ],
  "provenance": {
    "aiAssisted": "majority",
    "coDevelopedBy": [],
    "dcoVerified": true,
  },
}
```

`verdict export --format openai` reshapes each row into a three-message
chat sample (system instruction, user-as-PR-context, assistant-as-verdict
with **provenance, per-comment severity-graded feedback, and reasoning**)
that you can feed straight into `openai fine_tuning_jobs create`.

`--format hf` produces a flat JSONL that loads cleanly with
`datasets.load_dataset("json", data_files="reviews.jsonl")`.

## Migration

v1 records (older `schemaVersion: 1` or missing entirely) are migrated on
read with safe defaults:

```
comments              → []
provenance            → { aiAssisted: "unknown", coDevelopedBy: [], dcoVerified: false }
context.headSha       → null
context.baseSha       → null
context.upstreamLicense → null
```

The file on disk is **not rewritten**. New `record` invocations write v2;
old records keep their original bytes. `verdict list` shows a one-line
notice if any records were migrated on read (`(N records normalised from a
pre-v2 schema)`). Corrupted JSONL lines are skipped with a similar notice.

## Programmatic API

```ts
import {
  newRecord,
  summarizeDiff,
  appendRecord,
  readAll,
  exportRecords,
  parseCommentArg,
} from "verdict";

const summary = summarizeDiff(unifiedDiff);
const record = newRecord({
  id: "abc123",
  recordedAt: new Date().toISOString(),
  context: {
    /* PullRequestContext */
  },
  decision: "merge",
  reasoning: "Covered by the new integration test.",
  labels: ["docs"],
  comments: [parseCommentArg("README.md:6:nit:Tweak wording.")].filter(
    (comment) => comment !== null,
  ),
  provenance: { aiAssisted: "none", coDevelopedBy: [], dcoVerified: true },
});
appendRecord(record);

const result = readAll();
console.log(result.records.length, "records,", result.migratedFromV1, "migrated from v1");
const dataset = exportRecords(result.records, "openai");
```

## What's deliberately NOT in v2

- `gh` integration (`verdict pull <pr-url>` for one-shot import) — clean
  follow-on once a maintainer signs up to test.
- Cloud sync (the $10/mo L2 tier in `docs/business-case.md`).
- The data-co-op endpoint + revenue-share contract logic (L3).
- Web UI.
- Editor integration for multi-line reasoning.

The pre-conditions before any commercial step are in
`docs/business-case.md`. The full reasoning trail across four pivots in
this branch (`glyph` → `golf` → `tabletop` → `verdict v1` → `verdict v2`)
is in `docs/synthesis.md`. The deep-research artefact that produced the v2
schema is `docs/research-notes.md`.

## License

MIT
