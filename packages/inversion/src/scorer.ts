const TOKEN_NON_WORD = /[^\p{L}\p{N}\s']/gu;
const TOKEN_WHITESPACE = /\s+/;
const CHRF_MAX_N = 6;
const CHRF_BETA = 2;

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

const charNgramCounts = (text: string, n: number): Map<string, number> => {
  const collapsed = normalize(text).replace(TOKEN_WHITESPACE, " ").trim();
  const counts = new Map<string, number>();
  if (collapsed.length === 0) return counts;
  const padded = ` ${collapsed} `;
  if (padded.length < n) return counts;
  for (let index = 0; index <= padded.length - n; index++) {
    const gram = padded.slice(index, index + n);
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }
  return counts;
};

const totalCount = (counts: Map<string, number>): number => {
  let total = 0;
  for (const value of counts.values()) total += value;
  return total;
};

const matchedCount = (a: Map<string, number>, b: Map<string, number>): number => {
  let matched = 0;
  for (const [key, valueA] of a) {
    const valueB = b.get(key);
    if (valueB !== undefined) matched += Math.min(valueA, valueB);
  }
  return matched;
};

const fBeta = (matched: number, totalPlayer: number, totalTarget: number, beta: number): number => {
  if (totalPlayer === 0 && totalTarget === 0) return 1;
  if (totalPlayer === 0 || totalTarget === 0) return 0;
  if (matched === 0) return 0;
  const precision = matched / totalPlayer;
  const recall = matched / totalTarget;
  const beta2 = beta * beta;
  return ((1 + beta2) * precision * recall) / (beta2 * precision + recall);
};

export const chrfSimilarity = (player: string, target: string): number => {
  if (player.trim().length === 0 && target.trim().length === 0) return 1;
  let sum = 0;
  let count = 0;
  for (let n = 1; n <= CHRF_MAX_N; n++) {
    const playerGrams = charNgramCounts(player, n);
    const targetGrams = charNgramCounts(target, n);
    const matched = matchedCount(playerGrams, targetGrams);
    sum += fBeta(matched, totalCount(playerGrams), totalCount(targetGrams), CHRF_BETA);
    count += 1;
  }
  return count === 0 ? 0 : sum / count;
};

export interface OutputDiff {
  shared: readonly string[];
  onlyInTarget: readonly string[];
  onlyInPlayer: readonly string[];
}

export const diffOutputs = (playerOutput: string, targetOutput: string): OutputDiff => {
  const playerOrder = tokenize(playerOutput);
  const targetOrder = tokenize(targetOutput);
  const playerSet = new Set(playerOrder);
  const targetSet = new Set(targetOrder);
  const seen = new Set<string>();
  const shared: string[] = [];
  for (const token of targetOrder) {
    if (playerSet.has(token) && !seen.has(token)) {
      shared.push(token);
      seen.add(token);
    }
  }
  const onlyInTarget: string[] = [];
  const seenTarget = new Set<string>();
  for (const token of targetOrder) {
    if (!playerSet.has(token) && !seenTarget.has(token)) {
      onlyInTarget.push(token);
      seenTarget.add(token);
    }
  }
  const onlyInPlayer: string[] = [];
  const seenPlayer = new Set<string>();
  for (const token of playerOrder) {
    if (!targetSet.has(token) && !seenPlayer.has(token)) {
      onlyInPlayer.push(token);
      seenPlayer.add(token);
    }
  }
  return { shared, onlyInTarget, onlyInPlayer };
};

export interface SimilarityFeedback {
  similarity: number;
  bucket: "convergent" | "warm" | "tepid" | "cold";
  lengthDelta: "shorter" | "match" | "longer";
}

export const describe = (playerOutput: string, originalOutput: string): SimilarityFeedback => {
  const similarity = chrfSimilarity(playerOutput, originalOutput);
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
