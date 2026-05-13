import { describe, it, expect } from "vite-plus/test";
import {
  blendedSimilarity,
  charNgramSimilarity,
  describe as describeOutput,
  jaccardSimilarity,
  tokenize,
} from "../src/scorer.js";

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

describe("charNgramSimilarity", () => {
  it("returns 1 for identical text", () => {
    expect(charNgramSimilarity("hello world", "hello world")).toBe(1);
  });

  it("returns 1 for both empty", () => {
    expect(charNgramSimilarity("", "")).toBe(1);
  });

  it("returns 0 when one side is empty", () => {
    expect(charNgramSimilarity("", "hello")).toBe(0);
    expect(charNgramSimilarity("hello", "")).toBe(0);
  });

  it("is symmetric", () => {
    const a = "a quick brown fox";
    const b = "the brown fox jumps";
    expect(charNgramSimilarity(a, b)).toBe(charNgramSimilarity(b, a));
  });

  it("scores inflectional variants high (steams ≈ steam)", () => {
    expect(charNgramSimilarity("the coffee steams", "the coffee steam")).toBeGreaterThan(0.7);
  });

  it("scores unrelated text low", () => {
    expect(charNgramSimilarity("zebra crossing", "punctuation marks")).toBeLessThan(0.3);
  });

  it("ignores case + punctuation (same normalization as tokens)", () => {
    expect(charNgramSimilarity("Coffee, steam.", "coffee steam")).toBe(1);
  });
});

describe("blendedSimilarity", () => {
  it("returns 1 for identical text", () => {
    expect(blendedSimilarity("hello world", "hello world")).toBe(1);
  });

  it("returns 0 for fully disjoint vocabulary AND surface form", () => {
    expect(blendedSimilarity("zzzzz", "qqqqq")).toBe(0);
  });

  it("scores thematic-but-lexically-divergent prose noticeably higher than pure Jaccard would", () => {
    const a = "Sleep past the alarm,\nCoffee steams in golden light—\nNowhere else to be.";
    const b = "Sunlight finds the cup,\nsteam curls through unhurried air—\nnowhere yet to be.";
    const jaccard = jaccardSimilarity(a, b);
    const blended = blendedSimilarity(a, b);
    expect(blended).toBeGreaterThan(jaccard);
    expect(blended).toBeGreaterThan(0.25);
  });
});

describe("describe", () => {
  it("buckets a perfect match as convergent", () => {
    const feedback = describeOutput("hello world", "hello world");
    expect(feedback.similarity).toBe(1);
    expect(feedback.bucket).toBe("convergent");
    expect(feedback.lengthDelta).toBe("match");
  });

  it("buckets fully disjoint surface form as cold", () => {
    const feedback = describeOutput("zzzzz aaaaa", "qqqqq bbbbb");
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
