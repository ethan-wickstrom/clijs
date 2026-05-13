import { describe, it, expect } from "vite-plus/test";
import { byteCount } from "../src/utils/byte-count.js";

describe("byteCount", () => {
  it("returns 0 for empty input", () => {
    expect(byteCount("")).toBe(0);
  });

  it("counts ascii bytes", () => {
    expect(byteCount("hello")).toBe(5);
  });

  it("ignores a trailing newline", () => {
    expect(byteCount("hello\n")).toBe(5);
  });

  it("ignores trailing whitespace and blank lines", () => {
    expect(byteCount("hello\n\n  \t\n")).toBe(5);
  });

  it("counts multibyte utf-8 by byte length", () => {
    expect(byteCount("héllo")).toBe(6);
  });

  it("counts internal whitespace", () => {
    expect(byteCount("a b")).toBe(3);
  });
});
