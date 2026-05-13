import { describe, it, expect } from "vite-plus/test";
import { fetchPullRequest, GitHubFetchError } from "../src/github-fetch.js";

interface MockResponseInit {
  status?: number;
  statusText?: string;
  body?: string;
  json?: unknown;
}

const makeResponse = (init: MockResponseInit): Response => {
  const text = init.json !== undefined ? JSON.stringify(init.json) : (init.body ?? "");
  return new Response(text, {
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
  });
};

type RouteHandler = (request: { url: string; accept: string }) => MockResponseInit;

const router = (routes: Record<string, RouteHandler>): typeof globalThis.fetch => {
  const fetchImpl: typeof globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input as { url: string }).url;
    const headers = init?.headers as Record<string, string> | undefined;
    const accept = headers?.Accept ?? "";
    for (const [pattern, handler] of Object.entries(routes)) {
      if (url.startsWith(pattern)) return makeResponse(handler({ url, accept }));
    }
    throw new Error(`no mock route for ${url}`);
  };
  return fetchImpl;
};

const pullJson = {
  title: "Fix race in cache.ts",
  body: "Drops the read lock too early.",
  user: { login: "octocat" },
  head: { sha: "abc123", repo: { license: { spdx_id: "Apache-2.0" } } },
  base: { sha: "def456" },
  state: "open",
  merged: false,
  draft: false,
};
const filesJson = [{ filename: "src/cache.ts", additions: 7, deletions: 4, status: "modified" }];
const diffBody = "diff --git a/src/cache.ts b/src/cache.ts\n@@ -1 +1 @@\n-old\n+new\n";

