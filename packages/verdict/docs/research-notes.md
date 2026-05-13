# Research notes — `verdict` next-steps deep-dive

This file is the live working document for figuring out the highest-
compound-leverage next step for `verdict`. It records the hypothesis tree,
prior and posterior confidence for each hypothesis, the calibration delta
between them, and the decision-framework reasoning that produced the
chosen next step.

## Method recap

1. Hypothesis tree below with **prior** confidence before research.
2. Six parallel research agents, primary-source-first, explicit search-
   bias-removal instructions, expert-vs-populariser test.
3. Code-side audit run in parallel.
4. **Posterior** confidence written next to each hypothesis after evidence
   landed. Calibration delta preserved.
5. Decision frameworks: first-principles, second-order, inversion,
   pre-mortem.
6. **Compound engineering** — preferred steps fix foundations so future
   steps are cheaper, or de-risk adjacent moves.

## Hypothesis tree — prior vs. posterior

| ID  | Hypothesis                                                                                                                | Prior | Posterior | Δ         | Notes                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ----- | --------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Solo OSS maintainers feel real, surveyed pain with PR triage volume in 2026.                                              | 0.60  | **0.85**  | +0.25     | Jazzband shutdown (Mar 2026, 84 projects), curl bug-bounty closed Jan 2026, Hashimoto + Ruiz zero-tolerance AI policies.                          |
| H1a | AI-generated drive-by PRs are a frequent named topic on maintainer forums.                                                | 0.60  | **0.90**  | +0.30     | Direct first-person testimony from Stenberg, Hashimoto, Ruiz, Valsorda.                                                                           |
| H1b | There is a tool gap: existing GitHub-side and SaaS tools don't solve it.                                                  | 0.50  | **0.80**  | +0.30     | Maintainers are escaping into _policy_ (AI_POLICY.md files), not tooling — implicit confession the tool gap is real.                              |
| H1c | A meaningful fraction of maintainers would install a local CLI to help.                                                   | 0.40  | **0.50**  | +0.10     | Counter-evidence: Stan Lo says AI made maintenance "a bit more fun"; not all maintainers are looking for a tool answer.                           |
| H2  | AI labs / code-tool vendors will pay for maintainer-reasoning data.                                                       | 0.40  | **0.50**  | +0.10     | Hamel Husain has primary-source-written that maintainer-review data is the next eval frontier; price discovery still TBD.                         |
| H2a | Current public code-review fine-tuning datasets lack reasoning labels.                                                    | 0.70  | **0.85**  | +0.15     | Confirmed: MelcotCR limitations: _"comments mostly describe issues but do not articulate the full analytical reasoning."_                         |
| H2b | Labs / code-tool vendors have publicly stated they want this shape of data.                                               | 0.20  | **0.30**  | +0.10     | Indirect: vendor "no feedback loop" admissions; Cloudflare "AI code review at scale" verification-gap framing.                                    |
| H2c | The realistic per-row price would clear $0.50 at scale.                                                                   | 0.30  | **0.30**  | 0         | No primary price discovery; comparable items (Surge $20–$1000/hr; Civitai mean payout $226/mo) cluster but don't pin.                             |
| H3  | A Brave-Search-style data co-op model is feasible for solo-dev workflow data.                                             | 0.30  | **0.60**  | +0.30     | **Major update.** ASCAP/BMI is the right model, not Brave. Civitai proves the C-corp variant pays at micro-scale.                                 |
| H3a | At least one closely-comparable co-op has reached economic break-even.                                                    | 0.40  | **0.75**  | +0.35     | Civitai's first cycle (2025) had real USD payouts; ASCAP at >$1.5B/yr scale is the gold standard.                                                 |
| H3b | The legal/contributor-licence framework is workable in 2026.                                                              | 0.40  | **0.50**  | +0.10     | **Substantive risk surfaced:** diff content inherits upstream repo licence (GPL/AGPL toxic for commercial training).                              |
| H3c | Indie devs would actually opt in given trust dynamics.                                                                    | 0.30  | **0.40**  | +0.10     | The Stack opt-out-only regime was legally defensible but reputationally toxic. ASCAP-style co-op governance survives.                             |
| H4  | Diff + decision + reasoning is the right minimum data unit (vs. comment-level, hunk-level, multi-PR, or threaded review). | 0.50  | **0.30**  | **-0.20** | **Wrong direction.** SOTA limitations converge on per-hunk anchored comments + severity grading + analytical CoT.                                 |
| H4a | Published research confirms this unit is what's most under-supplied.                                                      | 0.40  | **0.20**  | -0.20     | Falsified: ContextCRBench / SWE-PRBench / CodeFuse-CR-Bench all point at hunk/line-level scope, not PR-level prose.                               |
| H4b | Hunk-level or comment-level annotations would be more valuable.                                                           | 0.30  | **0.75**  | +0.45     | **Confirmed strongly.** Multiple 2025–2026 papers explicitly call for this granularity.                                                           |
| H5  | No existing competitor ships exactly this shape (local-first JSONL of maintainer verdicts with reasoning).                | 0.60  | **0.85**  | +0.25     | Confirmed at 8.5/10 by Agent B. Closest adjacent is **Lore** (arXiv 2603.15566) for commit-author trailers — ~6 months from a PR-side adaptation. |
| H5a | CodeRabbit / Greptile / Sourcegraph do the opposite (AI generates review; human is passenger).                            | 0.70  | **0.95**  | +0.25     | Dominant pattern across all surveyed competitors. CodeRabbit explicitly says learned preferences "cannot be exported."                            |
| H5b | GitHub's own primitives can't capture structured reasoning without an extension.                                          | 0.60  | **0.90**  | +0.30     | Copilot Code Review docs explicitly concede "no feedback loop that adapts to your team's preferences."                                            |
| H5c | A purely OSS / hobby competitor already exists at the JSONL-of-verdicts shape.                                            | 0.30  | **0.10**  | -0.20     | Searched thoroughly; treliq and Elifterminal/pr-triage are both AI-as-reviewer, not human-as-reviewer.                                            |

