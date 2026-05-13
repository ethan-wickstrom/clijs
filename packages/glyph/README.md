# `glyph`

A daily 5-letter terminal puzzle for people who live in their shell.

One puzzle per day. Six guesses. Type a word, see which letters are in the right
spot, in the wrong spot, or absent. Streak persists in `~/.glyph/state.json`.

```sh
npx glyph
```

## Usage

```
glyph             play today's puzzle
glyph --demo      play a random off-the-record game
glyph --stats     show your streak
glyph --help      show this message
```

## How it works

The day's word is picked deterministically from the bundled word list using the
current UTC date, so every player sees the same puzzle on the same day. There's
no server, no account, no login — the streak is local to your machine.

Letter feedback follows the standard 5-letter scoring rules: hits (right letter,
right spot) take precedence over nears (right letter, wrong spot), and a guessed
letter is only counted as near up to the number of times it appears in the
answer.

## Programmatic API

```ts
import { newGame, submitGuess, dailySeed, renderBoard } from "glyph";

const seed = dailySeed();
const result = submitGuess(newGame(seed.word), "react");
if (result.ok) console.log(renderBoard(result.state, { color: false }));
```

## License

MIT