describe("fetchPullRequest", () => {
  it("composes context from metadata + diff + files in a single call", async () => {
    const fetchImpl = router({
      "https://api.github.com/repos/owner/repo/pulls/42/files": () => ({ json: filesJson }),
      "https://api.github.com/repos/owner/repo/pulls/42": ({ accept }) => {
        if (accept === "application/vnd.github.diff") return { body: diffBody };
        return { json: pullJson };
      },
    });
    const result = await fetchPullRequest("https://github.com/owner/repo/pull/42", { fetchImpl });
    expect(result.context.repo).toBe("owner/repo");
    expect(result.context.prNumber).toBe(42);
    expect(result.context.title).toBe("Fix race in cache.ts");
    expect(result.context.author).toBe("octocat");
    expect(result.context.diff).toBe(diffBody);
    expect(result.context.headSha).toBe("abc123");
    expect(result.context.baseSha).toBe("def456");
    expect(result.context.upstreamLicense).toBe("Apache-2.0");
    expect(result.context.additions).toBe(7);
    expect(result.context.deletions).toBe(4);
    expect(result.context.filesChanged[0]?.path).toBe("src/cache.ts");
    expect(result.context.source).toBe("github");
    expect(result.state).toBe("open");
  });

  it("falls back to patch-diff.githubusercontent.com on 406", async () => {
    const fetchImpl = router({
      "https://api.github.com/repos/owner/repo/pulls/42/files": () => ({ json: filesJson }),
      "https://api.github.com/repos/owner/repo/pulls/42": ({ accept }) => {
        if (accept === "application/vnd.github.diff")
          return { status: 406, statusText: "Not Acceptable", body: "diff exceeded the maximum" };
        return { json: pullJson };
      },
      "https://patch-diff.githubusercontent.com/raw/owner/repo/pull/42.diff": () => ({
        body: "fallback diff content",
      }),
    });
    const result = await fetchPullRequest("https://github.com/owner/repo/pull/42", { fetchImpl });
    expect(result.context.diff).toBe("fallback diff content");
  });

  it("paginates /files until a short page", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({
      filename: `f${i}.ts`,
      additions: 1,
      deletions: 0,
      status: "modified",
    }));
    const page2 = [{ filename: "last.ts", additions: 1, deletions: 0, status: "modified" }];
    const fetchImpl = router({
      "https://api.github.com/repos/owner/repo/pulls/42/files?per_page=100&page=1": () => ({
        json: page1,
      }),
      "https://api.github.com/repos/owner/repo/pulls/42/files?per_page=100&page=2": () => ({
        json: page2,
      }),
      "https://api.github.com/repos/owner/repo/pulls/42": ({ accept }) =>
        accept === "application/vnd.github.diff" ? { body: diffBody } : { json: pullJson },
    });
    const result = await fetchPullRequest("https://github.com/owner/repo/pull/42", { fetchImpl });
    expect(result.context.filesChanged.length).toBe(101);
  });

  it("throws GitHubFetchError with a rate-limit hint on 403", async () => {
    const fetchImpl = router({
      "https://api.github.com/repos/owner/repo/pulls/42": () => ({
        status: 403,
        statusText: "Forbidden",
        body: '{"message":"API rate limit exceeded"}',
      }),
    });
    await expect(
      fetchPullRequest("https://github.com/owner/repo/pull/42", { fetchImpl }),
    ).rejects.toThrow(GitHubFetchError);
  });

  it("throws GitHubFetchError with a 404 hint", async () => {
    const fetchImpl = router({
      "https://api.github.com/repos/owner/repo/pulls/42": () => ({
        status: 404,
        statusText: "Not Found",
        body: '{"message":"Not Found"}',
      }),
    });
    try {
      await fetchPullRequest("https://github.com/owner/repo/pull/42", { fetchImpl });
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(GitHubFetchError);
      const typed = error as GitHubFetchError;
      expect(typed.details.status).toBe(404);
      expect(typed.details.hint).toContain("not found");
    }
  });

  it("rejects non-PR URLs at the parse step", async () => {
    const neverCall: typeof globalThis.fetch = () => {
      throw new Error("should never call fetch");
    };
    await expect(
      fetchPullRequest("https://github.com/owner/repo/issues/42", { fetchImpl: neverCall }),
    ).rejects.toThrow("not a recognised GitHub PR URL");
  });

  it("null-guards missing head.repo (fork deleted)", async () => {
    const detached = { ...pullJson, head: { sha: "abc123", repo: null } };
    const fetchImpl = router({
      "https://api.github.com/repos/owner/repo/pulls/42/files": () => ({ json: filesJson }),
      "https://api.github.com/repos/owner/repo/pulls/42": ({ accept }) =>
        accept === "application/vnd.github.diff" ? { body: diffBody } : { json: detached },
    });
    const result = await fetchPullRequest("https://github.com/owner/repo/pull/42", { fetchImpl });
    expect(result.context.upstreamLicense).toBeNull();
    expect(result.context.headSha).toBe("abc123");
  });

  it("sends User-Agent and X-GitHub-Api-Version on the metadata request", async () => {
    let capturedHeaders: Record<string, string> | undefined;
    const fetchImpl: typeof globalThis.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : (input as { url: string }).url;
      const accept = (init?.headers as Record<string, string>)?.Accept ?? "";
      if (
        url === "https://api.github.com/repos/owner/repo/pulls/42" &&
        accept === "application/vnd.github+json"
      ) {
        capturedHeaders = init?.headers as Record<string, string>;
        return new Response(JSON.stringify(pullJson), { status: 200 });
      }
      if (url === "https://api.github.com/repos/owner/repo/pulls/42") {
        return new Response(diffBody, { status: 200 });
      }
      if (url.startsWith("https://api.github.com/repos/owner/repo/pulls/42/files")) {
        return new Response(JSON.stringify(filesJson), { status: 200 });
      }
      throw new Error(`no mock for ${url}`);
    };
    await fetchPullRequest("https://github.com/owner/repo/pull/42", { fetchImpl });
    expect(capturedHeaders?.["User-Agent"]).toContain("verdict-cli");
    expect(capturedHeaders?.["X-GitHub-Api-Version"]).toBe("2022-11-28");
  });

  it("sends Authorization when a token is provided", async () => {
    let capturedAuth: string | undefined;
    const fetchImpl: typeof globalThis.fetch = async (input, init) => {
      capturedAuth = (init?.headers as Record<string, string>)?.Authorization;
      const url = typeof input === "string" ? input : (input as { url: string }).url;
      const accept = (init?.headers as Record<string, string>)?.Accept ?? "";
      if (url.endsWith("/files") || url.includes("/files?")) {
        return new Response(JSON.stringify(filesJson), { status: 200 });
      }
      if (accept === "application/vnd.github.diff") return new Response(diffBody, { status: 200 });
      return new Response(JSON.stringify(pullJson), { status: 200 });
    };
    await fetchPullRequest("https://github.com/owner/repo/pull/42", {
      fetchImpl,
      token: "ghp_test",
    });
    expect(capturedAuth).toBe("Bearer ghp_test");
  });
});
