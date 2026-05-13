export interface ParsedPrUrl {
  owner: string;
  repo: string;
  number: number;
}

const PR_URL =
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/(?:files|commits|checks)?)?\/?(?:\?.*)?(?:#.*)?$/;
const SHORT_FORM = /^([^/\s]+)\/([^/#\s]+)#(\d+)$/;

export const parsePrUrl = (input: string): ParsedPrUrl | null => {
  const trimmed = input.trim();
  const longMatch = trimmed.match(PR_URL);
  if (longMatch) {
    const [, owner, repo, numberRaw] = longMatch;
    const number = Number(numberRaw);
    if (!owner || !repo || !Number.isFinite(number) || number <= 0) return null;
    return { owner, repo, number };
  }
  const shortMatch = trimmed.match(SHORT_FORM);
  if (shortMatch) {
    const [, owner, repo, numberRaw] = shortMatch;
    const number = Number(numberRaw);
    if (!owner || !repo || !Number.isFinite(number) || number <= 0) return null;
    return { owner, repo, number };
  }
  return null;
};
