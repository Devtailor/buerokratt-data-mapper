import { createSign, createVerify, generateKeyPairSync } from "crypto";
import fs from "fs";
import path from "path";

import ExcelJS from "exceljs";
import express, { Express } from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { parse, stringify } from "yaml";

import certificatesRouter from "./certificates";
import conversionRouter from "./conversion";
import cronRouter from "./cron";
import domainRouter from "./domain";
import formsRouter from "./forms";
import mergeRouter from "./merge";
import objectRouter from "./object";
import ruuterRouter, { type ServiceMap } from "./ruuter";
import utilsRouter from "./utils";
import validateRouter from "./validate";

vi.mock("crypto", async () => {
  const actual = await vi.importActual<typeof import("crypto")>("crypto");
  return { ...actual, generateKeyPairSync: vi.fn(actual.generateKeyPairSync) };
});

vi.mock("yaml", async () => {
  const actual = await vi.importActual<typeof import("yaml")>("yaml");
  return { ...actual, stringify: vi.fn(actual.stringify) };
});

describe("certificates controller", () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/certificates", certificatesRouter);
  });

  describe("GET /certificates/generate", () => {
    it("should generate RSA key pair with public and private keys (format and content checks)", async () => {
      const res = await request(app).get("/certificates/generate");

      const privateKeyContent = res.body.privateKey
        .replace("-----BEGIN RSA PRIVATE KEY-----", "")
        .replace("-----END RSA PRIVATE KEY-----", "")
        .replace(/\s/g, "");
      const publicKeyContent = res.body.publicKey
        .replace("-----BEGIN PUBLIC KEY-----", "")
        .replace("-----END PUBLIC KEY-----", "")
        .replace(/\s/g, "");

      expect(res.body).toHaveProperty("privateKey");
      expect(typeof res.body.privateKey).toBe("string");
      expect(res.body.privateKey).toContain("-----BEGIN RSA PRIVATE KEY-----");
      expect(res.body.privateKey).toContain("-----END RSA PRIVATE KEY-----");
      expect(privateKeyContent).toMatch(/^[A-Za-z0-9+/=]+$/);

      expect(res.body).toHaveProperty("publicKey");
      expect(typeof res.body.publicKey).toBe("string");
      expect(res.body.publicKey).toContain("-----BEGIN PUBLIC KEY-----");
      expect(res.body.publicKey).toContain("-----END PUBLIC KEY-----");
      expect(publicKeyContent).toMatch(/^[A-Za-z0-9+/=]+$/);

      expect(res.status).toBe(200);
    });

    it("should generate RSA key pair with public and private keys (validity checks)", async () => {
      const res = await request(app).get("/certificates/generate");

      const { privateKey, publicKey } = res.body;
      const message = "test message";

      const sign = createSign("RSA-SHA256");
      sign.update(message);
      sign.end();
      const signature = sign.sign(privateKey as string, "base64");

      const verify = createVerify("RSA-SHA256");
      verify.update(message);
      verify.end();
      const isValidSignature = verify.verify(publicKey as string, signature, "base64");

      expect(isValidSignature).toBe(true);
      expect(res.status).toBe(200);
    });

    it("should generate different keys on each call", async () => {
      const res1 = await request(app).get("/certificates/generate");
      const res2 = await request(app).get("/certificates/generate");

      expect(res1.body.privateKey).not.toBe(res2.body.privateKey);
      expect(res1.body.publicKey).not.toBe(res2.body.publicKey);
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });

    it("should return 500 when key generation fails", async () => {
      (generateKeyPairSync as any).mockImplementationOnce(() => {
        throw new Error("key generation failed");
      });

      const res = await request(app).get("/certificates/generate");

      expect(res.text).toBe("RSA key generation failed");
      expect(res.status).toBe(500);

      vi.restoreAllMocks();
    });
  });
});

