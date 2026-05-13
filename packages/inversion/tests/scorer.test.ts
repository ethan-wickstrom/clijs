import { describe, it, expect } from "vite-plus/test";
import { describe as describeOutput, jaccardSimilarity, tokenize } from "../src/scorer.js";

describe("tokenize", () => {
  it("returns no tokens for empty / whitespace-only", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   \n\t  ")).toEqual([]);
  });

  it("lowercases and strips punctuation", () => {
    expect(tokenize("Hello, World!")).toEqual(["hello", "world"]);
  });

  it("preserves apostrophes inside contractions", () => {
    expect(tokenize("it's a haiku")).toEqual(["it's", "a", "haiku"]);
  });

  it("handles unicode letters", () => {
    expect(tokenize("café résumé")).toEqual(["café", "résumé"]);
  });

  it("does not dedupe (Set is the scorer's responsibility, not tokenize's)", () => {
    expect(tokenize("the the the")).toEqual(["the", "the", "the"]);
  });
});

describe("jaccardSimilarity", () => {
  it("returns 1 for identical text", () => {
    expect(jaccardSimilarity("a b c", "a b c")).toBe(1);
  });

  it("returns 1 for both empty", () => {
    expect(jaccardSimilarity("", "")).toBe(1);
  });

  it("returns 0 for disjoint sets", () => {
    expect(jaccardSimilarity("a b c", "d e f")).toBe(0);
  });

  it("is symmetric", () => {
    expect(jaccardSimilarity("a b c", "b c d")).toBe(jaccardSimilarity("b c d", "a b c"));
  });

  it("handles a partial overlap correctly", () => {
    expect(jaccardSimilarity("a b c", "b c d")).toBeCloseTo(2 / 4, 6);
  });

  it("ignores case + punctuation", () => {
    expect(jaccardSimilarity("Coffee, steam.", "coffee steam")).toBe(1);
  });

  it("dedupes inside each side before comparing", () => {
    expect(jaccardSimilarity("a a a b", "a b")).toBe(1);
  });
});

describe("describe", () => {
  it("buckets a perfect match as convergent", () => {
    const feedback = describeOutput("hello world", "hello world");
    expect(feedback.similarity).toBe(1);
    expect(feedback.bucket).toBe("convergent");
    expect(feedback.lengthDelta).toBe("match");
  });

  it("buckets a complete miss as cold", () => {
    const feedback = describeOutput("alpha beta gamma", "delta epsilon zeta");
    expect(feedback.bucket).toBe("cold");
  });

  it("reports a shorter response when the player output is much smaller", () => {
    const feedback = describeOutput("short", "a much longer reference output with many tokens");
    expect(feedback.lengthDelta).toBe("shorter");
  });

  it("reports a longer response when the player output is much bigger", () => {
    const feedback = describeOutput("a much longer reference output with many tokens", "short");
    expect(feedback.lengthDelta).toBe("longer");
  });
});
