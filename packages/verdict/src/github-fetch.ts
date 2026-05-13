import { parsePrUrl } from "./utils/parse-pr-url.js";
import type { ChangedFile, PullRequestContext } from "./record.js";

const API_BASE = "https://api.github.com";
const PATCH_DIFF_BASE = "https://patch-diff.githubusercontent.com/raw";
const API_VERSION = "2022-11-28";
const USER_AGENT = "verdict-cli/0.0.1";
const MAX_FILES_PAGES = 30;
const FILES_PER_PAGE = 100;

export interface FetchOptions {
  token?: string;
  fetchImpl?: typeof globalThis.fetch;
  userAgent?: string;
}

export interface GitHubFetchErrorDetails {
  status: number;
  message: string;
  body: string;
  hint?: string;
}

export class GitHubFetchError extends Error {
  readonly details: GitHubFetchErrorDetails;
  constructor(details: GitHubFetchErrorDetails) {
    super(details.message);
    this.name = "GitHubFetchError";
    this.details = details;
  }
}

interface PullPayload {
  title?: string;
  body?: string | null;
  user?: { login?: string } | null;
  head?: {
    sha?: string;
    repo?: { license?: { spdx_id?: string | null } | null } | null;
  } | null;
  base?: { sha?: string } | null;
  state?: string;
  merged?: boolean;
  draft?: boolean;
}

interface FilesPayloadRow {
  filename?: string;
  additions?: number;
  deletions?: number;
  status?: string;
}

const buildHeaders = (
  options: FetchOptions,
  accept: string,
  includeApiVersion: boolean,
): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": options.userAgent ?? USER_AGENT,
  };
  if (includeApiVersion) headers["X-GitHub-Api-Version"] = API_VERSION;
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  return headers;
};

const hintFor = (status: number, body: string): string | undefined => {
  if (status === 401) return "GITHUB_TOKEN is invalid or expired";
  if (status === 403) {
    if (body.toLowerCase().includes("rate limit"))
      return "rate-limited (60/hr unauthenticated); set GITHUB_TOKEN for 5,000/hr, or wait for x-ratelimit-reset";
    return "User-Agent rejected, or hit a secondary rate limit";
  }
  if (status === 404) return "PR not found, or in a private repo this token does not see";
  if (status === 406)
    return "diff truncated by GitHub (300 files / 20k lines cap); falling back to /files reconstruction";
  if (status === 422) return "PR commit no longer reachable (force-push GC'd the SHA)";
  if (status === 429) return "secondary rate limit; back off and retry";
  return undefined;
};

const throwIfNotOk = async (response: Response, label: string): Promise<void> => {
  if (response.ok) return;
  const body = await response.text();
  throw new GitHubFetchError({
    status: response.status,
    message: `${label}: GitHub returned ${response.status} ${response.statusText}`,
    body,
    hint: hintFor(response.status, body),
  });
};

const fetchMetadata = async (
  owner: string,
  repo: string,
  prNumber: number,
  options: FetchOptions,
): Promise<PullPayload> => {
  const fetcher = options.fetchImpl ?? globalThis.fetch;
  const response = await fetcher(`${API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`, {
    headers: buildHeaders(options, "application/vnd.github+json", true),
  });
  await throwIfNotOk(response, "fetch PR metadata");
  return (await response.json()) as PullPayload;
};

const fetchDiff = async (
  owner: string,
  repo: string,
  prNumber: number,
  options: FetchOptions,
): Promise<string> => {
  const fetcher = options.fetchImpl ?? globalThis.fetch;
  const response = await fetcher(`${API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}`, {
    headers: buildHeaders(options, "application/vnd.github.diff", true),
  });
  if (response.status === 406) {
    const fallback = await fetcher(`${PATCH_DIFF_BASE}/${owner}/${repo}/pull/${prNumber}.diff`, {
      headers: { "User-Agent": options.userAgent ?? USER_AGENT },
    });
    await throwIfNotOk(fallback, "fetch PR diff (patch-diff fallback)");
    return await fallback.text();
  }
  await throwIfNotOk(response, "fetch PR diff");
  return await response.text();
};

const fetchFiles = async (
  owner: string,
  repo: string,
  prNumber: number,
  options: FetchOptions,
): Promise<ChangedFile[]> => {
  const fetcher = options.fetchImpl ?? globalThis.fetch;
  const collected: ChangedFile[] = [];
  for (let page = 1; page <= MAX_FILES_PAGES; page++) {
    const response = await fetcher(
      `${API_BASE}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=${FILES_PER_PAGE}&page=${page}`,
      { headers: buildHeaders(options, "application/vnd.github+json", true) },
    );
    await throwIfNotOk(response, "fetch PR files");
    const batch = (await response.json()) as FilesPayloadRow[];
    for (const file of batch) {
      collected.push({
        path: file.filename ?? "?",
        additions: file.additions ?? 0,
        deletions: file.deletions ?? 0,
      });
    }
    if (batch.length < FILES_PER_PAGE) break;
  }
  return collected;
};

export interface FetchPullRequestResult {
  context: PullRequestContext;
  state: string;
  merged: boolean;
  draft: boolean;
}

export const fetchPullRequest = async (
  prUrl: string,
  options: FetchOptions = {},
): Promise<FetchPullRequestResult> => {
  const parsed = parsePrUrl(prUrl);
  if (!parsed) {
    throw new GitHubFetchError({
      status: 0,
      message: `not a recognised GitHub PR URL: ${prUrl}`,
      body: "",
      hint: "expected https://github.com/owner/repo/pull/N or owner/repo#N",
    });
  }
  const { owner, repo, number } = parsed;
  const [metadata, diff, files] = await Promise.all([
    fetchMetadata(owner, repo, number, options),
    fetchDiff(owner, repo, number, options),
    fetchFiles(owner, repo, number, options),
  ]);
  const additions = files.reduce((sum, file) => sum + file.additions, 0);
  const deletions = files.reduce((sum, file) => sum + file.deletions, 0);
  const context: PullRequestContext = {
    source: "github",
    repo: `${owner}/${repo}`,
    prNumber: number,
    title: metadata.title ?? "",
    author: metadata.user?.login ?? null,
    description: metadata.body ?? "",
    diff,
    filesChanged: files,
    additions,
    deletions,
    headSha: metadata.head?.sha ?? null,
    baseSha: metadata.base?.sha ?? null,
    upstreamLicense: metadata.head?.repo?.license?.spdx_id ?? null,
  };
  return {
    context,
    state: metadata.state ?? "unknown",
    merged: metadata.merged ?? false,
    draft: metadata.draft ?? false,
  };
};