**Calibration summary.** I was systematically under-confident on H1, H3, H5
(real-world pain, co-op feasibility, competitive vacuum) and **wrong about
H4 (the data unit)**. Calibration takeaway: I underweighted primary-source
maintainer testimony and overweighted my own intuition about the data
shape. Next time: bias toward primary surveys earlier in the pivot cycle.

## Unknown unknowns surfaced

| ID  | Surfaced unknown                                                                                                                                                                                                                                                          | By agent | Acted on?                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| U1  | **DCO / copyright provenance is broken for AI-touched patches.** QEMU says contributors can't credibly assert DCO compliance on AI patches; Gentoo bans NLP-assisted contributions; Linux mandates `Co-developed-by:`. No tool addresses this attestation problem.        | A        | Yes — adds `provenance.aiAssisted` and `provenance.dcoVerified` fields. |
| U2  | **OpenReviewer schema** (peer-review template: strengths / weaknesses / soundness / presentation / contribution / confidence + rebuttal trace) is the structurally richer template that code review hasn't copied. (Re2 — arXiv 2505.07920; OpenReviewer — 2412.11948.)   | C        | Yes — adopts per-comment severity grading.                              |
| U3  | **ASCAP/BMI performance-rights model** is structurally identical to a solo-dev data co-op (many small creators, many institutional licensees, blanket licence, usage-weighted distribution, ~10% overhead, statutory backing). Civitai proves the C-corp adaptation pays. | D        | Recorded in business-case; legal-entity choice deferred.                |
| U4  | **Diff content inherits upstream repo licence** (USCO 2025: maintainer reasoning is _separately_ copyrightable). Storing diffs inline poisons the chain; storing by reference (URL+SHA) cleans it. Andersen v. Stability AI induced-infringement theory still live.       | E        | Yes — adds `headSha`, `baseSha`, `upstreamLicense` fields.              |
| U5  | **Clinical-research broad-consent templates** (45 CFR §46.116(d)) are the unmet legal infrastructure for opt-in user-contributed training data.                                                                                                                           | E        | Recorded; deferred to L3 governance.                                    |
| U6  | **Roberto Di Cosmo (Software Heritage)** is the under-cited expert on code-as-training-data from a public-infrastructure stance.                                                                                                                                          | F        | Recorded; potential outreach.                                           |
| U7  | **Drew DeVault** would push back hardest — argues any AI-trained-on-OSS is net-extractive regardless of tooling. Steelman to address in business-case.                                                                                                                    | F        | Recorded; business-case bear-case already names him.                    |

