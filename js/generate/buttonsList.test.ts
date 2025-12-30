import { describe, expect, it } from "vitest";

import { generateButtonsList } from "./buttonsList";

describe("generateButtonsList", () => {
  it("returns empty array for invalid list", () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    expect(generateButtonsList(null as any, "svc", "key", "prefix")).toEqual([]);
    expect(generateButtonsList([], "svc", "key", "prefix")).toEqual([]);
  });

  it("returns empty array for invalid service_name or key", () => {
    expect(generateButtonsList([{ key: "A" }], "", "key", "prefix")).toEqual([]);
    expect(generateButtonsList([{ key: "A" }], "svc", "", "prefix")).toEqual([]);
  });

  it("returns empty array for invalid payload_keys", () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    expect(generateButtonsList([{ key: "A" }], "svc", "key", "prefix", null as any)).toEqual([]);
  });

  it("returns empty array if any object missing key or payload_keys", () => {
    expect(generateButtonsList([{ key: "A" }], "svc", "key", "prefix", ["foo"])).toEqual([]);
    expect(generateButtonsList([{ key: "A", foo: "B" }, { key: "C" }], "svc", "key", "prefix", ["foo"])).toEqual([]);
  });

  it("generates buttons with only key", () => {
    const list = [{ name: "A" }, { name: "B" }];
    const result = generateButtonsList(list, "svc", "name", "prefix");
    expect(result).toEqual([
      { title: "A", payload: "prefixsvc" },
      { title: "B", payload: "prefixsvc" },
    ]);
  });

  it("generates buttons with payload_keys", () => {
    const list = [
      { name: "A", foo: "X", bar: "Y" },
      { name: "B", foo: "Z", bar: "W" },
    ];
    const result = generateButtonsList(list, "svc", "name", "prefix", ["foo", "bar"]);
    expect(result).toEqual([
      { title: "A", payload: "prefixsvc, (X, Y)" },
      { title: "B", payload: "prefixsvc, (Z, W)" },
    ]);
  });

  it("handles empty payload_keys", () => {
    const list = [{ name: "A" }];
    const result = generateButtonsList(list, "svc", "name", "prefix", []);
    expect(result).toEqual([{ title: "A", payload: "prefixsvc" }]);
  });
});
