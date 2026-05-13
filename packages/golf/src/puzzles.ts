export interface TestCase {
  input: readonly unknown[];
  output: unknown;
}

export interface Puzzle {
  id: string;
  title: string;
  prompt: string;
  signature: string;
  examples: readonly TestCase[];
  tests: readonly TestCase[];
}

const fizzbuzz: Puzzle = {
  id: "fizzbuzz",
  title: "FizzBuzz",
  prompt:
    "Return 'Fizz' if n is divisible by 3, 'Buzz' if by 5, 'FizzBuzz' if by both, otherwise the number as a string. Assume n >= 1.",
  signature: "(n: number) => string",
  examples: [
    { input: [1], output: "1" },
    { input: [3], output: "Fizz" },
    { input: [15], output: "FizzBuzz" },
  ],
  tests: [
    { input: [1], output: "1" },
    { input: [3], output: "Fizz" },
    { input: [5], output: "Buzz" },
    { input: [15], output: "FizzBuzz" },
    { input: [7], output: "7" },
    { input: [9], output: "Fizz" },
    { input: [25], output: "Buzz" },
    { input: [30], output: "FizzBuzz" },
    { input: [100], output: "Buzz" },
    { input: [99], output: "Fizz" },
  ],
};

const isPalindrome: Puzzle = {
  id: "is-palindrome",
  title: "Palindrome",
  prompt:
    "Return true if the string reads the same forward and backward (case- and char-sensitive).",
  signature: "(s: string) => boolean",
  examples: [
    { input: ["racecar"], output: true },
    { input: ["hello"], output: false },
    { input: [""], output: true },
  ],
  tests: [
    { input: [""], output: true },
    { input: ["a"], output: true },
    { input: ["ab"], output: false },
    { input: ["aa"], output: true },
    { input: ["abba"], output: true },
    { input: ["abcba"], output: true },
    { input: ["abcd"], output: false },
    { input: ["racecar"], output: true },
    { input: ["hello"], output: false },
    { input: ["Aa"], output: false },
  ],
};

const reverseArray: Puzzle = {
  id: "reverse",
  title: "Reverse",
  prompt: "Return a new array with the same elements in reverse order. Do not mutate the input.",
  signature: "(arr: number[]) => number[]",
  examples: [
    { input: [[1, 2, 3]], output: [3, 2, 1] },
    { input: [[]], output: [] },
    { input: [[42]], output: [42] },
  ],
  tests: [
    { input: [[]], output: [] },
    { input: [[1]], output: [1] },
    { input: [[42]], output: [42] },
    { input: [[1, 2]], output: [2, 1] },
    { input: [[1, 2, 3]], output: [3, 2, 1] },
    { input: [[1, 2, 3, 4, 5]], output: [5, 4, 3, 2, 1] },
    { input: [[-1, 0, 1]], output: [1, 0, -1] },
    { input: [[7, 7, 7]], output: [7, 7, 7] },
    { input: [[100, -100]], output: [-100, 100] },
    { input: [[5, 4, 3, 2, 1]], output: [1, 2, 3, 4, 5] },
  ],
};

const sumDigits: Puzzle = {
  id: "sum-digits",
  title: "Digit Sum",
  prompt: "Sum the decimal digits of a non-negative integer.",
  signature: "(n: number) => number",
  examples: [
    { input: [0], output: 0 },
    { input: [42], output: 6 },
    { input: [9999], output: 36 },
  ],
  tests: [
    { input: [0], output: 0 },
    { input: [1], output: 1 },
    { input: [9], output: 9 },
    { input: [10], output: 1 },
    { input: [42], output: 6 },
    { input: [99], output: 18 },
    { input: [100], output: 1 },
    { input: [123], output: 6 },
    { input: [9999], output: 36 },
    { input: [1000000], output: 1 },
  ],
};

const isPrime: Puzzle = {
  id: "is-prime",
  title: "Prime Check",
  prompt: "Return true iff n is a prime number. 0 and 1 are not prime.",
  signature: "(n: number) => boolean",
  examples: [
    { input: [2], output: true },
    { input: [4], output: false },
    { input: [97], output: true },
  ],
  tests: [
    { input: [0], output: false },
    { input: [1], output: false },
    { input: [2], output: true },
    { input: [3], output: true },
    { input: [4], output: false },
    { input: [5], output: true },
    { input: [17], output: true },
    { input: [25], output: false },
    { input: [97], output: true },
    { input: [100], output: false },
  ],
};