## Code-side audit (parallel pass while agents ran)

| Severity | Issue                                                                                                                                                                                                  | Fixable now?                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| **High** | C1 — When stdin carries the diff (the natural `gh pr diff 42 \| verdict record` flow), interactive prompts on stdin are unreachable. Workaround works (all flags) but the natural pipe path is broken. | Yes (defer; out of scope for v1.1) |
| Med      | M1 — Binary-file diffs (`Binary files a/x and b/x differ`) produce no file entry.                                                                                                                      | Yes                                |
| Med      | M2 — Pure-rename diffs (no `+++`/`---` headers) produce no file entry.                                                                                                                                 | Yes                                |
| Med      | M3 — Concurrent `verdict record` may interleave records on >4 KB writes (Linux `PIPE_BUF` atomicity boundary).                                                                                         | Yes                                |
| Med      | M4 — Crash on JSON.parse if any line is corrupted. No recovery.                                                                                                                                        | Yes                                |
| Med      | M5 — Empty title/reasoning silently accepted; data quality risk.                                                                                                                                       | Yes                                |
| Med      | M6 — SCHEMA_VERSION exists but no migration logic reads it. Future schema changes will be painful.                                                                                                     | **Now.**                           |
| Low      | L1 — `--store` doesn't expand `~`.                                                                                                                                                                     | Yes                                |
| Low      | L2 — No delete/edit for records.                                                                                                                                                                       | Yes                                |

The combination of **M6 (no schema migration)** and **U1/U2/U4 (schema is
wrong shape)** is the single highest-compound lever: the next step has to
extend the schema AND introduce migration logic in the same change, or
every future schema change pays double.

## Decision-framework reasoning

**First principles.** The smallest deliverable that proves H2 (someone
pays) requires the data shape to be _what they actually want_. Agent C
proved the current shape isn't it. **No downstream investment makes sense
before the schema is fixed.**

**Second order.** If we ship a richer schema now: future steps (X1 `gh`
integration, X2 fine-tune demo, X10 maintainer interviews) all build on
the correct unit. If we don't: every future step has to be reworked.

**Inversion / pre-mortem.** Twelve months from now, the most likely
failure mode is: "We had a real product but the data was the wrong shape
to sell." Schema enhancement defuses that.

**Convergence test.** Agents A, C, D, E all independently flag schema-
adjacent issues (provenance, per-comment severity, co-op governance, by-
reference storage). The schema is the area of highest cross-agent agreement.

## Candidate next steps — ranked after evidence

| ID      | Step                                                                                                                                                                  | Cost | Compound            | Reversibility | Pick?                |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------- | ------------- | -------------------- |
| **X14** | **Schema v2 — per-comment severity, provenance attestation (DCO + AI-assist), diff-by-reference fields, upstream-licence capture, with read-time migration from v1.** | mid  | **VERY HIGH**       | reversible    | ✅                   |
| X1      | `gh` integration (`verdict pull <pr-url>` to fetch diff via `gh pr view --json`)                                                                                      | low  | medium              | trivial       | defer                |
| X2      | Live OpenAI fine-tune of an example archive → public artefact                                                                                                         | mid  | high                | trivial       | depends on X14       |
| X5      | Per-hunk verdict granularity                                                                                                                                          | mid  | **subsumed by X14** | medium        | done in X14          |
| X10     | Maintainer-interview kit                                                                                                                                              | low  | high                | trivial       | next                 |
| X12     | "We trained a personal review-assistant on N maintainer X's verdicts" public post                                                                                     | high | very high           | trivial       | depends on X14 + X10 |
| X13     | ASCAP/BMI-style governance design doc for L3                                                                                                                          | low  | high                | trivial       | parallel             |

