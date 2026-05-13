import { describe, it, expect } from "vite-plus/test";
import { parseCommentArg } from "../src/utils/parse-comment-arg.js";

describe("parseCommentArg", () => {
  it("parses a single-line comment", () => {
    const result = parseCommentArg("src/foo.ts:12:nit:rename `c` to `cache`");
    expect(result).toEqual({
      filePath: "src/foo.ts",
      lineStart: 12,
      lineEnd: null,
      severity: "nit",
      body: "rename `c` to `cache`",
    });
  });

  it("parses a range-line comment", () => {
    const result = parseCommentArg("src/cache.ts:12-15:block:The lock is released too early.");
    expect(result?.lineStart).toBe(12);
    expect(result?.lineEnd).toBe(15);
    expect(result?.severity).toBe("block");
  });

  it("keeps colons inside the body", () => {
    const result = parseCommentArg("a:1:discuss:see also: https://example.com/path");
    expect(result?.body).toBe("see also: https://example.com/path");
  });

  it("rejects an unknown severity", () => {
    expect(parseCommentArg("a:1:critical:bad")).toBeNull();
  });

  it("rejects a malformed line range", () => {
    expect(parseCommentArg("a:abc:nit:bad")).toBeNull();
    expect(parseCommentArg("a:12-5:nit:reversed")).toBeNull();
  });

  it("rejects empty body", () => {
    expect(parseCommentArg("a:1:nit:   ")).toBeNull();
  });

  it("rejects missing fields", () => {
    expect(parseCommentArg("a:1:nit")).toBeNull();
    expect(parseCommentArg("a:1")).toBeNull();
    expect(parseCommentArg("a")).toBeNull();
  });
});
