import { describe, it, expect } from "vite-plus/test";
import {
  chrfSimilarity,
  describe as describeOutput,
  diffOutputs,
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

describe("chrfSimilarity (Popović 2015, β=2)", () => {
  it("returns 1 for identical text", () => {
    expect(chrfSimilarity("hello world", "hello world")).toBe(1);
  });

  it("returns 1 for both empty", () => {
    expect(chrfSimilarity("", "")).toBe(1);
  });

  it("returns 0 when one side is empty", () => {
    expect(chrfSimilarity("", "hello")).toBe(0);
    expect(chrfSimilarity("hello", "")).toBe(0);
  });

  it("is asymmetric under β=2 (recall-weighted; hypothesis-vs-reference order matters)", () => {
    const player = "a quick brown fox";
    const target = "the brown fox jumps over the lazy dog";
    expect(chrfSimilarity(player, target)).not.toBe(chrfSimilarity(target, player));
  });

  it("scores inflectional variants high (steams ≈ steam)", () => {
    expect(chrfSimilarity("the coffee steams", "the coffee steam")).toBeGreaterThan(0.7);
  });

  it("scores unrelated text low", () => {
    expect(chrfSimilarity("zebra crossing", "punctuation marks")).toBeLessThan(0.3);
  });

  it("ignores case + punctuation (same normalisation as tokens)", () => {
    expect(chrfSimilarity("Coffee, steam.", "coffee steam")).toBe(1);
  });

  it("scores thematic-but-lexically-divergent prose noticeably higher than pure Jaccard would", () => {
    const a = "Sleep past the alarm,\nCoffee steams in golden light—\nNowhere else to be.";
    const b = "Sunlight finds the cup,\nsteam curls through unhurried air—\nnowhere yet to be.";
    const jaccard = jaccardSimilarity(a, b);
    const chrf = chrfSimilarity(a, b);
    expect(chrf).toBeGreaterThan(jaccard);
  });
});

describe("diffOutputs", () => {
  it("returns empty arrays for both empty inputs", () => {
    expect(diffOutputs("", "")).toEqual({ shared: [], onlyInTarget: [], onlyInPlayer: [] });
  });

  it("returns full target tokens as onlyInTarget when player is empty", () => {
    const diff = diffOutputs("", "hello world");
    expect(diff.shared).toEqual([]);
    expect(diff.onlyInPlayer).toEqual([]);
    expect(diff.onlyInTarget).toEqual(["hello", "world"]);
  });

  it("returns full player tokens as onlyInPlayer when target is empty", () => {
    const diff = diffOutputs("hello world", "");
    expect(diff.shared).toEqual([]);
    expect(diff.onlyInTarget).toEqual([]);
    expect(diff.onlyInPlayer).toEqual(["hello", "world"]);
  });

  it("partitions tokens into shared / onlyInTarget / onlyInPlayer", () => {
    const diff = diffOutputs("the cat sat", "the dog ran");
    expect(diff.shared).toEqual(["the"]);
    expect(diff.onlyInTarget).toEqual(["dog", "ran"]);
    expect(diff.onlyInPlayer).toEqual(["cat", "sat"]);
  });

  it("dedupes within each side and preserves first-occurrence order", () => {
    const diff = diffOutputs("apple apple banana", "apple banana banana cherry");
    expect(diff.shared).toEqual(["apple", "banana"]);
    expect(diff.onlyInTarget).toEqual(["cherry"]);
    expect(diff.onlyInPlayer).toEqual([]);
  });

  it("ignores case and punctuation (same normalisation as tokenize)", () => {
    const diff = diffOutputs("Coffee, steam.", "coffee steam");
    expect(diff.shared).toEqual(["coffee", "steam"]);
    expect(diff.onlyInTarget).toEqual([]);
    expect(diff.onlyInPlayer).toEqual([]);
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
