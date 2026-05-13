import { describe, it, expect } from "vite-plus/test";
import { equalsJson } from "../src/utils/equals-json.js";

describe("equalsJson", () => {
  it("compares primitives", () => {
    expect(equalsJson(1, 1)).toBe(true);
    expect(equalsJson("a", "a")).toBe(true);
    expect(equalsJson(true, true)).toBe(true);
    expect(equalsJson(null, null)).toBe(true);
    expect(equalsJson(1, 2)).toBe(false);
    expect(equalsJson("1", 1)).toBe(false);
  });

  it("compares arrays element-wise", () => {
    expect(equalsJson([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(equalsJson([1, 2], [1, 2, 3])).toBe(false);
    expect(equalsJson([1, 2, 3], [3, 2, 1])).toBe(false);
  });

  it("compares nested arrays", () => {
    expect(equalsJson([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(equalsJson([1, [2, 3]], [1, 2, 3])).toBe(false);
  });

  it("treats undefined-in-array as null (JSON semantics)", () => {
    expect(equalsJson([undefined], [null])).toBe(true);
  });
});