const fibonacci: Puzzle = {
  id: "fibonacci",
  title: "Fibonacci",
  prompt:
    "Return the n-th Fibonacci number, where f(0)=0, f(1)=1, f(n)=f(n-1)+f(n-2). Assume n <= 30.",
  signature: "(n: number) => number",
  examples: [
    { input: [0], output: 0 },
    { input: [1], output: 1 },
    { input: [10], output: 55 },
  ],
  tests: [
    { input: [0], output: 0 },
    { input: [1], output: 1 },
    { input: [2], output: 1 },
    { input: [3], output: 2 },
    { input: [5], output: 5 },
    { input: [6], output: 8 },
    { input: [10], output: 55 },
    { input: [15], output: 610 },
    { input: [20], output: 6765 },
    { input: [25], output: 75025 },
  ],
};

const flatten: Puzzle = {
  id: "flatten-one",
  title: "Flatten One",
  prompt:
    "Flatten an array one level deep. Elements that are arrays are spliced in; other elements stay as-is.",
  signature: "(arr: unknown[]) => unknown[]",
  examples: [
    { input: [[1, [2, 3], 4]], output: [1, 2, 3, 4] },
    { input: [[[1], [2]]], output: [1, 2] },
    { input: [[[1, [2]]]], output: [1, [2]] },
  ],
  tests: [
    { input: [[]], output: [] },
    { input: [[1, 2, 3]], output: [1, 2, 3] },
    { input: [[[1]]], output: [1] },
    { input: [[[1], [2]]], output: [1, 2] },
    { input: [[[1], [2], [3]]], output: [1, 2, 3] },
    {
      input: [
        [
          [1, 2],
          [3, 4],
        ],
      ],
      output: [1, 2, 3, 4],
    },
    { input: [[1, [2, 3], 4]], output: [1, 2, 3, 4] },
    { input: [[[1, [2]]]], output: [1, [2]] },
    { input: [[[], []]], output: [] },
    { input: [[1, [2], 3, [4, 5]]], output: [1, 2, 3, 4, 5] },
  ],
};

const uniqueSorted: Puzzle = {
  id: "unique-sorted",
  title: "Unique Sorted",
  prompt: "Return the unique elements of the array sorted ascending.",
  signature: "(arr: number[]) => number[]",
  examples: [
    { input: [[3, 1, 2, 1, 3, 2]], output: [1, 2, 3] },
    { input: [[]], output: [] },
    { input: [[5, 4, 3, 2, 1]], output: [1, 2, 3, 4, 5] },
  ],
  tests: [
    { input: [[]], output: [] },
    { input: [[1]], output: [1] },
    { input: [[3, 1, 2]], output: [1, 2, 3] },
    { input: [[1, 1, 1]], output: [1] },
    { input: [[3, 1, 2, 1, 3, 2]], output: [1, 2, 3] },
    { input: [[-1, 0, 1]], output: [-1, 0, 1] },
    { input: [[5, 4, 3, 2, 1]], output: [1, 2, 3, 4, 5] },
    { input: [[2, 2, 2, 2]], output: [2] },
    { input: [[10, 5, 7, 5, 10]], output: [5, 7, 10] },
    { input: [[0]], output: [0] },
  ],
};

const gcd: Puzzle = {
  id: "gcd",
  title: "GCD",
  prompt: "Return the greatest common divisor of two positive integers.",
  signature: "(a: number, b: number) => number",
  examples: [
    { input: [12, 8], output: 4 },
    { input: [17, 5], output: 1 },
    { input: [60, 48], output: 12 },
  ],
  tests: [
    { input: [1, 1], output: 1 },
    { input: [4, 2], output: 2 },
    { input: [12, 8], output: 4 },
    { input: [100, 75], output: 25 },
    { input: [17, 5], output: 1 },
    { input: [60, 48], output: 12 },
    { input: [1000000, 500000], output: 500000 },
    { input: [7, 7], output: 7 },
    { input: [99, 11], output: 11 },
    { input: [1, 100], output: 1 },
  ],
};

const toRoman: Puzzle = {
  id: "to-roman",
  title: "Roman Numeral",
  prompt: "Convert a positive integer (1 <= n <= 3999) into its Roman numeral representation.",
  signature: "(n: number) => string",
  examples: [
    { input: [1], output: "I" },
    { input: [1994], output: "MCMXCIV" },
    { input: [58], output: "LVIII" },
  ],
  tests: [
    { input: [1], output: "I" },
    { input: [4], output: "IV" },
    { input: [9], output: "IX" },
    { input: [40], output: "XL" },
    { input: [90], output: "XC" },
    { input: [400], output: "CD" },
    { input: [900], output: "CM" },
    { input: [1994], output: "MCMXCIV" },
    { input: [3999], output: "MMMCMXCIX" },
    { input: [58], output: "LVIII" },
  ],
};

export const PUZZLES: readonly Puzzle[] = [
  fizzbuzz,
  isPalindrome,
  reverseArray,
  sumDigits,
  isPrime,
  fibonacci,
  flatten,
  uniqueSorted,
  gcd,
  toRoman,
];

export const findPuzzle = (id: string): Puzzle | undefined =>
  PUZZLES.find((puzzle) => puzzle.id === id);
