# Synthesis — why we landed on tabletop

This document is the reasoning trail. Two earlier products in this repo
(`glyph`, a Wordle clone, and `golf`, a daily code-golf puzzle) were
critiqued and discarded. After both fell, nine parallel research agents were
spawned: five to validate a third candidate (a "competitive adversarial AI
eval" platform, "Thesis A"), two to attack it adversarially, and two to
scope two backup theses (B2B serious games, niche-vertical hiring platform).

This file summarises what they found, how the verdict was reached, and why
`tabletop` is the surviving direction.

## Theses considered

| Code | Thesis                                                                              | Outcome                                                        |
| ---- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| A    | Competitive adversarial-AI-eval game; sell curated eval stream to AI labs           | **Killed.**                                                    |
| P    | Serious games (game mechanics → professional training) sold to institutional buyers | **Reshaped — only the cybersecurity-tabletop niche survives.** |
| M    | Niche-vertical competitive-skill platform with employer-pays-to-hire                | **Killed.**                                                    |

## Thesis A — what killed it

Two adversarial agents independently converged on the same conclusion, and
the supporting agents reinforced it:

1. **Lab in-housing is structural.** Anthropic's Constitutional Classifiers
   describe automated red-teaming where one model attacks another in a
   self-play loop, scaling 1,700+ hours and 198,000 attempts. Self-Play SWE-RL
   (Dec 2025) and Self-Play Critic show frontier labs producing adversarial
   evals AI-on-AI. Marginal cost of a fresh adversarial item approaches zero
   inside the lab.
2. **The "third-party" market is grant-funded, not commercial.** METR
   explicitly does not accept compensation. Anthropic's third-party evals
   initiative is a _grant program_ (they fund evaluators, not the other
   way around). UK AISI / US CAISI run on government MoUs.
3. **Scale AI is now 49% Meta-owned** ($14.8B, June 2025). Disqualified
   from selling fresh evals to Anthropic / OpenAI / xAI. The one commercial
   precedent — _Humanity's Last Exam_ — was a one-shot $500k prize pool with
   the dataset given away under MIT.
4. **Adjacent commercial precedents pivoted away from selling evals.**
   Robust Intelligence acquihired by Cisco for $400M as a _guardrail_
   product, not eval content. Patronus, Galileo, Arize, WhyLabs all migrated
   from eval generation to observability/guardrails. The pattern, in
   Thomas Liao's words: _"Selling evals is an ops business with ops margins;
   selling tooling is SaaS."_
5. **Goodhart's law as a business model.** Each eval is worth less the
   moment it ships — Meta tested 27 Llama-4 variants against Chatbot Arena
   before release. Saturation windows for major benchmarks have compressed
   to roughly 12 months.
6. **Liao's killshot:** _"Research evals cannot be outsourced because they
   define research direction."_ Highest-paying customers are structurally
   non-buyers of the core product.

Taken together: the market is adversarially insourcing, the supply is
crowded with non-profit and government players, the precedent for
recurring commercial revenue does not exist, and the structural dynamics
favour insourcing over time. Killed.

## Thesis M — what killed it

- TripleByte: $135M post-money → $6.9M ARR → asset sale to Karat in 2023.
  The "verified-skill leaderboard that employers pay for" model is exactly
  the thesis that failed.
- Karat won the same vertical not by selling rankings but by selling
  _interview labour_: $300–$450/interview, $169M raised, $1.1B valuation —
  a different business shape entirely.
- Pattern across HackerOne, Numerai, Kaggle, Gray Swan: every successful
  vertical monetises the _work product_ (bugs, signal, predictions, jailbreak
  reports), not the ranking.
- No new entrant has cracked a verified-skill → hire two-sided market from
  a standing start in the last three years. Cold-start kills it.

## Thesis P — what survived

The serious-games agent showed the standalone-vendor outcomes are bad:

- Akili Interactive (the only pure-play prescription-game public company)
  delisted at $0.43/share after a SPAC debut near $9. Revenue $1.68M in 2023.
- Touch Surgery → Medtronic. Level Ex → Brainlab. Osmosis → Elsevier.
  Limbix → Big Health (distressed). Mursion at ~$15M and shrinking.
- Pattern: **B2B strategics win; standalone B2B2C dies.**

But one specific niche threaded the needle:

> **Cybersecurity tabletop exercises for mid-market regulated firms
> (community banks, regional hospital systems, defense subcontractors).**
> Annual regulatory mandate (NIST CSF, NYDFS-500, HIPAA, DORA) creates
> recurring spend with budget owner already identified (CISO). No FDA, no
> IRB, no clinical evidence. Sales cycle 60–120 days. ACV $25–75k.
> Repeatable. GenAI generates scenarios cheaply. Clear strategic acquirers
> (KnowBe4, Mandiant, Proofpoint, IBM Resilient).

This is the wedge. It survives every objection raised against the other
theses:

- **Defensibility:** scenario library that compounds + AI-driven
  customisation per customer + auto-mapping to MITRE ATT&CK / NIST CSF /
  NYDFS-500 controls. The auto-mapped report _is_ the audit deliverable —
  switching costs are high once an organisation has a year of these reports
  in their evidence binder.
- **Time-tested primitive:** decision-making under uncertainty in a
  structured scenario. Older than computers (military war games, business
  case method, US Cold War nuclear-strategy tabletops). Will outlive any
  specific AI cycle.
- **Regulatory urgency:** the CISO has a deadline; failure shows up in
  audit findings. This is the lever neither glyph, golf, nor the eval-game
  thesis had.
- **Creative economics:** the user is the SecOps analyst (free); the payer
  is the CISO (regulatory budget). Two-sided, but with the procurement
  side identified upfront.
- **Uses the existing repo substrate:** the worker-thread / scoring /
  TypeScript-CLI patterns from the previous attempts carry over, but
  pivoted to a buyer that actually has budget.

## What the v1 in this package is and is not

It **is**:

- A working CLI that loads a scenario, walks an interactive branching
  exercise, scores decisions, and emits an auditor-ready markdown report
  with control-coverage tables.
- One real, hand-authored scenario (a community-bank ransomware exercise
  modelled on NYDFS 500.17 notification timing).
- An optional `--narrator claude-cli` mode that re-narrates each scene via
  the local `claude` CLI for organisation-specific colour. The default
  scripted narrator runs without any AI dependency.
- 13 unit tests covering scenario loading, normalisation, scoring, level
  thresholds, and report generation.

It is **not**:

- A finished commercial product. The pitch in `business-case.md` lists the
  pre-conditions that would have to be true before the first paid pilot is
  sellable.
- A claim that we have product-market fit. It is the smallest concrete
  artifact that demonstrates the thesis well enough to take to a real
  prospective buyer.

## Sources

The 9 agent reports themselves are the underlying evidence. They cited
Anthropic's third-party evals initiative, Scale's Humanity's Last Exam,
UK AISI tenders, the Brainlab / Medtronic / Elsevier acquisitions of serious-
games studios, TripleByte's post-mortem, Karat's funding history, Robust
Intelligence's Cisco acquihire, Constitutional Classifiers, Self-Play SWE-RL,
and Liao's _eval-startups_ essay. Full URL list is in the agent transcripts
at the time of synthesis.
