# `inversion`

A Wordle-shaped game where the LLM is the objective function: you see the
**output**, you guess the **prompt**. Your guess is run live against the
same model. Similarity between the two outputs is your score.

```sh
inversion tutorial          # one practice round with an intro (no streak)
inversion play              # today's puzzle (one per UTC day)
inversion practice <id>     # any past puzzle, doesn't affect streak
inversion stats             # streak + win rate
inversion list              # show bundled + user-seeded puzzles
inversion seed --prompt "…" # author a new puzzle from a live claude call
inversion --help
```

## The mechanic, end-to-end

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   puzzle's hidden prompt → claude → cached output (shown to you) │
│                                                                  │
│   you read the output. You write a guess at the prompt.          │
│                                                                  │
│   your guess →─ claude (live, BYOK) ─→ your-output               │
│                                                                  │
│   similarity(your-output, cached-output) → score                 │
│                                                                  │
│   ≥ threshold → solved. else: 6 guesses total.                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

The point of the game is not to recover the _exact_ prompt — many prompts
produce similar outputs. The point is **theory of mind for an LLM**: write
a prompt that _would have_ produced this output.

## Truly novel

No public game today places an LLM _as the objective function_. Prompt-
engineering competitions (PromptBattle, cgpt-golf) score you on whether a
human grader thinks your prompt is clever. LMSYS Arena ranks models, not
players. Inversion is the first game where the LLM itself decides whether
your guess was right.

Adjacent precedents we deliberately borrow from:

- **Wordle / Connections** — daily ritual, six-guess affordance, streak.
- **Lichess Daily Puzzle** — drawn from real games, scored against the
  grandmaster's actual move.
- **NEJM Case Challenges** — predict the diagnosis from a real case, then
  the published answer is revealed.

## Audience

Developers who use `claude` / Cursor / Copilot daily as a craft. The skill
the game trains — writing a prompt that lands in a specific output
neighbourhood — is the same skill they already practise every working day.

## How scoring works

The scorer is **chrF** (Popović, WMT 2015) with `β=2` — a recall-weighted
multi-n character-n-gram F-score, the canonical lightweight metric for
short-text similarity without embeddings. n ranges 1 through 6. The
β-weighting rewards a player whose output covers the target's content
even if they produce extra material, which matches the "many prompts
land here" spirit of the game.

- `≥ 0.60` → **convergent** — you solved it.
- `0.40 – 0.59` → **warm** — same neighbourhood, wrong shade.
- `0.20 – 0.39` → **tepid** — adjacent topic, wrong format.
- `< 0.20` → **cold** — different territory entirely.

chrF is deterministic given the two outputs. The LLM call itself is
not — so the same guess can score slightly differently across runs.
That variance is the point of the game: there are many prompts that
land in the right neighbourhood, not one.

## Per-guess feedback

After every guess, in addition to the similarity score, you see a token
diff:

```
  their output:
    Sunlight finds the cup, steam curls through unhurried air,
    nowhere yet to be.

  ✓ shared: nowhere, steam
  + missed: sleep, alarm, coffee, golden, light, else
  − extra:  sunlight, finds, cup, curls, unhurried, air, yet
  similarity: 47%  warm  (match)
```

- `✓ shared` — tokens both outputs produced. These confirm what you
  got right.
- `+ missed` — tokens the target produced that yours didn't. These tell
  you what to aim for next.
- `− extra` — tokens yours produced that the target didn't. These tell
  you what to drop.

Common function words (the, a, of, …) are filtered from display only;
they still count toward the score. Lists are capped at 10 tokens.

## The share grid

On every completed playthrough, `inversion` emits a Wordle-style share
string that reveals nothing about the original prompt:

```
inversion · sat-haiku · 2026-05-13 · 4/6
⬛⬛🟧🟨🟩
```

🟩 convergent, 🟨 warm, 🟧 tepid, ⬛ cold. The id and date are public; the
prompt and outputs are not. Copy-paste anywhere.

## Requirements

- The local `claude` CLI is installed. Your guesses are sent through it,
  with `--tools ""` (no tool use) and a neutral system prompt so the
  call is a clean text-in / text-out.
- You pay Anthropic for your guess tokens (≈ $0.005/round at current
  Sonnet pricing). Inversion never sees your API credits.

## What ships today (v1)

Three bundled puzzles, each generated by a real `claude --print` call:

| id                     | model         | the cached output looks like                                 |
| ---------------------- | ------------- | ------------------------------------------------------------ |
| `sat-haiku`            | claude-sonnet | a haiku                                                      |
| `merge-kitchen`        | claude-sonnet | three sentences explaining merge sort with cooking metaphors |
| `five-unusual-hobbies` | claude-sonnet | five single-word hobbies, lowercase, one per line            |

The bundle is small _on purpose_. The honest product-market signal is "do
real players come back tomorrow?", and that depends on the _mechanic_
fitting, not the _bank_ being full. If players come back, growing the
bank is content work, not engineering.

## Economics (deferred to a real demand signal)

See `docs/economics.md` for the four-tier stack. v1 ships only L1 (free).
L2 ranked / L3 corporate / L4 data co-op are designs, not features —
they ship only when L1 produces engagement worth scaling.

## Programmatic API

```ts
import {
  BUNDLED_PUZZLES,
  chrfSimilarity,
  dailyPick,
  describe,
  diffOutputs,
  formatShareGrid,
  loadAllPuzzles,
  runClaude,
  writeUserPuzzle,
} from "inversion";

// today's puzzle, merging bundled and any user-seeded puzzles
const { puzzles } = loadAllPuzzles();
const pick = dailyPick(puzzles);

// a single guess
const { output } = await runClaude("a guess at the prompt");
const feedback = describe(output, pick!.puzzle.output);
console.log(feedback.similarity, feedback.bucket);

// raw metric + token diff
const raw = chrfSimilarity(output, pick!.puzzle.output);
const { shared, onlyInTarget, onlyInPlayer } = diffOutputs(output, pick!.puzzle.output);

// author a puzzle programmatically (live claude call done separately)
const seeded = writeUserPuzzle({
  id: "my-puzzle",
  prompt: "Write a limerick about debugging.",
  output: "There once was a coder named Sue...",
  model: "claude-sonnet",
});
```

## License

MIT