describe("conversion controller", () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/conversion", conversionRouter);
  });

  describe("POST /conversion/csv_to_json", () => {
    it("should convert CSV to JSON", async () => {
      const data = { file: Buffer.from("name,age\nJohn,30\n\nJane,25").toString("base64") };
      const res = await request(app).post("/conversion/csv_to_json").send(data);

      expect(res.body).toEqual([
        ["name", "age"],
        ["John", "30"],
        ["Jane", "25"],
      ]);
      expect(res.status).toBe(200);
    });

    it("should handle empty CSV file", async () => {
      const data = { file: Buffer.from("").toString("base64") };
      const res = await request(app).post("/conversion/csv_to_json").send(data);

      expect(res.body).toEqual([]);
      expect(res.status).toBe(200);
    });

    it("should reject file exceeding size limit", async () => {
      const data = { file: Buffer.from("a".repeat(5 * 1024 * 1024)).toString("base64") };
      const res = await request(app).post("/conversion/csv_to_json").send(data);

      expect(res.text).toContain("PayloadTooLargeError");
      expect(res.status).toBe(413);
    });
  });

  describe("POST /conversion/yaml_to_json", () => {
    it("should convert YAML to JSON", async () => {
      const data = {
        file: Buffer.from(
          "name: test\nage: 30\nnested:\n  prop: value\nitems:\n  - item1\n  - item2\n  - item3",
        ).toString("base64"),
      };
      const res = await request(app).post("/conversion/yaml_to_json").send(data);

      expect(res.body).toEqual({
        name: "test",
        age: 30,
        nested: { prop: "value" },
        items: ["item1", "item2", "item3"],
      });
      expect(res.status).toBe(200);
    });

    it("should handle empty YAML file", async () => {
      const data = { file: Buffer.from("").toString("base64") };
      const res = await request(app).post("/conversion/yaml_to_json").send(data);

      expect(res.body).toEqual(null);
      expect(res.status).toBe(200);
    });

    it("should return 500 when YAML is invalid", async () => {
      const data = { file: Buffer.from("invalid: yaml: [unclosed").toString("base64") };
      const res = await request(app).post("/conversion/yaml_to_json").send(data);

      expect(res.text).toContain("YAMLParseError");
      expect(res.status).toBe(500);
    });

    it("should reject file exceeding size limit", async () => {
      const data = { file: Buffer.from("a".repeat(5 * 1024 * 1024)).toString("base64") };
      const res = await request(app).post("/conversion/yaml_to_json").send(data);

      expect(res.text).toContain("PayloadTooLargeError");
      expect(res.status).toBe(413);
    });
  });

  describe("POST /conversion/json_to_yaml", () => {
    it("should convert JSON to YAML", async () => {
      const data = { key: "value", nested: { prop: "value" } };
      const res = await request(app).post("/conversion/json_to_yaml").send(data);

      const parsed = parse(res.body.json as string);

      expect(parsed).toEqual(data);
      expect(res.status).toBe(200);
    });

    it("should handle stringify errors", async () => {
      (stringify as any).mockImplementationOnce(() => {
        throw new Error("stringify failed");
      });

      const res = await request(app).post("/conversion/json_to_yaml").send({});

      expect(res.status).toBe(500);

      vi.restoreAllMocks();
    });
  });

  describe("POST /conversion/json_to_yaml_domain", () => {
    it("should convert JSON to YAML domain format", async () => {
      const data = {
        name: "test",
        text: 'text with "quotes" and\nnewlines',
        items: [{ text: "first item" }, { text: "second item\nwith newline" }],
        level1: { level2: { text: "nested text\nwith newline" } },
      };
      const res = await request(app).post("/conversion/json_to_yaml_domain").send(data);

      const parsed = parse(res.body.json as string);

      expect(parsed).toEqual(data);
      expect(res.status).toBe(200);
    });

    it("should return 500 when conversion fails", async () => {
      const convertJsonToYamlDomainSpy = vi
        .spyOn(await import("../js/convert/index.js"), "convertJsonToYamlDomain")
        .mockImplementationOnce(() => {
          throw new Error("json to yaml domain conversion failed");
        });

      const data = { text: "test" };
      const res = await request(app).post("/conversion/json_to_yaml_domain").send(data);

      expect(res.body).toEqual({ error: "Failed to create file", details: "json to yaml domain conversion failed" });
      expect(convertJsonToYamlDomainSpy).toHaveBeenCalled();
      expect(res.status).toBe(500);

      vi.restoreAllMocks();
    });
  });

  describe("POST /conversion/json_to_yaml_data", () => {
    it("should convert JSON to YAML", async () => {
      const data = { data: { key: "value", nested: { prop: "value" } } };
      const res = await request(app).post("/conversion/json_to_yaml_data").send(data);

      const parsed = parse(res.body.yaml as string);

      expect(parsed).toEqual(data.data);
      expect(res.status).toBe(200);
    });

    it("should fallback to default stringify when error occurs", async () => {
      (stringify as any)
        .mockImplementationOnce(() => {
          throw new Error("formatting error");
        })
        .mockImplementationOnce(() => "fallback-yaml");

      const res = await request(app).post("/conversion/json_to_yaml_data").send({});

      expect(res.body).toEqual({ yaml: "fallback-yaml" });
      expect(res.status).toBe(200);

      vi.restoreAllMocks();
    });
  });

  describe("POST /conversion/string-replace", () => {
    it("should replace all occurrences of search string", async () => {
      const data = { data: "hellohello", search: "hello", replace: "hi" };
      const res = await request(app).post("/conversion/string-replace").send(data);

      expect(res.body).toBe("hihi");
      expect(res.status).toBe(200);
    });

    it("should handle special case when search string is '|'", async () => {
      const dataWithoutExamples = { data: "foo|bar", search: "|", replace: "" };
      const dataWithExamples = { data: "examples: foo|bar", search: "|", replace: "" };

      const resWithoutExamples = await request(app).post("/conversion/string-replace").send(dataWithoutExamples);
      const resWithExamples = await request(app).post("/conversion/string-replace").send(dataWithExamples);

      expect(resWithoutExamples.body).toBe("foo|bar");
      expect(resWithExamples.body).toBe("examples: foobar");
      expect(resWithoutExamples.status).toBe(200);
      expect(resWithExamples.status).toBe(200);
    });

    it("should return 400 when data is missing", async () => {
      const data = { search: "hello", replace: "hi" };
      const res = await request(app).post("/conversion/string-replace").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when data is not a string", async () => {
      const data = { data: 123, search: "hello", replace: "hi" };
      const res = await request(app).post("/conversion/string-replace").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when search is missing", async () => {
      const data = { data: "hellohello", replace: "hi" };
      const res = await request(app).post("/conversion/string-replace").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when search is not a string", async () => {
      const data = { data: "hello", search: 123, replace: "hi" };
      const res = await request(app).post("/conversion/string-replace").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when replace is missing", async () => {
      const data = { data: "hellohello", search: "hello" };
      const res = await request(app).post("/conversion/string-replace").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when replace is not a string", async () => {
      const data = { data: "hellohello", search: "hello", replace: 123 };
      const res = await request(app).post("/conversion/string-replace").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when body is empty", async () => {
      const data = {};
      const res = await request(app).post("/conversion/string-replace").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /conversion/string-split", () => {
    it("should split string by defined separator", async () => {
      const data = { data: "a,b,,c,", separator: "," };
      const res = await request(app).post("/conversion/string-split").send(data);

      expect(res.body).toEqual(["a", "b", "c"]);
      expect(res.status).toBe(200);
    });

    it("should return 400 when data is missing", async () => {
      const data = { separator: "," };
      const res = await request(app).post("/conversion/string-split").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when data is not a string", async () => {
      const data = { data: 123, separator: "," };
      const res = await request(app).post("/conversion/string-split").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when separator is missing", async () => {
      const data = { data: "a,b,,c," };
      const res = await request(app).post("/conversion/string-split").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when separator is not a string", async () => {
      const data = { data: "a,b,,c,", separator: 123 };
      const res = await request(app).post("/conversion/string-split").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when body is empty", async () => {
      const data = {};
      const res = await request(app).post("/conversion/string-split").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /conversion/string-to-array", () => {
    it("should convert string to array and remove some special characters", async () => {
      const data = { data: "&quot;item1&quot;\n- item2\n- item3\n\n" };
      const res = await request(app).post("/conversion/string-to-array").send(data);

      expect(res.body).toEqual(["item1", "item2", "item3"]);
      expect(res.status).toBe(200);
    });

    it("should return empty array when data is an empty string", async () => {
      const data = { data: "" };
      const res = await request(app).post("/conversion/string-to-array").send(data);

      expect(res.body).toEqual([]);
      expect(res.status).toBe(200);
    });

    it("should return 400 when data is missing", async () => {
      const data = {};
      const res = await request(app).post("/conversion/string-to-array").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when data is not a string", async () => {
      const data = { data: 123 };
      const res = await request(app).post("/conversion/string-to-array").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /conversion/csv-to-json", () => {
    it("should convert CSV to JSON", async () => {
      const data = { file: { "test.csv": "name,age\nJohn,30\nJane,25\nJim,35" } };
      const res = await request(app).post("/conversion/csv-to-json").send(data);

      expect(res.body).toEqual([
        ["name", "age"],
        ["John", "30"],
        ["Jane", "25"],
        ["Jim", "35"],
      ]);
      expect(res.status).toBe(200);
    });

    it("should return 400 when file is missing", async () => {
      const data = {};
      const res = await request(app).post("/conversion/csv-to-json").send(data);

      expect(res.body.error).toBe("No file uploaded");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /conversion/json-to-yaml-stories", () => {
    it("should convert JSON stories to YAML format", async () => {
      const data = {
        stories: [
          {
            story: "test_story_multiple_steps",
            steps: [
              { intent: "greet", entities: ["name"] },
              { action: "action_hello" },
              { slot_was_set: { slot: "slot" } },
              { condition: [{ active_loop: "form" }] },
              {},
            ],
          },
          {
            story: "test_story_single_step",
            steps: { intent: "goodbye", entities: ["name"] },
          },
        ],
      };
      const res = await request(app).post("/conversion/json-to-yaml-stories").send(data);

      const parsed = parse(res.body.json as string);

      expect(parsed).toEqual({
        version: "3.0",
        stories: [
          {
            story: "test_story_multiple_steps",
            steps: [
              { intent: "greet", entities: [{ name: "" }] },
              { action: "action_hello" },
              { slot_was_set: { slot: "slot" } },
              { condition: [{ active_loop: "form" }] },
            ],
          },
          {
            story: "test_story_single_step",
            steps: [{ intent: "goodbye", entities: [{ name: "" }] }],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it("should convert JSON rules to YAML format", async () => {
      const data = {
        rules: [
          {
            rule: "test_rule_multiple_steps",
            conversation_start: true,
            wait_for_user_input: false,
            steps: [
              { intent: "greet", entities: ["name", "email"] },
              { action: "action_hello" },
              { slot_was_set: { slot: "slot" } },
              { condition: [{ active_loop: "form" }] },
              {},
            ],
          },
          {
            rule: "test_rule_single_step",
            conversation_start: true,
            steps: { intent: "goodbye", entities: ["name"] },
          },
        ],
      };
      const res = await request(app).post("/conversion/json-to-yaml-stories").send(data);

      const parsed = parse(res.body.json as string);

      expect(parsed).toEqual({
        version: "3.0",
        rules: [
          {
            rule: "test_rule_multiple_steps",
            conversation_start: true,
            wait_for_user_input: false,
            steps: [
              { intent: "greet", entities: [{ name: "" }, { email: "" }] },
              { action: "action_hello" },
              { slot_was_set: { slot: "slot" } },
              { condition: [{ active_loop: "form" }] },
            ],
          },
          {
            rule: "test_rule_single_step",
            conversation_start: true,
            steps: [{ intent: "goodbye", entities: [{ name: "" }] }],
          },
        ],
      });
      expect(res.status).toBe(200);
    });

    it("should return 400 when stories is not an array", async () => {
      const data = { stories: "story" };
      const res = await request(app).post("/conversion/json-to-yaml-stories").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when rules is not an array", async () => {
      const data = { rules: "rule" };
      const res = await request(app).post("/conversion/json-to-yaml-stories").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when neither stories nor rules are provided", async () => {
      const data = {};
      const res = await request(app).post("/conversion/json-to-yaml-stories").send(data);

      expect(res.body.error).toBe("Invalid request body");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /conversion/chart-data-to-xlsx", () => {
    it("should convert chart data to Excel", async () => {
      const data = {
        data: [
          { name: "John", age: 30 },
          { name: "Jane", age: 25 },
        ],
      };
      const res = await request(app).post("/conversion/chart-data-to-xlsx").send(data);

      const xlsxDataArray = await request(app)
        .post("/conversion/xlsx-to-array")
        .send({ file: { "test.xlsx": res.body.base64String } });

      expect(xlsxDataArray.body).toEqual([
        ["name", "age"],
        ["John", 30],
        ["Jane", 25],
      ]);
      expect(res.status).toBe(200);
    });

    it("should handle empty data array", async () => {
      const data = { data: [] };
      const res = await request(app).post("/conversion/chart-data-to-xlsx").send(data);

      const xlsxDataArray = await request(app)
        .post("/conversion/xlsx-to-array")
        .send({ file: { "test.xlsx": res.body.base64String } });

      expect(xlsxDataArray.body).toEqual([]);
      expect(res.status).toBe(200);
    });

    it("should return 400 when data is missing", async () => {
      const data = {};
      const res = await request(app).post("/conversion/chart-data-to-xlsx").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when data is not an array", async () => {
      const data = { data: { name: "John", age: 30 } };
      const res = await request(app).post("/conversion/chart-data-to-xlsx").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /conversion/array-to-xlsx", () => {
    it("should convert array data to Excel", async () => {
      const data = {
        data: [
          ["name", "age"],
          ["John", "30"],
          ["Jane", "25"],
          ["", "20"],
        ],
      };
      const res = await request(app).post("/conversion/array-to-xlsx").send(data);

      const xlsxDataArray = await request(app)
        .post("/conversion/xlsx-to-array")
        .send({ file: { "test.xlsx": res.body.base64String } });

      expect(xlsxDataArray.body).toEqual([
        ["name", "age"],
        ["John", 30],
        ["Jane", 25],
        ["", 20],
      ]);
      expect(res.status).toBe(200);
    });

    it("should handle columns without eachCell method", async () => {
      const data = {
        data: [
          ["name", "age"],
          ["John", "30"],
        ],
      };

      const mockWorksheet = {
        addRow: vi.fn(),
        getColumn: vi.fn().mockReturnValue({ width: 0 }),
        columns: [null, { eachCell: "function" }, { eachCell: (): void => {}, width: 0 }],
      };
      vi.spyOn(ExcelJS.Workbook.prototype, "addWorksheet").mockReturnValueOnce(
        mockWorksheet as unknown as ExcelJS.Worksheet,
      );

      const res = await request(app).post("/conversion/array-to-xlsx").send(data);

      expect(res.body).toHaveProperty("base64String");
      expect(mockWorksheet.addRow).toHaveBeenCalled();
      expect(res.status).toBe(200);

      vi.restoreAllMocks();
    });

    it("should return 400 when data is missing", async () => {
      const data = {};
      const res = await request(app).post("/conversion/array-to-xlsx").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when data is not an array", async () => {
      const data = { data: "array" };
      const res = await request(app).post("/conversion/array-to-xlsx").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when data is not an array of arrays", async () => {
      const data = { data: ["array"] };
      const res = await request(app).post("/conversion/array-to-xlsx").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when data is not an array of string arrays", async () => {
      const data = { data: [[1]] };
      const res = await request(app).post("/conversion/array-to-xlsx").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /conversion/examples-array-to-xlsx", () => {
    it("should convert examples array to Excel", async () => {
      const data = { data: [["", "abc"], ["123"]] };
      const res = await request(app).post("/conversion/examples-array-to-xlsx").send(data);

      const xlsxDataArray = await request(app)
        .post("/conversion/xlsx-to-array")
        .send({ file: { "test.xlsx": res.body.base64String } });

      expect(xlsxDataArray.body).toEqual([[""], ["abc"], [123]]);
      expect(res.status).toBe(200);
    });

    it("should return 400 when data is missing", async () => {
      const data = {};
      const res = await request(app).post("/conversion/examples-array-to-xlsx").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when data is not an array", async () => {
      const data = { data: "array" };
      const res = await request(app).post("/conversion/examples-array-to-xlsx").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when data is not an array of arrays", async () => {
      const data = { data: ["array"] };
      const res = await request(app).post("/conversion/examples-array-to-xlsx").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when data is not an array of string arrays", async () => {
      const data = { data: [[1]] };
      const res = await request(app).post("/conversion/examples-array-to-xlsx").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /conversion/chats-to-xlsx", () => {
    it("should convert chats to Excel (language = et)", async () => {
      const data = {
        chatMessages: [
          { chatId: "1", content: "Buerokratt message", authorRole: "buerokratt", created: "2024-01-01T10:00:00Z" },
          { chatId: "1", content: "End-user message", authorRole: "end-user", created: "2024-01-01T10:01:00Z" },
          { chatId: "1", content: "Other message", authorRole: "other", created: "2024-01-01T10:02:00Z" },
        ],
        chatHeaders: ["Header1", "Header2"],
        chatRows: [["Row1", "Row2"]],
        chatIds: ["1"],
      };
      const res = await request(app).post("/conversion/chats-to-xlsx").send(data);

      const xlsxDataArray = await request(app)
        .post("/conversion/xlsx-to-array")
        .send({ file: { "test.xlsx": res.body.base64String } });

      expect(xlsxDataArray.body).toEqual([
        ["Vestlus #1"],
        ["Header1", "Header2"],
        ["Row1", "Row2"],
        ["Sõnumid"],
        ["", "Loodud", "Bot", "Client", "CSA"],
        ["", "01.01.2024 12:00:00", "Buerokratt message", "", ""],
        ["", "01.01.2024 12:01:00", "", "End-user message", ""],
        ["", "01.01.2024 12:02:00", "", "", "Other message"],
      ]);
      expect(res.status).toBe(200);
    });

    it("should handle multiple chats (language = en)", async () => {
      const data = {
        chatMessages: [
          { chatId: "1", content: "Chat 1 message", authorRole: "buerokratt", created: "2024-01-01T10:00:00Z" },
          { chatId: "2", content: "Chat 2 message", authorRole: "end-user", created: "2024-01-01T13:00:00Z" },
        ],
        chatHeaders: ["Header"],
        chatRows: [["Row1"], ["Row2"]],
        chatIds: ["1", "2"],
        language: "en",
      };
      const res = await request(app).post("/conversion/chats-to-xlsx").send(data);

      const xlsxDataArray = await request(app)
        .post("/conversion/xlsx-to-array")
        .send({ file: { "test.xlsx": res.body.base64String } });

      expect(xlsxDataArray.body).toEqual([
        ["Chat #1"],
        ["Header"],
        ["Row1"],
        ["Messages"],
        ["", "Created", "Bot", "Client", "CSA"],
        ["", "01.01.2024 12:00:00", "Chat 1 message", "", ""],
        ["Chat #2"],
        ["Header"],
        ["Row2"],
        ["Messages"],
        ["", "Created", "Bot", "Client", "CSA"],
        ["", "01.01.2024 15:00:00", "", "Chat 2 message", ""],
      ]);
      expect(res.status).toBe(200);
    });

    it("should handle columns without eachCell method", async () => {
      const data = {
        chatMessages: [{ chatId: "1", content: "TEST", authorRole: "buerokratt", created: "2024-01-01T10:00:00Z" }],
        chatHeaders: ["Header"],
        chatRows: [["Row1"]],
        chatIds: ["1"],
      };

      const mockWorksheet = {
        addRow: vi.fn(),
        columns: [null, { eachCell: "function" }, { eachCell: (): void => {}, width: 0 }],
      };
      vi.spyOn(ExcelJS.Workbook.prototype, "addWorksheet").mockReturnValueOnce(
        mockWorksheet as unknown as ExcelJS.Worksheet,
      );

      const res = await request(app).post("/conversion/chats-to-xlsx").send(data);

      expect(res.body).toHaveProperty("base64String");
      expect(mockWorksheet.addRow).toHaveBeenCalled();
      expect(res.status).toBe(200);

      vi.restoreAllMocks();
    });

    it("should return 500 when processing fails", async () => {
      const data = {};
      const res = await request(app).post("/conversion/chats-to-xlsx").send(data);

      expect(res.body).toEqual({ error: "Failed to export Excel" });
      expect(res.status).toBe(500);
    });
  });

  describe("POST /conversion/xlsx-to-array", () => {
    it("should convert Excel to array", async () => {
      const xlsxData = {
        data: [
          ["name", "age"],
          ["John", "30"],
          ["Jane", "25"],
          ["", "20"],
        ],
      };
      const xlsxBase64Data = await request(app).post("/conversion/array-to-xlsx").send(xlsxData);

      const data = { file: { "test.xlsx": xlsxBase64Data.body.base64String } };
      const res = await request(app).post("/conversion/xlsx-to-array").send(data);

      expect(res.body).toEqual([
        ["name", "age"],
        ["John", 30],
        ["Jane", 25],
        ["", 20],
      ]);
      expect(res.status).toBe(200);
    });

    it("should handle empty Excel file", async () => {
      const xlsxBase64Data = await request(app).post("/conversion/array-to-xlsx").send({ data: [] });

      const data = { file: { "test.xlsx": xlsxBase64Data.body.base64String } };
      const res = await request(app).post("/conversion/xlsx-to-array").send(data);

      expect(res.body).toEqual([]);
      expect(res.status).toBe(200);
    });

    // edge case (ExcelJS typically returns row.values as an array)
    it("should handle Excel row with non-array values", async () => {
      const xlsxBase64Data = await request(app).post("/conversion/array-to-xlsx").send({ data: [] });

      const getWorksheetSpy = vi.spyOn(ExcelJS.Workbook.prototype, "getWorksheet").mockReturnValueOnce({
        eachRow: (callback: any) => {
          callback({ values: "value" }, 1);
        },
      } as unknown as ExcelJS.Worksheet);

      const data = { file: { "test.xlsx": xlsxBase64Data.body.base64String } };
      const res = await request(app).post("/conversion/xlsx-to-array").send(data);

      expect(res.body).toEqual([[]]);
      expect(getWorksheetSpy).toHaveBeenCalled();
      expect(res.status).toBe(200);

      vi.restoreAllMocks();
    });

    it("should return 400 when worksheet is not found", async () => {
      const workbook = new ExcelJS.Workbook();

      const buffer = await workbook.xlsx.writeBuffer();
      const base64Data = Buffer.from(buffer).toString("base64");

      const data = { file: { "test.xlsx": base64Data } };
      const res = await request(app).post("/conversion/xlsx-to-array").send(data);

      expect(res.body).toEqual({ error: "Worksheet not found in Excel file" });
      expect(res.status).toBe(400);
    });

    it("should return 400 when file is missing", async () => {
      const data = {};
      const res = await request(app).post("/conversion/xlsx-to-array").send(data);

      expect(res.body).toEqual({ error: "No file uploaded" });
      expect(res.status).toBe(400);
    });

    it("should return 500 when processing fails", async () => {
      const data = { file: { "test.xlsx": "invalid-base64-data" } };
      const res = await request(app).post("/conversion/xlsx-to-array").send(data);

      expect(res.body).toEqual(expect.objectContaining({ error: "Failed to process Excel file" }));
      expect(res.status).toBe(500);
    });
  });
});

describe("cron controller", () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/cron", cronRouter);
  });

  describe("POST /cron/generate-expression-date-days", () => {
    it("should generate cron expression and start date from ISO date string", async () => {
      const data = { date: "2024-01-15T14:30:45.123Z", days: "MON-FRI" };
      const res = await request(app).post("/cron/generate-expression-date-days").send(data);

      expect(res.body).toEqual({
        expression: "45 30 14 ? * MON-FRI *",
        startDate: Date.parse("2024-01-15T14:30:45.123Z"),
      });
      expect(res.status).toBe(200);
    });

    it("should return 400 when date is missing", async () => {
      const data = { days: "MON-FRI" };
      const res = await request(app).post("/cron/generate-expression-date-days").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when date is not a string", async () => {
      const data = { date: 20240115, days: "MON-FRI" };
      const res = await request(app).post("/cron/generate-expression-date-days").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when days is missing", async () => {
      const data = { date: "2024-01-15T14:30:45.123Z" };
      const res = await request(app).post("/cron/generate-expression-date-days").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when days is not a string", async () => {
      const data = { date: "2024-01-15T14:30:45.123Z", days: 123 };
      const res = await request(app).post("/cron/generate-expression-date-days").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 500 when date format is not valid ISO string", async () => {
      const data = { date: "2024-01-15", days: "MON-FRI" };
      const res = await request(app).post("/cron/generate-expression-date-days").send(data);

      expect(res.text).toContain("TypeError");
      expect(res.status).toBe(500);
    });
  });
});

describe("domain controller", () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/domain", domainRouter);
  });

  describe("POST /domain/update-existing-response", () => {
    it("should update existing response and delete old value", async () => {
      const data = {
        json: { old_key: [{ text: "old value" }] },
        searchKey: "old_key",
        newKey: "new_key",
        newKeyValue: "new value",
      };
      const res = await request(app).post("/domain/update-existing-response").send(data);

      expect(res.body).toEqual({ new_key: [{ text: "new value" }] });
      expect(res.status).toBe(200);
    });

    it("should update existing response and keep old value", async () => {
      const data = {
        json: { old_key: [{ text: "old value" }] },
        searchKey: "old_key",
        newKey: "new_key",
        newKeyValue: "new value",
        deleteOldValue: false,
      };
      const res = await request(app).post("/domain/update-existing-response").send(data);

      expect(res.body).toEqual({ old_key: [{ text: "old value" }], new_key: [{ text: "new value" }] });
      expect(res.status).toBe(200);
    });

    it("should not create new key when no matching key found and createIfAbsent is false", async () => {
      const data = {
        json: { old_key: [{ text: "old value" }] },
        searchKey: "nonexistent",
        newKey: "new_key",
        newKeyValue: "new value",
      };
      const res = await request(app).post("/domain/update-existing-response").send(data);

      expect(res.body).toEqual({ old_key: [{ text: "old value" }] });
      expect(res.status).toBe(200);
    });

    it("should create new key when no matching key found and createIfAbsent is true", async () => {
      const data = {
        json: { old_key: [{ text: "old value" }] },
        searchKey: "nonexistent",
        newKey: "new_key",
        newKeyValue: "new value",
        createIfAbsent: true,
      };
      const res = await request(app).post("/domain/update-existing-response").send(data);

      expect(res.body).toEqual({ old_key: [{ text: "old value" }], new_key: [{ text: "new value" }] });
      expect(res.status).toBe(200);
    });

    it("should handle multiple keys including searchKey", async () => {
      const data = {
        json: {
          old_key_1: [{ text: "one value" }],
          old_key_2: [{ text: "two value" }],
          other_key: [{ text: "other" }],
        },
        searchKey: "old_key",
        newKey: "new_key",
        newKeyValue: "new",
      };
      const res = await request(app).post("/domain/update-existing-response").send(data);

      expect(res.body).toEqual({ new_key: [{ text: "new" }], other_key: [{ text: "other" }] });
      expect(res.status).toBe(200);
    });

    it("should handle empty json object", async () => {
      const data = { json: {}, searchKey: "old_key", newKey: "new_key", newKeyValue: "new value" };
      const res = await request(app).post("/domain/update-existing-response").send(data);

      expect(res.body).toEqual({});
      expect(res.status).toBe(200);
    });

    it("should return 400 when json is missing", async () => {
      const data = { searchKey: "old_key", newKey: "new_key", newKeyValue: "new value" };
      const res = await request(app).post("/domain/update-existing-response").send(data);

      expect(res.body.message).toBe("json, searchKey, newKey, newKeyValue are required fields");
      expect(res.status).toBe(400);
    });

    it("should return 400 when searchKey is missing", async () => {
      const data = { json: { old_key: [{ text: "old value" }] }, newKey: "new_key", newKeyValue: "new value" };
      const res = await request(app).post("/domain/update-existing-response").send(data);

      expect(res.body.message).toBe("json, searchKey, newKey, newKeyValue are required fields");
      expect(res.status).toBe(400);
    });

    it("should return 400 when newKey is missing", async () => {
      const data = { json: { old_key: [{ text: "old value" }] }, searchKey: "old_key", newKeyValue: "new value" };
      const res = await request(app).post("/domain/update-existing-response").send(data);

      expect(res.body.message).toBe("json, searchKey, newKey, newKeyValue are required fields");
      expect(res.status).toBe(400);
    });

    it("should return 400 when newKeyValue is missing", async () => {
      const data = { json: { old_key: [{ text: "old value" }] }, searchKey: "old_key", newKey: "new_key" };
      const res = await request(app).post("/domain/update-existing-response").send(data);

      expect(res.body.message).toBe("json, searchKey, newKey, newKeyValue are required fields");
      expect(res.status).toBe(400);
    });
  });
});

describe("forms controller", () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/forms", formsRouter);
  });

  describe("POST /forms/detailed-information", () => {
    it("should return form details with all fields", async () => {
      const data = {
        name: "form",
        slots: { ignored_intents: ["intent1", "intent2"], required_slots: ["slot1", "slot2"] },
        responses: [
          { name: "utter_form", response: [{ text: "form response text" }] },
          { name: "utter_ask_slot1", response: [{ text: "slot1 question" }] },
          { name: "utter_ask_slot2", response: [{ text: "slot2 question" }] },
        ],
      };
      const res = await request(app).post("/forms/detailed-information").send(data);

      expect(res.body).toEqual({
        formResponse: "form response text",
        requiredSlots: [
          { slot_name: "slot1", question: "slot1 question" },
          { slot_name: "slot2", question: "slot2 question" },
        ],
        ignoredIntents: ["intent1", "intent2"],
      });
      expect(res.status).toBe(200);
    });

    it("should return empty formResponse when form response is not found", async () => {
      const data = {
        name: "form",
        slots: { ignored_intents: ["intent1", "intent2"], required_slots: ["slot1", "slot2"] },
        responses: [
          { name: "utter_ask_slot1", response: [{ text: "slot1 question" }] },
          { name: "utter_ask_slot2", response: [{ text: "slot2 question" }] },
        ],
      };
      const res = await request(app).post("/forms/detailed-information").send(data);

      expect(res.body).toEqual({
        formResponse: "",
        requiredSlots: [
          { slot_name: "slot1", question: "slot1 question" },
          { slot_name: "slot2", question: "slot2 question" },
        ],
        ignoredIntents: ["intent1", "intent2"],
      });
      expect(res.status).toBe(200);
    });

    it("should return empty ignoredIntents when ignored_intents is missing", async () => {
      const data = {
        name: "form",
        slots: { required_slots: ["slot1", "slot2"] },
        responses: [
          { name: "utter_form", response: [{ text: "form response text" }] },
          { name: "utter_ask_slot1", response: [{ text: "slot1 question" }] },
          { name: "utter_ask_slot2", response: [{ text: "slot2 question" }] },
        ],
      };
      const res = await request(app).post("/forms/detailed-information").send(data);

      expect(res.body).toEqual({
        formResponse: "form response text",
        requiredSlots: [
          { slot_name: "slot1", question: "slot1 question" },
          { slot_name: "slot2", question: "slot2 question" },
        ],
        ignoredIntents: [],
      });
      expect(res.status).toBe(200);
    });

    it("should return empty requiredSlots when required_slots is missing", async () => {
      const data = {
        name: "form",
        slots: { ignored_intents: ["intent1", "intent2"] },
        responses: [{ name: "utter_form", response: [{ text: "form response text" }] }],
      };
      const res = await request(app).post("/forms/detailed-information").send(data);

      expect(res.body).toEqual({
        formResponse: "form response text",
        requiredSlots: [],
        ignoredIntents: ["intent1", "intent2"],
      });
      expect(res.status).toBe(200);
    });

    it("should filter out slots that don't have matching responses", async () => {
      const data = {
        name: "form",
        slots: { required_slots: ["slot1", "slot2"] },
        responses: [
          { name: "utter_form", response: [{ text: "form response text" }] },
          { name: "utter_ask_slot1", response: [{ text: "slot1 question" }] },
        ],
      };
      const res = await request(app).post("/forms/detailed-information").send(data);

      expect(res.body).toEqual({
        formResponse: "form response text",
        requiredSlots: [{ slot_name: "slot1", question: "slot1 question" }],
        ignoredIntents: [],
      });
      expect(res.status).toBe(200);
    });

    it("should handle empty responses array", async () => {
      const data = {
        name: "form",
        slots: { ignored_intents: ["intent1", "intent2"], required_slots: ["slot1", "slot2"] },
        responses: [],
      };
      const res = await request(app).post("/forms/detailed-information").send(data);

      expect(res.body).toEqual({ formResponse: "", requiredSlots: [], ignoredIntents: ["intent1", "intent2"] });
      expect(res.status).toBe(200);
    });

    it("should return 400 when name is missing", async () => {
      const data = { slots: { required_slots: ["slot1", "slot2"] }, responses: [] };
      const res = await request(app).post("/forms/detailed-information").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when name is not a string", async () => {
      const data = { name: 123, slots: { required_slots: ["slot1", "slot2"] }, responses: [] };
      const res = await request(app).post("/forms/detailed-information").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when slots is missing", async () => {
      const data = { name: "form", responses: [] };
      const res = await request(app).post("/forms/detailed-information").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when slots is not an object", async () => {
      const data = { name: "form", slots: "object", responses: [] };
      const res = await request(app).post("/forms/detailed-information").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when responses is missing", async () => {
      const data = { name: "form", slots: { required_slots: ["slot1", "slot2"] } };
      const res = await request(app).post("/forms/detailed-information").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when responses is not an array", async () => {
      const data = { name: "form", slots: { required_slots: ["slot1", "slot2"] }, responses: "array" };
      const res = await request(app).post("/forms/detailed-information").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when body is empty", async () => {
      const data = {};
      const res = await request(app).post("/forms/detailed-information").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });
});

describe("merge controller", () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/merge", mergeRouter);
  });

  describe("POST /merge/objects", () => {
    it("should merge two objects", async () => {
      const data = { object1: { a: 1, b: 2 }, object2: { c: 3, d: 4 } };
      const res = await request(app).post("/merge/objects").send(data);

      expect(res.body).toEqual({ a: 1, b: 2, c: 3, d: 4 });
      expect(res.status).toBe(200);
    });

    it("should override object1 values with object2 when keys overlap", async () => {
      const data = { object1: { a: 1, b: 2 }, object2: { b: 3, c: 4 } };
      const res = await request(app).post("/merge/objects").send(data);

      expect(res.body).toEqual({ a: 1, b: 3, c: 4 });
      expect(res.status).toBe(200);
    });

    it("should return 400 when object1 is missing", async () => {
      const data = { object2: { c: 3 } };
      const res = await request(app).post("/merge/objects").send(data);

      expect(res.text).toBe("Both objects are required");
      expect(res.status).toBe(400);
    });

    it("should return 400 when object2 is missing", async () => {
      const data = { object1: { a: 1 } };
      const res = await request(app).post("/merge/objects").send(data);

      expect(res.text).toBe("Both objects are required");
      expect(res.status).toBe(400);
    });

    it("should return 400 when both objects are missing", async () => {
      const data = {};
      const res = await request(app).post("/merge/objects").send(data);

      expect(res.text).toBe("Both objects are required");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /merge/response_objects", () => {
    it("should merge two objects and process text fields in non-array objects", async () => {
      const data = { object1: { a: { text: "line1\n\n\n\nline2" } }, object2: { b: 1 } };
      const res = await request(app).post("/merge/response_objects").send(data);

      expect(res.body).toEqual({ a: { text: "line1\\n\\nline2" }, b: 1 });
      expect(res.status).toBe(200);
    });

    it("should merge two objects and process text fields in arrays", async () => {
      const data = { object1: { a: [{ text: "line1\n\n\nline2" }] }, object2: { b: 1 } };
      const res = await request(app).post("/merge/response_objects").send(data);

      expect(res.body).toEqual({ a: [{ text: "line1\\n\\nline2" }], b: 1 });
      expect(res.status).toBe(200);
    });

    it("should return 400 when object1 is missing", async () => {
      const data = { object2: { a: 1 } };
      const res = await request(app).post("/merge/response_objects").send(data);

      expect(res.text).toBe("Both objects are required");
      expect(res.status).toBe(400);
    });

    it("should return 400 when object2 is missing", async () => {
      const data = { object1: { a: 1 } };
      const res = await request(app).post("/merge/response_objects").send(data);

      expect(res.text).toBe("Both objects are required");
      expect(res.status).toBe(400);
    });

    it("should return 400 when both objects are missing", async () => {
      const data = {};
      const res = await request(app).post("/merge/response_objects").send(data);

      expect(res.text).toBe("Both objects are required");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /merge/remove-key", () => {
    it("should remove specified key from object", async () => {
      const data = { object: { a: 1, b: 2, c: 3 }, key: "b" };
      const res = await request(app).post("/merge/remove-key").send(data);

      expect(res.body).toEqual({ a: 1, c: 3 });
      expect(res.status).toBe(200);
    });

    it("should not remove key from object if it does not exist", async () => {
      const data = { object: { a: 1, c: 3 }, key: "b" };
      const res = await request(app).post("/merge/remove-key").send(data);

      expect(res.body).toEqual({ a: 1, c: 3 });
      expect(res.status).toBe(200);
    });

    it("should return 400 when object is missing", async () => {
      const data = { key: "b" };
      const res = await request(app).post("/merge/remove-key").send(data);

      expect(res.text).toBe("Both object and key are required");
      expect(res.status).toBe(400);
    });

    it("should return 400 when key is missing", async () => {
      const data = { object: { a: 1 } };
      const res = await request(app).post("/merge/remove-key").send(data);

      expect(res.text).toBe("Both object and key are required");
      expect(res.status).toBe(400);
    });

    it("should return 400 when both object and key are missing", async () => {
      const data = {};
      const res = await request(app).post("/merge/remove-key").send(data);

      expect(res.text).toBe("Both object and key are required");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /merge/remove-array-value", () => {
    it("should remove specified value from array", async () => {
      const data = { array: ["a", "b"], value: "b" };
      const res = await request(app).post("/merge/remove-array-value").send(data);

      expect(res.body).toEqual(["a"]);
      expect(res.status).toBe(200);
    });

    it("should return empty array when all values match", async () => {
      const data = { array: ["a", "a"], value: "a" };
      const res = await request(app).post("/merge/remove-array-value").send(data);

      expect(res.body).toEqual([]);
      expect(res.status).toBe(200);
    });

    it("should not remove value from array if it does not exist", async () => {
      const data = { array: ["a", "b"], value: "c" };
      const res = await request(app).post("/merge/remove-array-value").send(data);

      expect(res.body).toEqual(["a", "b"]);
      expect(res.status).toBe(200);
    });

    it("should return 400 when array is missing", async () => {
      const data = { value: "b" };
      const res = await request(app).post("/merge/remove-array-value").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when array is not an array", async () => {
      const data = { array: "array", value: "b" };
      const res = await request(app).post("/merge/remove-array-value").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when value is missing", async () => {
      const data = { array: ["a", "b"] };
      const res = await request(app).post("/merge/remove-array-value").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when value is not a string", async () => {
      const data = { array: ["a", "b"], value: 123 };
      const res = await request(app).post("/merge/remove-array-value").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /merge/replace-array-element", () => {
    it("should replace element with string value", async () => {
      const data = { array: ["a", "b"], element: "b", newValue: "x" };
      const res = await request(app).post("/merge/replace-array-element").send(data);

      expect(res.body).toEqual(["a", "x"]);
      expect(res.status).toBe(200);
    });

    it("should replace element with object value", async () => {
      const data = { array: ["a", "b"], element: "b", newValue: { key: "x" } };
      const res = await request(app).post("/merge/replace-array-element").send(data);

      expect(res.body).toEqual(["a", { key: "x" }]);
      expect(res.status).toBe(200);
    });

    it("should not replace element if it does not exist", async () => {
      const data = { array: ["a", "b"], element: "c", newValue: "x" };
      const res = await request(app).post("/merge/replace-array-element").send(data);

      expect(res.text).toBe("Array element c is missing");
      expect(res.status).toBe(400);
    });

    it("should return 400 when array is missing", async () => {
      const data = { element: "b", newValue: "x" };
      const res = await request(app).post("/merge/replace-array-element").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when array is not an array", async () => {
      const data = { array: "array", element: "b", newValue: "x" };
      const res = await request(app).post("/merge/replace-array-element").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when element is missing", async () => {
      const data = { array: ["a", "b"], newValue: "x" };
      const res = await request(app).post("/merge/replace-array-element").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when element is not a string", async () => {
      const data = { array: ["a", "b"], element: 123, newValue: "x" };
      const res = await request(app).post("/merge/replace-array-element").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when newValue is missing", async () => {
      const data = { array: ["a", "b"], element: "b" };
      const res = await request(app).post("/merge/replace-array-element").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when newValue is not a string or object", async () => {
      const data = { array: ["a", "b"], element: "b", newValue: 123 };
      const res = await request(app).post("/merge/replace-array-element").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when newValue is an array", async () => {
      const data = { array: ["a", "b"], element: "b", newValue: ["x", "y"] };
      const res = await request(app).post("/merge/replace-array-element").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /merge/multi-objects", () => {
    it("should merge multiple objects", async () => {
      const data = { object1: { a: 1 }, object2: { b: 2 }, object3: { c: 3 } };
      const res = await request(app).post("/merge/multi-objects").send(data);

      expect(res.body).toEqual({ a: 1, b: 2, c: 3 });
      expect(res.status).toBe(200);
    });

    it("should merge multiple objects and override values when keys overlap", async () => {
      const data = { object1: { a: 1, b: 2 }, object2: { b: 3, c: 4 }, object3: { c: 5, d: 6 } };
      const res = await request(app).post("/merge/multi-objects").send(data);

      expect(res.body).toEqual({ a: 1, b: 3, c: 5, d: 6 });
      expect(res.status).toBe(200);
    });

    it("should return 400 when less than two objects are provided", async () => {
      const data = { object: { a: 1 } };
      const res = await request(app).post("/merge/multi-objects").send(data);

      expect(res.text).toBe("At least two object are required");
      expect(res.status).toBe(400);
    });

    it("should return empty object when object(s) are missing", async () => {
      const data = {};
      const res = await request(app).post("/merge/multi-objects").send(data);

      expect(res.body).toEqual({});
      expect(res.status).toBe(200);
    });
  });
});

describe("object controller", () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/object", objectRouter);
  });

  describe("POST /object/rules/remove-by-intent-name", () => {
    it("should keep rules when they do not contain the search intent name", async () => {
      const data = { rulesJson: [{ rule: "goodbye", steps: ["intent_goodbye"] }], searchIntentName: "greet" };
      const res = await request(app).post("/object/rules/remove-by-intent-name").send(data);

      expect(res.body.result).toHaveLength(1);
      expect(res.body.result).toEqual([{ rule: "goodbye", steps: ["intent_goodbye"] }]);
      expect(res.status).toBe(200);
    });

    it("should remove rules when they contain the search intent name", async () => {
      const data = { rulesJson: [{ rule: "greet", steps: ["intent_greet"] }], searchIntentName: "greet" };
      const res = await request(app).post("/object/rules/remove-by-intent-name").send(data);

      expect(res.body.result).toEqual([]);
      expect(res.status).toBe(200);
    });

    it("should return 400 when rulesJson is missing", async () => {
      const data = { searchIntentName: "greet" };
      const res = await request(app).post("/object/rules/remove-by-intent-name").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when rulesJson is not an array", async () => {
      const data = { rulesJson: "array", searchIntentName: "greet" };
      const res = await request(app).post("/object/rules/remove-by-intent-name").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when searchIntentName is missing", async () => {
      const data = { rulesJson: [{ rule: "test" }] };
      const res = await request(app).post("/object/rules/remove-by-intent-name").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when searchIntentName is not a string", async () => {
      const data = { rulesJson: [{ rule: "test" }], searchIntentName: 123 };
      const res = await request(app).post("/object/rules/remove-by-intent-name").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when searchIntentName contains illegal characters", async () => {
      const data = { rulesJson: [{ rule: "test" }], searchIntentName: "greet!" };
      const res = await request(app).post("/object/rules/remove-by-intent-name").send(data);

      expect(res.body.error).toBe("Search intent name contains illegal characters");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /object/responses/remove-by-intent-name", () => {
    it("should remove responses matching the intent pattern", async () => {
      const data = {
        responses: {
          utter_greet: "hello",
          utter_goodbye: "goodbye",
          utter_help: "help text",
          other_key: "other value",
        },
        intent: "greet",
      };
      const res = await request(app).post("/object/responses/remove-by-intent-name").send(data);

      expect(res.body).toEqual({ utter_goodbye: "goodbye", utter_help: "help text", other_key: "other value" });
      expect(res.body).not.toHaveProperty("utter_greet");
      expect(res.status).toBe(200);
    });

    it("should return empty object when all responses match the intent pattern", async () => {
      const data = { responses: { utter_greet: "hello" }, intent: "greet" };
      const res = await request(app).post("/object/responses/remove-by-intent-name").send(data);

      expect(res.body).toEqual({});
      expect(res.status).toBe(200);
    });

    it("should return 400 when responses is missing", async () => {
      const data = { intent: "greet" };
      const res = await request(app).post("/object/responses/remove-by-intent-name").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when responses is not an object", async () => {
      const data = { responses: "object", intent: "greet" };
      const res = await request(app).post("/object/responses/remove-by-intent-name").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when intent is missing", async () => {
      const data = { responses: { utter_greet: "hello" } };
      const res = await request(app).post("/object/responses/remove-by-intent-name").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when intent is not a string", async () => {
      const data = { responses: { utter_greet: "hello" }, intent: 123 };
      const res = await request(app).post("/object/responses/remove-by-intent-name").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when intent contains illegal characters", async () => {
      const data = { responses: { utter_greet: "hello" }, intent: "greet!" };
      const res = await request(app).post("/object/responses/remove-by-intent-name").send(data);

      expect(res.body.error).toBe("Intent name contains illegal characters");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /object/replace/key-value-in-obj", () => {
    it("should replace key and value in object", async () => {
      const data = {
        object: { oldKey: "oldValue", someKey: "someValue" },
        oldKey: "oldKey",
        newKey: "newKey",
        newValue: "newValue",
      };
      const res = await request(app).post("/object/replace/key-value-in-obj").send(data);

      expect(res.body).toEqual({ newKey: "newValue", someKey: "someValue" });
      expect(res.status).toBe(200);
    });

    it("should return same object when oldKey does not exist", async () => {
      const data = {
        object: { key1: "value1", key2: "value2" },
        oldKey: "nonexistent",
        newKey: "newKey",
        newValue: "newValue",
      };
      const res = await request(app).post("/object/replace/key-value-in-obj").send(data);

      expect(res.body).toEqual({ key1: "value1", key2: "value2" });
      expect(res.status).toBe(200);
    });

    it("should return empty object when input object is empty", async () => {
      const data = { object: {}, oldKey: "oldKey", newKey: "newKey", newValue: "newValue" };
      const res = await request(app).post("/object/replace/key-value-in-obj").send(data);

      expect(res.body).toEqual({});
      expect(res.status).toBe(200);
    });

    it("should return 500 when object is missing", async () => {
      const data = { oldKey: "oldKey", newKey: "newKey", newValue: "newValue" };
      const res = await request(app).post("/object/replace/key-value-in-obj").send(data);

      expect(res.text).toContain("TypeError: Cannot convert undefined or null to object");
      expect(res.status).toBe(500);
    });
  });

  describe("POST /object/array/replace-next-element", () => {
    it("should replace the element after the found element", async () => {
      const data = { array: ["1", "2", "3", "4"], element: "2", newInput: 999 };
      const res = await request(app).post("/object/array/replace-next-element").send(data);

      expect(res.body.array).toEqual(["1", "2", "999", "4"]);
      expect(res.status).toBe(200);
    });

    it("should not replace when element is last in array", async () => {
      const data = { array: ["1", "2", "3"], element: "3", newInput: 999 };
      const res = await request(app).post("/object/array/replace-next-element").send(data);

      expect(res.body.array).toEqual(["1", "2", "3"]);
      expect(res.status).toBe(200);
    });

    it("should not replace when element is not found", async () => {
      const data = { array: ["1", "2", "3"], element: "4", newInput: 999 };
      const res = await request(app).post("/object/array/replace-next-element").send(data);

      expect(res.body.array).toEqual(["1", "2", "3"]);
      expect(res.status).toBe(200);
    });

    it("should return 400 when array is missing", async () => {
      const data = { element: "1", newInput: 999 };
      const res = await request(app).post("/object/array/replace-next-element").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when array is not an array", async () => {
      const data = { array: "array", element: "1", newInput: 999 };
      const res = await request(app).post("/object/array/replace-next-element").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when element is missing", async () => {
      const data = { array: ["1", "2"], newInput: 999 };
      const res = await request(app).post("/object/array/replace-next-element").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when element is not a string", async () => {
      const data = { array: ["1", "2"], element: 3, newInput: 999 };
      const res = await request(app).post("/object/array/replace-next-element").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when newInput is missing", async () => {
      const data = { array: ["1", "2"], element: "1" };
      const res = await request(app).post("/object/array/replace-next-element").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when newInput is non-numeric", async () => {
      const data = { array: ["1", "2"], element: "1", newInput: "non-numeric" };
      const res = await request(app).post("/object/array/replace-next-element").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /object/get-selected-csa-nps", () => {
    it("should separate periodNps by customer support name", async () => {
      const data = {
        data: [
          { id: 1, name: "John", customerSupportFullName: "John Doe", periodNps: 8.5 },
          { id: 2, name: "Jane", customerSupportFullName: "Jane Smith", periodNps: 9.0 },
          { id: 3, name: "John", customerSupportFullName: "John Doe", periodNps: 7.5 },
        ],
      };
      const res = await request(app).post("/object/get-selected-csa-nps").send(data);

      expect(res.body.response).toHaveLength(3);
      expect(res.body.response).toEqual([
        { id: 1, name: "John", customerSupportFullName: "John Doe" },
        { id: 2, name: "Jane", customerSupportFullName: "Jane Smith" },
        { id: 3, name: "John", customerSupportFullName: "John Doe" },
      ]);
      expect(res.body.periodNpsByCsa).toEqual({ "John Doe": 8.5, "Jane Smith": 9.0 });
      expect(res.status).toBe(200);
    });

    it("should handle empty data array", async () => {
      const data = { data: [] };
      const res = await request(app).post("/object/get-selected-csa-nps").send(data);

      expect(res.body.response).toEqual([]);
      expect(res.body.periodNpsByCsa).toEqual({});
      expect(res.status).toBe(200);
    });

    it("should return 400 when data is missing", async () => {
      const data = {};
      const res = await request(app).post("/object/get-selected-csa-nps").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when data is not an array", async () => {
      const data = { data: "array" };
      const res = await request(app).post("/object/get-selected-csa-nps").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });
});

describe("ruuter controller", () => {
  let app: Express;

  const tempDir = path.join(__dirname, "test-ruuter-dir");
  const ruuterDir = path.join(tempDir, "Ruuter");

  const setupDirectories = (): void => {
    process.env.CONTENT_FOLDER = tempDir;

    fs.mkdirSync(path.join(ruuterDir, "POST", "active"), { recursive: true });
    fs.mkdirSync(path.join(ruuterDir, "POST", "inactive"), { recursive: true });
    fs.mkdirSync(path.join(ruuterDir, "GET", "active"), { recursive: true });
    fs.mkdirSync(path.join(ruuterDir, "GET", "inactive"), { recursive: true });

    fs.mkdirSync(path.join(ruuterDir, "POST", "sticky", "active"), { recursive: true });
    fs.mkdirSync(path.join(ruuterDir, "POST", "sticky", "inactive"), { recursive: true });
    fs.mkdirSync(path.join(ruuterDir, "GET", "sticky", "active"), { recursive: true });
  };

  const cleanup = (): void => {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/ruuter", ruuterRouter);
  });

  beforeEach(() => {
    cleanup();
    setupDirectories();
  });

  afterEach(() => {
    cleanup();
    delete process.env.CONTENT_FOLDER;
  });

  describe("GET /ruuter/list", () => {
    it("should return list of all services", async () => {
      fs.writeFileSync(path.join(ruuterDir, "POST", "active", "postActiveService.yml"), stringify({ test: "data" }));
      fs.writeFileSync(
        path.join(ruuterDir, "POST", "inactive", "postInactiveService.yml"),
        stringify({ test: "data" }),
      );
      fs.writeFileSync(path.join(ruuterDir, "GET", "active", "getActiveService.yml"), stringify({ test: "data" }));

      const res = await request(app).get("/ruuter/list");

      expect(res.body).toHaveLength(3);
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "postActiveService", type: "POST", status: "active" }),
          expect.objectContaining({ name: "postInactiveService", type: "POST", status: "inactive" }),
          expect.objectContaining({ name: "getActiveService", type: "GET", status: "active" }),
        ]),
      );
      expect(res.status).toBe(200);
    });

    it("should return list where only yml files are included", async () => {
      fs.writeFileSync(path.join(ruuterDir, "POST", "active", "service.txt"), "test");
      fs.writeFileSync(path.join(ruuterDir, "POST", "active", "service.yml"), stringify({ test: "data" }));

      const res = await request(app).get("/ruuter/list");

      expect(res.body).toHaveLength(1);
      expect(res.body).toEqual([expect.objectContaining({ name: "service", type: "POST", status: "active" })]);
      expect(res.status).toBe(200);
    });

    it("should return empty array when no services exist", async () => {
      const res = await request(app).get("/ruuter/list");

      expect(res.body).toEqual([]);
      expect(res.status).toBe(200);
    });
  });

  describe("GET /ruuter/sticky", () => {
    it("should return map of sticky services", async () => {
      fs.writeFileSync(
        path.join(ruuterDir, "POST", "sticky", "active", "postStickyActiveService.yml"),
        stringify({ test: "data" }),
      );
      fs.writeFileSync(
        path.join(ruuterDir, "POST", "sticky", "inactive", "postStickyInactiveService.yml"),
        stringify({ test: "data" }),
      );
      fs.writeFileSync(
        path.join(ruuterDir, "GET", "sticky", "active", "getStickyActiveService.yml"),
        stringify({ test: "data" }),
      );

      const res = await request(app).get("/ruuter/sticky");

      expect(Object.keys(res.body as ServiceMap).length).toBe(3);
      expect(res.body).toEqual({
        postStickyActiveService: { type: "POST", status: "active" },
        postStickyInactiveService: { type: "POST", status: "inactive" },
        getStickyActiveService: { type: "GET", status: "active" },
      });
      expect(res.status).toBe(200);
    });

    it("should filter out non-sticky services and non-yml files", async () => {
      fs.writeFileSync(path.join(ruuterDir, "POST", "active", "regular.yml"), stringify({ test: "data" }));
      fs.writeFileSync(path.join(ruuterDir, "POST", "active", "sticky-name.yml"), stringify({ test: "data" }));
      fs.writeFileSync(path.join(ruuterDir, "POST", "sticky", "active", "sticky.yml"), stringify({ test: "data" }));
      fs.writeFileSync(path.join(ruuterDir, "POST", "sticky", "active", "sticky.txt"), "test");

      const res = await request(app).get("/ruuter/sticky");

      expect(Object.keys(res.body as ServiceMap).length).toBe(1);
      expect(res.body).toEqual({ sticky: { type: "POST", status: "active" } });
      expect(res.status).toBe(200);
    });

    it("should group multiple (3 or more) sticky services with same name into array", async () => {
      fs.writeFileSync(path.join(ruuterDir, "POST", "sticky", "active", "service.yml"), stringify({ test: "data" }));
      fs.writeFileSync(path.join(ruuterDir, "POST", "sticky", "inactive", "service.yml"), stringify({ test: "data" }));
      fs.writeFileSync(path.join(ruuterDir, "GET", "sticky", "active", "service.yml"), stringify({ test: "data" }));

      const res = await request(app).get("/ruuter/sticky");

      expect(Object.keys(res.body as ServiceMap).length).toBe(1);
      expect(res.body).toEqual({
        service: expect.arrayContaining([
          { type: "POST", status: "active" },
          { type: "POST", status: "inactive" },
          { type: "GET", status: "active" },
        ]),
      });
      expect(res.status).toBe(200);
    });

    it("should return empty map when no sticky services exist", async () => {
      const res = await request(app).get("/ruuter/sticky");

      expect(res.body).toEqual({});
      expect(res.status).toBe(200);
    });
  });

  describe("POST /ruuter/sticky/steps", () => {
    it("should return sticky service YAML as JSON", async () => {
      const yamlContent = { steps: [{ step: "test" }] };
      fs.writeFileSync(path.join(ruuterDir, "POST", "sticky", "active", "service.yml"), stringify(yamlContent));

      const res = await request(app).post("/ruuter/sticky/steps").send({ name: "service" });

      expect(res.body).toEqual(yamlContent);
      expect(res.status).toBe(200);
    });

    it("should return 404 when sticky service not found", async () => {
      const res = await request(app).post("/ruuter/sticky/steps").send({ name: "nonexistent" });

      expect(res.body.message).toBe("Sticky DSL not found");
      expect(res.status).toBe(404);
    });

    it("should return 500 when YAML parsing fails", async () => {
      fs.writeFileSync(
        path.join(ruuterDir, "POST", "sticky", "active", "service.yml"),
        "invalid: yaml: content: [unclosed",
      );

      const res = await request(app).post("/ruuter/sticky/steps").send({ name: "service" });

      expect(res.body.message).toBe("Can't read the file");
      expect(res.status).toBe(500);
    });
  });
});

describe("utils controller", () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/utils", utilsRouter);
  });

  describe("POST /utils/increase-double-digit-version", () => {
    it("should increment minor version", async () => {
      const data = { version: "1.0_5" };
      const res = await request(app).post("/utils/increase-double-digit-version").send(data);

      expect(res.body).toBe("1.0_6");
      expect(res.status).toBe(200);
    });

    it("should return 400 when version is missing", async () => {
      const data = {};
      const res = await request(app).post("/utils/increase-double-digit-version").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when version is not a string", async () => {
      const data = { version: 123 };
      const res = await request(app).post("/utils/increase-double-digit-version").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /utils/object-list-contains-id", () => {
    it("should return true when id exists in list", async () => {
      const data = { id: "123", list: [{ id: "123" }, { id: "456" }] };
      const res = await request(app).post("/utils/object-list-contains-id").send(data);

      expect(res.body).toBe(true);
      expect(res.status).toBe(200);
    });

    it("should return false when id does not exist in list", async () => {
      const data = { id: "999", list: [{ id: "123" }, { id: "456" }] };
      const res = await request(app).post("/utils/object-list-contains-id").send(data);

      expect(res.body).toBe(false);
      expect(res.status).toBe(200);
    });

    it("should return false when list is empty", async () => {
      const data = { id: "123", list: [] };
      const res = await request(app).post("/utils/object-list-contains-id").send(data);

      expect(res.body).toBe(false);
      expect(res.status).toBe(200);
    });

    it("should return false when id is missing", async () => {
      const data = { list: [{ id: "123" }, { id: "456" }] };
      const res = await request(app).post("/utils/object-list-contains-id").send(data);

      expect(res.body).toBe(false);
      expect(res.status).toBe(200);
    });

    it("should return 500 when list is missing", async () => {
      const data = { id: "123" };
      const res = await request(app).post("/utils/object-list-contains-id").send(data);

      expect(res.text).toContain("TypeError: array is not iterable");
      expect(res.status).toBe(500);
    });

    it("should return 500 when both id and list are missing", async () => {
      const data = {};
      const res = await request(app).post("/utils/object-list-contains-id").send(data);

      expect(res.text).toContain("TypeError: array is not iterable");
      expect(res.status).toBe(500);
    });
  });

  describe("POST /utils/today-minus-days", () => {
    it("should return date minus specified days", async () => {
      const data = { days: 5 };
      const res = await request(app).post("/utils/today-minus-days").send(data);

      const returnedDate = new Date(res.body.data as string);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - data.days);

      expect(returnedDate).toBeInstanceOf(Date);
      expect(returnedDate.getFullYear()).toBe(expectedDate.getFullYear());
      expect(returnedDate.getMonth()).toBe(expectedDate.getMonth());
      expect(returnedDate.getDate()).toBe(expectedDate.getDate());
      expect(res.status).toBe(200);
    });

    it("should return date minus 0 days", async () => {
      const data = { days: 0 };
      const res = await request(app).post("/utils/today-minus-days").send(data);

      const returnedDate = new Date(res.body.data as string);
      const expectedDate = new Date();

      expect(returnedDate).toBeInstanceOf(Date);
      expect(returnedDate.getFullYear()).toBe(expectedDate.getFullYear());
      expect(returnedDate.getMonth()).toBe(expectedDate.getMonth());
      expect(returnedDate.getDate()).toBe(expectedDate.getDate());
      expect(res.status).toBe(200);
    });

    it("should handle negative days", async () => {
      const data = { days: -5 };
      const res = await request(app).post("/utils/today-minus-days").send(data);

      const returnedDate = new Date(res.body.data as string);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - data.days);

      expect(returnedDate).toBeInstanceOf(Date);
      expect(returnedDate.getFullYear()).toBe(expectedDate.getFullYear());
      expect(returnedDate.getMonth()).toBe(expectedDate.getMonth());
      expect(returnedDate.getDate()).toBe(expectedDate.getDate());
      expect(res.status).toBe(200);
    });
  });

  describe("POST /utils/calculate-sha256-checksum", () => {
    it("should return SHA256 checksum for text", async () => {
      const text = "hello world";
      const res = await request(app)
        .post("/utils/calculate-sha256-checksum")
        .set("Content-Type", "text/plain")
        .send(text);

      expect(res.text).toMatch(/^[a-f0-9]{64}$/);
      expect(res.status).toBe(200);
    });

    it("should return same checksum for same input", async () => {
      const text = "test string";
      const res1 = await request(app)
        .post("/utils/calculate-sha256-checksum")
        .set("Content-Type", "text/plain")
        .send(text);
      const res2 = await request(app)
        .post("/utils/calculate-sha256-checksum")
        .set("Content-Type", "text/plain")
        .send(text);

      expect(res1.text).toMatch(/^[a-f0-9]{64}$/);
      expect(res2.text).toMatch(/^[a-f0-9]{64}$/);
      expect(res1.text).toBe(res2.text);
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });

    it("should return different checksum for different input", async () => {
      const text1 = "hello";
      const text2 = "world";
      const res1 = await request(app)
        .post("/utils/calculate-sha256-checksum")
        .set("Content-Type", "text/plain")
        .send(text1);
      const res2 = await request(app)
        .post("/utils/calculate-sha256-checksum")
        .set("Content-Type", "text/plain")
        .send(text2);

      expect(res1.text).toMatch(/^[a-f0-9]{64}$/);
      expect(res2.text).toMatch(/^[a-f0-9]{64}$/);
      expect(res1.text).not.toBe(res2.text);
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });

    it("should handle multiline text", async () => {
      const text = "line1\nline2\nline3";
      const res = await request(app)
        .post("/utils/calculate-sha256-checksum")
        .set("Content-Type", "text/plain")
        .send(text);

      expect(res.text).toMatch(/^[a-f0-9]{64}$/);
      expect(res.status).toBe(200);
    });

    it("should return 400 when body is empty", async () => {
      const res = await request(app)
        .post("/utils/calculate-sha256-checksum")
        .set("Content-Type", "text/plain")
        .send("");

      expect(res.body).toBe("error: request body is empty");
      expect(res.status).toBe(400);
    });

    it("should return 400 when no body is sent", async () => {
      const res = await request(app).post("/utils/calculate-sha256-checksum").set("Content-Type", "text/plain");

      expect(res.body).toBe("error: request body is empty");
      expect(res.status).toBe(400);
    });

    it("should return 400 when body is parsed as JSON object", async () => {
      const text = "hello world";
      const res = await request(app).post("/utils/calculate-sha256-checksum").send({ text });

      expect(res.body).toBe("error: request body is empty");
      expect(res.status).toBe(400);
    });
  });

  describe("POST /utils/map-domains-data", () => {
    it("should map domains data with filtering and selection", async () => {
      const data = {
        domains: [
          { domainId: "1", name: "Domain 1", url: "https://domain1.com" },
          { domainId: "2", name: "Domain 2", url: "https://domain2.com" },
          { domainId: "3", name: "Domain 3", url: "https://domain3.com" },
        ],
        userDomains: { domains: ["1", "2"], selected: ["2"] },
      };
      const res = await request(app).post("/utils/map-domains-data").send(data);

      expect(res.body).toHaveLength(2);
      expect(res.body).toEqual([
        { id: "1", name: "Domain 1", url: "https://domain1.com", selected: false },
        { id: "2", name: "Domain 2", url: "https://domain2.com", selected: true },
      ]);
      expect(res.status).toBe(200);
    });

    it("should return empty array when no domains match", async () => {
      const data = {
        domains: [{ domainId: "1", name: "Domain 1", url: "https://domain1.com" }],
        userDomains: { domains: [], selected: [] },
      };
      const res = await request(app).post("/utils/map-domains-data").send(data);

      expect(res.body).toEqual([]);
      expect(res.status).toBe(200);
    });

    it("should return 500 when domains is missing", async () => {
      const data = { userDomains: { domains: ["1"], selected: ["1"] } };
      const res = await request(app).post("/utils/map-domains-data").send(data);

      expect(res.text).toContain("TypeError: Cannot read properties of undefined");
      expect(res.status).toBe(500);
    });

    it("should return 500 when userDomains is missing", async () => {
      const data = { domains: [{ domainId: "1", name: "Domain 1", url: "https://domain1.com" }] };
      const res = await request(app).post("/utils/map-domains-data").send(data);

      expect(res.text).toContain("TypeError: Cannot read properties of undefined");
      expect(res.status).toBe(500);
    });

    it("should return 500 when body is empty", async () => {
      const data = {};
      const res = await request(app).post("/utils/map-domains-data").send(data);

      expect(res.text).toContain("TypeError: Cannot read properties of undefined");
      expect(res.status).toBe(500);
    });
  });
});

describe("validate controller", () => {
  let app: Express;
  let appWithCategory: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/validate", validateRouter);

    appWithCategory = express();
    appWithCategory.use(express.json());
    appWithCategory.use((req, _res, next) => {
      (req as any).category = "rules";
      next();
    });
    appWithCategory.use("/validate", validateRouter);
  });

  describe("POST /validate/array-elements-length", () => {
    it("should return true when all elements are within length limit", async () => {
      const data = { array: ["ab", "c", "de"], length: 2 };
      const res = await request(app).post("/validate/array-elements-length").send(data);

      expect(res.body).toEqual(true);
      expect(res.status).toBe(200);
    });

    it("should return false when any element exceeds length limit", async () => {
      const data = { array: ["ab", "cde", "ef"], length: 2 };
      const res = await request(app).post("/validate/array-elements-length").send(data);

      expect(res.body).toEqual(false);
      expect(res.status).toBe(200);
    });

    it("should return true for empty array", async () => {
      const data = { array: [], length: 5 };
      const res = await request(app).post("/validate/array-elements-length").send(data);

      expect(res.body).toEqual(true);
      expect(res.status).toBe(200);
    });

    it("should return 400 when array is missing", async () => {
      const data = { length: 5 };
      const res = await request(app).post("/validate/array-elements-length").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when array is not an array", async () => {
      const data = { array: "array", length: 5 };
      const res = await request(app).post("/validate/array-elements-length").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when length is missing", async () => {
      const data = { array: ["a", "b"] };
      const res = await request(app).post("/validate/array-elements-length").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should return 400 when length is not numeric", async () => {
      const data = { array: ["a", "b"], length: "number" };
      const res = await request(app).post("/validate/array-elements-length").send(data);

      expect(res.body.errors).toBeDefined();
      expect(Array.isArray(res.body.errors)).toBe(true);
      expect(res.status).toBe(400);
    });

    it("should handle numeric length as string", async () => {
      const data = { array: ["ab", "cd"], length: "2" };
      const res = await request(app).post("/validate/array-elements-length").send(data);

      expect(res.body).toEqual(true);
      expect(res.status).toBe(200);
    });
  });

  describe("POST /validate/validate-stories-rules", () => {
    it("should return true when story steps have no consecutive duplicate intents", async () => {
      const data = { story: { steps: [{ intent: "greet" }, { intent: "goodbye" }, { intent: "greet" }] } };
      const res = await request(app).post("/validate/validate-stories-rules").send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it("should return true when rule steps have no consecutive duplicate intents", async () => {
      const data = { rule: { steps: [{ intent: "greet" }, { intent: "goodbye" }, { intent: "greet" }] } };
      const res = await request(appWithCategory).post("/validate/validate-stories-rules").send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it("should return true when story steps have no consecutive duplicate entities", async () => {
      const data = {
        story: {
          steps: [
            { entities: [{ entity: "name" }] },
            { entities: [{ entity: "email" }] },
            { entities: [{ entity: "name" }] },
          ],
        },
      };
      const res = await request(app).post("/validate/validate-stories-rules").send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it("should return true when rule steps have no consecutive duplicate entities", async () => {
      const data = {
        rule: {
          steps: [
            { entities: [{ entity: "name" }] },
            { entities: [{ entity: "email" }] },
            { entities: [{ entity: "name" }] },
          ],
        },
      };
      const res = await request(appWithCategory).post("/validate/validate-stories-rules").send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it("should return false when story steps have consecutive duplicate intents", async () => {
      const data = { story: { steps: [{ intent: "greet" }, { intent: "greet" }, { intent: "goodbye" }] } };
      const res = await request(app).post("/validate/validate-stories-rules").send(data);

      expect(res.body.result).toBe(false);
      expect(res.status).toBe(200);
    });

    it("should return false when rule steps have consecutive duplicate intents", async () => {
      const data = { rule: { steps: [{ intent: "greet" }, { intent: "greet" }, { intent: "goodbye" }] } };
      const res = await request(appWithCategory).post("/validate/validate-stories-rules").send(data);

      expect(res.body.result).toBe(false);
      expect(res.status).toBe(200);
    });

    it("should return false when story steps have consecutive duplicate entities", async () => {
      const data = {
        story: {
          steps: [
            { entities: [{ entity: "name" }] },
            { entities: [{ entity: "name" }] },
            { entities: [{ entity: "email" }] },
          ],
        },
      };
      const res = await request(app).post("/validate/validate-stories-rules").send(data);

      expect(res.body.result).toBe(false);
      expect(res.status).toBe(200);
    });

    it("should return false when rule steps have consecutive duplicate entities", async () => {
      const data = {
        rule: {
          steps: [
            { entities: [{ entity: "name" }] },
            { entities: [{ entity: "name" }] },
            { entities: [{ entity: "email" }] },
          ],
        },
      };
      const res = await request(appWithCategory).post("/validate/validate-stories-rules").send(data);

      expect(res.body.result).toBe(false);
      expect(res.status).toBe(200);
    });

    it("should return false when steps have consecutive duplicate entities with multiple entities", async () => {
      const data = {
        story: {
          steps: [
            { entities: [{ entity: "name" }, { entity: "email" }] },
            { entities: [{ entity: "name" }, { entity: "phone" }] },
          ],
        },
      };
      const res = await request(app).post("/validate/validate-stories-rules").send(data);

      expect(res.body.result).toBe(false);
      expect(res.status).toBe(200);
    });

    it("should return true when steps have mixed intents and entities", async () => {
      const data = {
        story: {
          steps: [
            { intent: "greet", entities: [{ entity: "name" }] },
            { intent: "goodbye", entities: [{ entity: "email" }] },
          ],
        },
      };
      const res = await request(app).post("/validate/validate-stories-rules").send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it("should return true when steps have no intents or entities", async () => {
      const data = { story: { steps: [{}, {}, {}] } };
      const res = await request(app).post("/validate/validate-stories-rules").send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it("should return true for single step", async () => {
      const data = { story: { steps: [{ intent: "greet" }] } };
      const res = await request(app).post("/validate/validate-stories-rules").send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it("should return true for empty steps array", async () => {
      const data = { story: { steps: [] } };
      const res = await request(app).post("/validate/validate-stories-rules").send(data);

      expect(res.body.result).toBe(true);
      expect(res.status).toBe(200);
    });

    it("should return 400 when steps are missing", async () => {
      const data = { story: {} };
      const res = await request(app).post("/validate/validate-stories-rules").send(data);

      expect(res.body.error).toBe("Invalid request body");
      expect(res.status).toBe(400);
    });

    it("should return 400 when body is empty", async () => {
      const data = {};
      const res = await request(app).post("/validate/validate-stories-rules").send(data);

      expect(res.body.error).toBe("Invalid request body");
      expect(res.status).toBe(400);
    });

    it("should return false when non-array is passed as steps", async () => {
      const data = { rule: { steps: "array" } };
      const res = await request(appWithCategory).post("/validate/validate-stories-rules").send(data);

      expect(res.body.result).toBe(false);
      expect(res.status).toBe(200);
    });
  });
});
