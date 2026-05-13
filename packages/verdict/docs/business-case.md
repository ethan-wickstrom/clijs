# Business case

A plan that survives the constraints "solo / indie / hobbyist audience" and
"capitalise on training data," plus a brutal internal bear case. Read both
before deciding to build any further.

## The economic shape

Three revenue layers stacked on a free, useful CLI.

```
┌────────────────────────────────────────────────────────┐
│  L3: Data co-op license  →  $50k–$500k/yr per buyer    │
│      Subscriptions from labs / training-data vendors   │
│      for access to the curated, opt-in verdict stream. │
├────────────────────────────────────────────────────────┤
│  L2: Cloud sync           →  $10/mo                    │
│      Optional backed-up archive, web view, search.     │
│      Captures ~3–5% of free users.                     │
├────────────────────────────────────────────────────────┤
│  L1: Free local CLI       →  $0                        │
│      Always free. Local-first. Real workflow utility   │
│      with no upsell pressure inside the tool.          │
└────────────────────────────────────────────────────────┘
```

A first-pass model at three scale points (deliberately conservative):

| Scale           | Free users | L2 ($10/mo) | L2 ARR | L3 buyers | L3 contributors | L3 ARR | Total ARR |
| --------------- | ---------- | ----------- | ------ | --------- | --------------- | ------ | --------- |
| Year 1 traction | 1,500      | 30          | $3.6k  | 0         | 0               | 0      | $3.6k     |
| Year 2 wedge    | 12,000     | 400         | $48k   | 1         | 800             | $60k   | $108k     |
| Year 3 co-op    | 40,000     | 1,600       | $192k  | 3         | 4,000           | $360k  | $552k     |
| Year 5 mature   | 120,000    | 5,400       | $648k  | 6         | 18,000          | $1.4M  | $2.05M    |

This is a one-to-three-person-team business, not a venture-scale one. That's
exactly what the constraints allow.

## Who pays at each layer

**L1 (free).** No payer. This is the wedge. The user value has to be real on
its own (workflow + private fine-tuning data) or the whole stack collapses.

**L2 ($10/mo cloud sync).** Same person who pays for Raycast Pro,
Tailscale, Linear, Cursor. Buys based on personal utility: searchable
archive of their reviewing decisions, web view, multi-machine sync.

**L3 (data co-op licence).** Three buyer archetypes, in increasing
willingness-to-pay order:

1. **Mid-tier model developers** — Mistral, Cohere, smaller foundation
   teams, fine-tuning shops, Hugging Face hosted-training. They have AI eval
   budgets but no internal Mercor-scale labelling pipeline.
2. **Code-tool vendors building review assistants** — Sourcegraph,
   CodeRabbit, Greptile, Continue.dev, Tabnine. They are explicitly
   training models to mimic maintainer review behaviour and they tell their
   investors so.
3. **Frontier labs through their alignment / fine-tuning teams.** Hardest
   sale, biggest cheque. Not a year-1 target.

## What we sell at L3

A continuously-refreshed JSONL stream of opt-in maintainer verdicts:

- Real diffs from real OSS PRs (with author consent or owner-of-repo
  authority).
- The maintainer's structured _merge / request-changes / close_.
- The maintainer's free-text _reasoning_.
- Free-text _labels_.

Licensing format borrowed from LMSYS Chatbot Arena: prompts/diffs **CC-BY 4.0**,
maintainer reasoning **CC-BY-NC 4.0**, commercial use requires the licence.
Contributors split L3 revenue per their share of accepted records, paid
quarterly via Stripe Connect. (Same shape that Brave Search uses for its
opt-in search-result-cards revenue.)

## Pricing for L3

Initial guesses, to be validated:

| Tier                     | Annual         | Includes                                                                  |
| ------------------------ | -------------- | ------------------------------------------------------------------------- |
| Indie / academic         | $5k–10k        | Quarterly snapshot, non-commercial use, watermark.                        |
| Mid-tier model team      | $50k–100k      | Monthly snapshot, commercial training rights, custom column requests.     |
| Frontier lab / strategic | $200k+ bespoke | Streaming feed, named contributor consent, custom filtering, support SLA. |

Comparison: Scale AI's per-item rates put a 5k-row labelled dataset of this
quality at roughly $50k–$150k of contractor hours. We're cheaper because
the contributors were doing the work anyway and the marginal labour cost is
near zero.

## Why this might not work

This is the bear case. It is real.

1. **The L1 product has to be genuinely useful for its own sake.** If
   maintainers feel the tool is a thin wrapper around a data-harvest
   scheme, none of L2 or L3 happens. The bar is: an opinionated maintainer
   would install this even if no data ever left their machine. (We
   believe v1 clears this bar, but it's not proven until a real
   maintainer tells us so.)
2. **Privacy / IP concerns kill the upside.** Diffs from private repos
   are off-limits. The legitimate supply is public OSS PRs where the
   maintainer is the project's owner. That's a smaller addressable
   contributor pool — _active solo OSS maintainers_ are a real demographic
   but it's thousands, not millions. The maths in the table above assumes
   we capture a meaningful slice of the active long tail.
3. **Cold-start at L3 is the hardest problem.** We don't have a lab
   relationship and don't ship without one. Cleanest path: open-source
   the entire L1 + L2 product, accumulate a public-leaderboard-style data
   sample (CC-BY, sample-of-100 rows publicly downloadable as a teaser),
   and let an inbound lab buyer come to us. If none does in 18 months,
   we are wrong about the supply gap and we abandon L3.
4. **Existing data vendors will copy this if it works.** Mercor or Surge
   could spin up "maintainer verdict capture" as a side project. Our
   defensibility is the _community_ (contributors choose us because of the
   co-op revenue share and the open-source ethos), not the technology.
   That's a real moat but a slow one to build.
5. **AI tools already capturing this signal.** GitHub Copilot Workspace,
   CodeRabbit, Greptile, Sourcegraph all already see incoming PRs and
   maintainer responses. They have the platform position; we have the
   _reasoning_ depth they don't capture. If they pivot to capture the
   reasoning too, we lose.
6. **Indie devs are notoriously sceptical of "we'll pay you for your data"
   pitches.** The history of these schemes is mostly bad — Wayward (closed),
   IBM's open dataset (controversial scraping), GitHub Copilot's training
   on OSS without consent (litigation). Trust is the hardest currency to
   earn; the co-op model + open-source code + transparent revenue share
   is the credible pitch, but it has to be lived, not claimed.

## Pre-conditions before any commercial step

- [ ] Three named solo OSS maintainers have used `verdict record` on their
      own PRs for at least two weeks and given thumbs-up on the workflow
      value.
- [ ] An OpenAI fine-tuning job has been run against a `--format openai`
      export from a real maintainer's archive (50+ rows) and the resulting
      model demonstrably reviews like the maintainer on held-out diffs.
- [ ] A clear, lawyer-reviewed contributor licence agreement is drafted
      and posted publicly.
- [ ] One pilot conversation with one mid-tier model team or code-tool
      vendor about what they'd pay for the dataset.

Order matters: the workflow value comes first; the fine-tuning
demonstration second; the co-op contract third; the L3 sale last.

## Recommended next move (not in this package)

Two weeks of dogfooding on three real maintainers' inboxes. Either they
say "yes, this is in my workflow now, here's what's broken" — and the
roadmap writes itself — or they say "I closed it after two days because
typing reasoning is annoying" — and we know we need a UX shortcut before
anything else.

After that, before any L3 sale, we run _one_ fine-tuning job and write a
public blog post titled "we fine-tuned an OpenAI model to review like
maintainer X using 200 of their verdicts." That is the marketing artefact
that creates inbound interest from buyers. If we cannot produce that
artefact, the thesis is wrong and we abandon.
