# `golf`

A daily code-golf puzzle for your terminal. Solve the problem in JavaScript,
make it correct, then shrink your byte count.

```sh
npx golf                       # today's puzzle
npx golf submit ./sol.js       # judge and score your solution
npx golf history               # your records
```

## How it works

Each day picks one puzzle deterministically from the bundled set (UTC date →
puzzle index). The puzzle shows:

- A prompt (what to compute).
- A signature (function shape, e.g. `(n: number) => string`).
- Three examples (visible — there are more hidden tests).

You write a JS or MJS file that **default-exports** a function with that
signature. `golf submit <file>` loads it in a worker thread, runs every test,
reports pass/fail diffs, and computes your byte count (file size with trailing
whitespace stripped). Your best byte count per puzzle is saved to
`~/.golf/state.json`.

A submission that hangs gets terminated after 5 seconds.

## Example

Today's puzzle is FizzBuzz. Write:

```js
// fizzbuzz.js
export default (n) =>
  n % 15 === 0 ? "FizzBuzz" : n % 3 === 0 ? "Fizz" : n % 5 === 0 ? "Buzz" : String(n);
```

Then:

```sh
$ golf submit ./fizzbuzz.js
10/10 tests passed  ·  73 bytes

✓ test 1
✓ test 2
...

first solve.
```

Now shrink it.

## Commands

```
golf                          show today's puzzle
golf submit <file>            judge a solution against today's puzzle
golf submit <file> -p <id>    judge against a specific puzzle
golf practice <id>            show a past puzzle (no scoring)
golf list                     list all puzzles
golf history                  show your records
golf --help                   show this message
```

## Programmatic API

```ts
import { judge, dailySeed, allPassed, byteCount } from "golf";

const { puzzle } = dailySeed();
const result = await judge("./sol.js", puzzle.tests);
console.log(allPassed(result), result.bytes);
```

## License

MIT