**Decision.** Pick **X14 (schema v2)**. It's the single move that all the
research and the code audit converge on. Every other candidate either
depends on it (X2, X5, X12) or is independent and cheaper (X1, X10, X13).

## Resolved questions log

| Q                                                               | A                                                                                                                                                            | Source                                                            | Conf |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ---- |
| Is the maintainer-pain hypothesis structurally documented?      | Yes — Jazzband sunset Mar 2026 plus 4 named maintainer policy responses.                                                                                     | jazzband.co/news/2026/03/14, daniel.haxx.se, ghostty AI_POLICY.md | 0.85 |
| Is verdict's exact shape uncontested?                           | Yes; closest adjacent is Lore (commit trailers, arXiv 2603.15566).                                                                                           | Agent B table                                                     | 0.85 |
| Is PR-level prose the right data unit?                          | **No** — hunk-anchored + severity is what SOTA papers' limitations sections want.                                                                            | MelcotCR, ContextCRBench, SWE-PRBench                             | 0.75 |
| Is the data co-op model feasible?                               | Yes for the L1 personal-fine-tune tier; materially risky for L3 without (a) licence-filtered ingest, (b) work-for-hire contributor MSA, (c) Art. 53 tooling. | Agent E                                                           | 0.55 |
| Who is the strongest primary-source voice on this intersection? | Filippo Valsorda (Professional Maintainer model; primary writing on uncompensated training data).                                                            | filippo.io/professional-maintainer                                | 0.85 |
| Who is the strongest critic?                                    | Drew DeVault — argues AI-trained-on-OSS is net-extractive regardless of tooling.                                                                             | drewdevault.com                                                   | 0.80 |

## Predicted-finding calibration (written before agents returned)

| Prediction                                                                                    | Pre-conf | Actual outcome                                                                                      | Hit?             |
| --------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- | ---------------- |
| Maintainer AI-PR-spam pain is a documented 2024–2026 trend with at least 3 named maintainers. | 0.75     | Confirmed; 4+ named maintainers.                                                                    | Hit              |
| AI-PR-spam is the single most-cited maintainer workflow problem.                              | 0.35     | Contested; counter-evidence from Stan Lo.                                                           | Partial          |
| A direct competitor exists at a shape close enough that we're me-too.                         | 0.20     | No direct competitor.                                                                               | Miss (correct)   |
| A competitor captures **reasoning** explicitly in a portable maintainer-owned format.         | 0.15     | No.                                                                                                 | Miss (correct)   |
| Code-review datasets contain reasoning at _thread-level_ rather than verdict-level.           | 0.55     | Wrong direction — reasoning is _missing_ across all granularities; hunk-anchored is the supply gap. | Miss             |
| The supply gap is at **comment-/hunk-level**, not PR-level.                                   | 0.45     | Confirmed.                                                                                          | Hit              |
| A successful contributor-paid data co-op precedent exists outside Brave.                      | 0.30     | Civitai exists at micro-scale; ASCAP at huge non-tech scale.                                        | Hit (under-conf) |
| A named legal precedent meaningfully constrains verdict's L3 supply.                          | 0.45     | Yes — diff inherits upstream repo licence; Andersen still live.                                     | Hit              |
| Copilot lawsuit (Doe v. GitHub) specifically affects what verdict can publish.                | 0.55     | Partial — DMCA claims dismissed, licence/contract claims survive.                                   | Hit (refined)    |
| At least one named expert at the (maintainer)×(AI-data)×(solo-dev) intersection.              | 0.70     | Yes — Filippo Valsorda fits perfectly.                                                              | Hit              |

**Calibration grade:** I was reasonably calibrated on competitive
landscape and legal items, **under-confident on data-co-op precedents and
the existence of a perfect-fit expert**, **and wrong on the data-unit
question** (predicted thread-level was the supply gap; reality is
hunk-anchored).
