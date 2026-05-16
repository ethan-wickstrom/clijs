# Inversion — economics

A four-tier stack on top of a free CLI. Every revenue layer is _deferred_:
it only ships when the layer below produces a demand signal sharp enough
to justify the build. Designs are first; commitments are last.

```
┌──────────────────────────────────────────────────────────────────┐
│  L4: data co-op licence       $50k–$500k/yr per buyer            │
│      Aggregated (output, [guess_1..N], original_prompt) triples; │
│      training data for *inverse-prompt* models. Players opt in.  │
├──────────────────────────────────────────────────────────────────┤
│  L3: corporate / team         $X/seat/yr                         │
│      Team leaderboards + private puzzle packs generated from     │
│      the team's own outputs (with consent).                      │
├──────────────────────────────────────────────────────────────────┤
│  L2: ranked                   $5/mo                              │
│      Private leaderboards, hard-mode archive, daily hints,       │
│      cross-device sync.                                          │
├──────────────────────────────────────────────────────────────────┤
│  L1: free CLI                 $0                                 │
│      One daily puzzle. Local history. BYOK for the live LLM      │
│      call — Anthropic gets the ~$0.005/round, platform sees $0.  │
└──────────────────────────────────────────────────────────────────┘
```

## Why each tier is plausible

**L1 free** — costs nothing to run because the player pays Anthropic
directly. No infra spend, no per-player marginal cost. Same shape as
Lichess (its core is donation-funded; the LLM equivalent is BYOK).

**L2 ranked** — same WTP profile as Lichess Patron / Chess.com Diamond /
Raycast Pro. The audience has demonstrated $5–$20/mo personal-utility
spending. We do _not_ assume conversion above 1–3 % of weekly-active
players, which is the documented ceiling for free-with-rank tiers.

**L3 corporate** — a team gets (a) a private leaderboard for "who in the
team has the sharpest theory-of-mind for the model we use," and (b) a
generator that turns the team's _actual_ outputs into puzzles. Use case:
onboarding a new engineer onto a team's prompt style. Pricing target:
$5–$20/seat/yr, on top of L2.

**L4 data co-op** — _(output, [guess_1..guess_N], original_prompt)_ is a
structurally rare data shape. Nobody is generating it at scale today.
Inverse-prompt models (output → likely prompts) are an obvious building
block for:

- prompt debugging tools ("why did the model write this?")
- model evaluation (does the model produce a stable output across
  paraphrases of the same prompt?)
- steganography defences (is this output recoverable to a prompt that
  encodes a hidden payload?)

Pricing target: $50k–$500k/yr per buyer (mid-tier model developers,
research labs, prompt-engineering tool vendors). Contributor revenue
share via Stripe Connect; contributors are paid per-accepted record.
**The L4 co-op exists only with explicit opt-in and a published licence
modelled on LMSYS Arena (CC-BY 4.0 for prompts, CC-BY-NC 4.0 for the
maintainer-derived inverse).**

## What's deliberately not in v1

- L2, L3, L4 are designs only. None of them ship until L1 retention
  data justifies them.
- Multiplayer features (live races, async tournaments).
- A puzzle-generator that lets players publish their own puzzles.
- A web frontend.

## Pre-conditions before any commercial step

- [ ] At least 100 weekly-active players on the L1 free CLI.
- [ ] Average return-on-day-7 ≥ 30 % (Wordle's documented retention bar
      for category-defining daily games is roughly this).
- [ ] At least three named players who would pay $5/mo if asked, with
      transcripts of the ask.
- [ ] A lawyer-reviewed contributor licence agreement for L4.

## Honest bear case

- **Three puzzles is not a product.** It is a mechanic-in-a-box. The
  honest L1 success bar is "does a player who solves the third puzzle
  show up tomorrow asking for a fourth?" If not, the mechanic is wrong,
  not the bank.
- **The skill ceiling may be too high or too low.** Either case kills
  retention. We do not know yet. v1 will tell us.
- **The cached-output drift problem.** As the bundled model evolves
  (Sonnet 4.6 → 4.7 → …), the cached output produced by an old prompt
  may diverge from the live output today's player gets. We pin the
  model id per puzzle for this reason; even so, the variance is real
  and may eventually require regenerating the bank against the current
  model.
- **An inverse-prompt model would devalue L4.** If frontier labs ship
  an inverse-prompt feature in 2026–2027 (plausible), the data co-op's
  ceiling drops. The bet is that _human-authored, opt-in, contributor-
  attributed_ data still has a premium over scraped equivalents — true
  for LAION-era datasets, true for ShareGPT, true for HumanEval.
