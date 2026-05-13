const TOKEN_NON_WORD = /[^\p{L}\p{N}\s']/gu;
const TOKEN_WHITESPACE = /\s+/;

export const tokenize = (text: string): readonly string[] => {
  const normalized = text.toLowerCase().replace(TOKEN_NON_WORD, " ").trim();
  if (normalized.length === 0) return [];
  return normalized.split(TOKEN_WHITESPACE).filter((token) => token.length > 0);
};

export const jaccardSimilarity = (a: string, b: string): number => {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const token of setA) if (setB.has(token)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
};

export interface SimilarityFeedback {
  similarity: number;
  bucket: "convergent" | "warm" | "tepid" | "cold";
  lengthDelta: "shorter" | "match" | "longer";
}

export const describe = (playerOutput: string, originalOutput: string): SimilarityFeedback => {
  const similarity = jaccardSimilarity(playerOutput, originalOutput);
  const bucket: SimilarityFeedback["bucket"] =
    similarity >= 0.6
      ? "convergent"
      : similarity >= 0.4
        ? "warm"
        : similarity >= 0.2
          ? "tepid"
          : "cold";
  const playerLen = tokenize(playerOutput).length;
  const originalLen = tokenize(originalOutput).length;
  const ratio = originalLen === 0 ? 1 : playerLen / originalLen;
  const lengthDelta: SimilarityFeedback["lengthDelta"] =
    ratio < 0.6 ? "shorter" : ratio > 1.6 ? "longer" : "match";
  return { similarity, bucket, lengthDelta };
};
