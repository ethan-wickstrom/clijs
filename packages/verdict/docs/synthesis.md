# Synthesis — why we landed on verdict

This document is the reasoning trail. Three earlier products in this branch
(`glyph`, a Wordle clone; `golf`, a daily code-golf puzzle; and `tabletop`,
AI-driven cybersecurity exercises for enterprise CISOs) were each killed by
direct critique. The fourth attempt is `verdict`, and the constraints that
produced it were tightened in two passes.

## Constraint passes

**Pass 1.** "Plan to burn through seven figures with a not-great chance of
making it back." Built `glyph` (Wordle clone). User rejected: _"No one would
pay for that."_

**Pass 2.** "What if the end-user of the game is not the payer? Data
indirectly results in revenue elsewhere." Built `golf` (code-golf puzzle),
then pivoted to `tabletop` (cybersecurity tabletop exercises for regulated
mid-market firms) after nine parallel research agents killed the eval-game
thesis.

**Pass 3 (the binding one).**

> _We need something stronger and for a solo-developer / indie-developer /
> hobbyist developer end-user audience. Focus on also capitalizing on
> generating data for training / optimizing AI on specific tasks relevant to
> the end-user._

This changed the audience entirely. `tabletop` targeted enterprise CISOs
with regulatory budgets — the polar opposite of a solo dev. The thesis
behind `tabletop` was sound for that audience; it was wrong for this one.

## What "solo dev + data-as-value" forces

The constraint forces three observations:

1. **Per-user revenue is bounded.** Solo devs spend $300–$1k/yr on tools.
   The realistic direct-subscription tier is $10–$30/mo. That caps a SaaS to
   roughly $300k–$1M ARR per 10k engaged users.
2. **Volume of users + adjacent revenue is the only path** to economics
   bigger than "lifestyle." Adjacent revenue means a _different industry
   pays for what the users produce_. The Brave-Search model.
3. **The relevant adjacent industry is the AI training-data market.** Surge
   AI $1.2B ARR. Mercor raised $400M at a $9B valuation in Q2 2025. Scale
   went 49% Meta-owned ($14.8B, June 2025) primarily for trace data. Cognition
   paid $1M of real bounties to assemble one (1) freelance-SWE eval set
   ([SWE-Lancer](https://arxiv.org/abs/2502.12115)). The supply gap is real;
   the willingness to pay is documented; the per-item rates support a
   contributor pool of solo devs.

## What the data has to look like to be defensible

From the nine prior research agents and from the public statements of
frontier labs:

- **AI-generated benchmarks are now SOTA research** (Self-Play Critic,
  Self-Play SWE-RL, Constitutional Classifiers). Marginal cost of a fresh
  AI-generated eval item approaches zero. _Anything a model can produce
  cheaply, labs will not pay outsiders for._
- **Real human decisions on real code stay valuable**, because they encode
  taste, project conventions, and judgment that aren't in the training set.
  Specifically:
  - _Mergeable / not-mergeable_ labels at scale (already plentiful from
    GitHub scraping; commodity).
  - **Reasoning behind those labels** (rare; not easily recoverable from
    public data; what `verdict` captures).
- **Continuous fresh supply** beats one-shot benchmarks. Benchmarks
  saturate in roughly 12 months; the maintainer review stream never does,
  because every new PR is a new datum.

## What survived from the killed theses

- **`glyph`'s engine substrate** (TS monorepo, vite-plus, scenario-style
  state machines) is reusable. Kept as scaffolding.
- **`golf`'s judge architecture** (worker threads, verifier-style
  execution) is unused here but could come back if `verdict` ever spawns a
  test-runner companion.
- **`tabletop`'s audit-evidence-as-deliverable insight** carries over: the
  exported `verdict` dataset _is_ what the maintainer hands to a fine-tuning
  service. The deliverable is the audit trail of their decisions.

## What `verdict` is

A small CLI:

1. The maintainer points it at a unified diff (stdin, file, or — in v2 —
   `gh pr diff`).
2. They are prompted for _title, decision, reasoning, labels_. Diff metadata
   (files changed, additions, deletions) is parsed automatically.
3. The record is appended to a single JSONL file at `~/.verdict/records.jsonl`.
4. `verdict export --format openai|hf|jsonl` packages the records into a
   training-data format that's compatible with mainstream fine-tuning APIs.

Local-first. Zero runtime dependencies. The maintainer's data never leaves
their disk unless they choose to upload it.

## Why this beats the obvious alternatives

| Alternative considered                                                      | Why we picked verdict instead                                                                                                                 |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent benchmark arena** (multi-agent on solo dev's real bugs)             | Creates new behaviour; high friction. `verdict` extends an existing daily activity (reading PRs), so adoption cost is near zero.              |
| **Solo-dev code-trace co-op** (Brave for IDE recording)                     | OS-level recording is privacy-fraught and loses the target audience. `verdict` records a single artefact per decision, with explicit consent. |
| **`prentice`-style case-attempt logging** (AI tries dev's case, dev grades) | Generates richer trace data but depends on agents being good enough to use, which is the moving target. Maintainer triage works today.        |
| **Triage-as-a-service to OSS projects**                                     | Removes the maintainer; loses the high-signal reasoning. The whole value here is _their_ taste.                                               |

## What the v1 in this package is and is not

It **is**:

- A working CLI: `init / record / list / show / export`.
- Unified-diff parser that extracts files-changed and add/del counts.
- JSONL store at `~/.verdict/records.jsonl`.
- Three export formats: raw JSONL, HuggingFace-flat, OpenAI-chat.
- Two example diffs (a one-line typo fix; a risky 80-line rewrite) so
  reviewers of this PR can try it themselves.
- Unit tests for the diff parser, the JSONL store, the three export
  formats, and the record-type guards.

It is **not**:

- A finished product. `gh` integration, cloud sync, the data-co-op
  endpoint, and the revenue-share contract are deferred — they are listed
  with pre-conditions in `business-case.md`.
- A claim of product-market fit. It is the smallest concrete artefact
  that demonstrates the _data shape_ and the _workflow value_, sufficient
  to take to a real solo OSS maintainer for feedback.

## Sources

- Surge AI revenue: Sacra, West Operators.
- Scale + Meta deal: Wikipedia, BusinessWire June 2025.
- Cognition SWE-Lancer: <https://arxiv.org/abs/2502.12115>.
- Self-Play SWE-RL: arXiv 2512.18552 (Dec 2025).
- Constitutional Classifiers: Anthropic Research 2025.
- Mercor valuation: TechCrunch, Q2 2025 round announcement.

The full 9-agent transcripts that informed the prior pivots are referenced
in the earlier (now-deleted) `tabletop` package's synthesis doc; this file
inherits and updates that reasoning.
