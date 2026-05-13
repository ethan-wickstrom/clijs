const TOKEN_NON_WORD = /[^\p{L}\p{N}\s']/gu;
const TOKEN_WHITESPACE = /\s+/;
const CHAR_NGRAM_N = 3;
const BLEND_TOKEN_WEIGHT = 0.5;

const normalize = (text: string): string => text.toLowerCase().replace(TOKEN_NON_WORD, " ");

export const tokenize = (text: string): readonly string[] => {
  const normalized = normalize(text).trim();
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

const charNgramCounts = (text: string): Map<string, number> => {
  const collapsed = normalize(text).replace(TOKEN_WHITESPACE, " ").trim();
  const counts = new Map<string, number>();
  if (collapsed.length === 0) return counts;
  const padded = ` ${collapsed} `;
  if (padded.length < CHAR_NGRAM_N) return counts;
  for (let index = 0; index <= padded.length - CHAR_NGRAM_N; index++) {
    const gram = padded.slice(index, index + CHAR_NGRAM_N);
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  return counts;
};

const cosineOfCounts = (a: Map<string, number>, b: Map<string, number>): number => {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let dot = 0;
  for (const [key, valueA] of a) {
    const valueB = b.get(key);
    if (valueB !== undefined) dot += valueA * valueB;
  }
  let sumSqA = 0;
  for (const value of a.values()) sumSqA += value * value;
  let sumSqB = 0;
  for (const value of b.values()) sumSqB += value * value;
  return dot / Math.sqrt(sumSqA * sumSqB);
};

export const charNgramSimilarity = (a: string, b: string): number =>
  cosineOfCounts(charNgramCounts(a), charNgramCounts(b));

export const blendedSimilarity = (a: string, b: string): number =>
  BLEND_TOKEN_WEIGHT * jaccardSimilarity(a, b) +
  (1 - BLEND_TOKEN_WEIGHT) * charNgramSimilarity(a, b);

export interface SimilarityFeedback {
  similarity: number;
  bucket: "convergent" | "warm" | "tepid" | "cold";
  lengthDelta: "shorter" | "match" | "longer";
}

export const describe = (playerOutput: string, originalOutput: string): SimilarityFeedback => {
  const similarity = blendedSimilarity(playerOutput, originalOutput);
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
