import { describe, expect, it } from "vitest";

import { merge } from "./merge";

describe("Merge arrays", () => {
  it("merges two arrays by iteratee", () => {
    const array1 = [
      { id: 1, name: "A" },
      { id: 2, name: "B" },
    ];
    const array2 = [
      { id: 2, name: "B2" },
      { id: 3, name: "C" },
    ];
    const result = merge({ array1, array2, iteratee: "id" });
    expect(result.error).toBe(false);
    expect(result.message).toBe("Merged Successfully");
    // Should merge by id, keeping array2's values first
    expect(result.array).toEqual([
      { id: 2, name: "B2" },
      { id: 3, name: "C" },
      { id: 1, name: "A" },
    ]);
  });

  it("returns error if arrays are missing", () => {
    const result = merge({ array1: undefined, array2: [], iteratee: "id" });
    expect(result.error).toBe(true);
    expect(result.message).toMatch(/required/);
    expect(result.array).toEqual([]);
  });

  it("merges arrays of primitives", () => {
    const array1 = [1, 2, 3];
    const array2 = [2, 3, 4];
    const result = merge({ array1, array2, iteratee: undefined });
    expect(result.error).toBe(false);
    expect(result.array).toEqual([2, 3, 4, 1]);
  });

  it("merges with custom iteratee function", () => {
    const array1 = [{ x: 1 }, { x: 2 }];
    const array2 = [{ x: 2 }, { x: 3 }];
    const result = merge({ array1, array2, iteratee: (o: any) => o.x });
    expect(result.error).toBe(false);
    expect(result.array).toEqual([{ x: 2 }, { x: 3 }, { x: 1 }]);
  });
});
