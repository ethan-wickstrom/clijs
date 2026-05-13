import { describe, it, expect } from "vite-plus/test";
import { parsePrUrl } from "../src/utils/parse-pr-url.js";

describe("parsePrUrl", () => {
  it("parses a canonical github.com PR URL", () => {
    expect(parsePrUrl("https://github.com/owner/repo/pull/42")).toEqual({
      owner: "owner",
      repo: "repo",
      number: 42,
    });
  });

  it("accepts the trailing slash", () => {
    expect(parsePrUrl("https://github.com/owner/repo/pull/42/")?.number).toBe(42);
  });

  it("accepts the /files /commits /checks subpaths", () => {
    expect(parsePrUrl("https://github.com/owner/repo/pull/42/files")?.number).toBe(42);
    expect(parsePrUrl("https://github.com/owner/repo/pull/42/commits")?.number).toBe(42);
  });

  it("accepts a trailing query string or hash", () => {
    expect(parsePrUrl("https://github.com/owner/repo/pull/42?diff=split")?.number).toBe(42);
    expect(parsePrUrl("https://github.com/owner/repo/pull/42#discussion_r1")?.number).toBe(42);
  });

  it("accepts http://", () => {
    expect(parsePrUrl("http://github.com/owner/repo/pull/42")?.number).toBe(42);
  });

  it("parses the short owner/repo#N form", () => {
    expect(parsePrUrl("owner/repo#42")).toEqual({ owner: "owner", repo: "repo", number: 42 });
  });

  it("rejects an issue URL (no /pull/ segment)", () => {
    expect(parsePrUrl("https://github.com/owner/repo/issues/42")).toBeNull();
  });

  it("rejects URLs from other hosts", () => {
    expect(parsePrUrl("https://gitlab.com/owner/repo/pull/42")).toBeNull();
  });

  it("rejects a missing or zero PR number", () => {
    expect(parsePrUrl("https://github.com/owner/repo/pull/0")).toBeNull();
    expect(parsePrUrl("https://github.com/owner/repo/pull/")).toBeNull();
    expect(parsePrUrl("https://github.com/owner/repo/pull/abc")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(parsePrUrl("  https://github.com/owner/repo/pull/42  ")?.number).toBe(42);
  });
});
