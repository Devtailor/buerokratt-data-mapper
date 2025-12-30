import fs from "fs";
import path from "path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { stringify } from "yaml";

import { getAllSecrets, getSecretsWithPriority } from "./";

const tempDir = path.join(__dirname, "test-secrets-dir");
const prodSecretsDir = path.join(tempDir, "secrets", "prod");
const testSecretsDir = path.join(tempDir, "secrets", "test");

const setupDirectories = (): void => {
  fs.mkdirSync(prodSecretsDir, { recursive: true });
  fs.mkdirSync(testSecretsDir, { recursive: true });
  process.env.CONTENT_FOLDER = tempDir;
};

const cleanup = (): void => {
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
};

describe("getAllSecrets", () => {
  beforeEach(() => {
    cleanup();
    setupDirectories();
  });

  afterEach(() => {
    cleanup();
    delete process.env.CONTENT_FOLDER;
  });

  it("should return empty arrays when no secrets exist", () => {
    expect(getAllSecrets()).toEqual({ prod: [], test: [] });
  });

  it("should include null values when flattening", () => {
    const file = path.join(prodSecretsDir, "null.yaml");
    fs.writeFileSync(file, stringify({ key: null, other: "value", nested: { null_key: null, valid: "data" } }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toEqual(["key", "other", "nested.null_key", "nested.valid"]);
    expect(secrets.test).toEqual([]);
  });

  it("should handle primitive values at root level", () => {
    const file = path.join(prodSecretsDir, "simple.yaml");
    fs.writeFileSync(file, stringify({ database_host: "localhost", database_port: 5432, api_key: "secret-key" }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toEqual(["database_host", "database_port", "api_key"]);
    expect(secrets.test).toEqual([]);
  });

  it("should return flattened secret paths from prod directory", () => {
    const file = path.join(prodSecretsDir, "app.yaml");
    fs.writeFileSync(file, stringify({ database: { host: "localhost", port: 5432 }, api: { key: "secret-key" } }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toEqual(["database.host", "database.port", "api.key"]);
    expect(secrets.test).toEqual([]);
  });

  it("should return flattened secret paths from test directory", () => {
    const file = path.join(testSecretsDir, "app.yaml");
    fs.writeFileSync(file, stringify({ database: { host: "localhost", port: 5432 }, api: { key: "secret-key" } }));

    const secrets = getAllSecrets();
    expect(secrets.test).toEqual(["database.host", "database.port", "api.key"]);
    expect(secrets.prod).toEqual([]);
  });

  it("should return secrets from both prod and test directories", () => {
    const prodFile = path.join(prodSecretsDir, "prod.yaml");
    const testFile = path.join(testSecretsDir, "test.yaml");

    fs.writeFileSync(prodFile, stringify({ prod_key: "prod_value" }));
    fs.writeFileSync(testFile, stringify({ test_key: "test_value" }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toEqual(["prod_key"]);
    expect(secrets.test).toEqual(["test_key"]);
  });

  it("should handle deeply nested secrets", () => {
    const file = path.join(prodSecretsDir, "nested.yaml");
    fs.writeFileSync(file, stringify({ level1: { level2: { level3: { level4: { secret: "value" } } } } }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toEqual(["level1.level2.level3.level4.secret"]);
    expect(secrets.test).toEqual([]);
  });

  it("should handle multiple secret files in same directory", () => {
    const file1 = path.join(prodSecretsDir, "database.yaml");
    const file2 = path.join(prodSecretsDir, "api.yaml");

    fs.writeFileSync(file1, stringify({ database: { host: "localhost", port: 5432 } }));
    fs.writeFileSync(file2, stringify({ api: { key: "secret-key" } }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toHaveLength(3);
    expect(secrets.prod).toContain("database.host");
    expect(secrets.prod).toContain("database.port");
    expect(secrets.prod).toContain("api.key");
    expect(secrets.test).toEqual([]);
  });

  it("should handle secrets in subdirectories", () => {
    const subdirectory = path.join(prodSecretsDir, "subdir");
    fs.mkdirSync(subdirectory, { recursive: true });
    const file = path.join(subdirectory, "secret.yaml");
    fs.writeFileSync(file, stringify({ secret: "value" }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toEqual(["secret"]);
    expect(secrets.test).toEqual([]);
  });

  it("should not include duplicate paths", () => {
    const file1 = path.join(prodSecretsDir, "file1.yaml");
    const file2 = path.join(prodSecretsDir, "file2.yaml");

    fs.writeFileSync(file1, stringify({ common: { key: "value1" } }));
    fs.writeFileSync(file2, stringify({ common: { key: "value2" } }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toEqual(["common.key"]);
    expect(secrets.test).toEqual([]);
  });
});

describe("getSecretsWithPriority", () => {
  beforeEach(() => {
    cleanup();
    fs.mkdirSync(prodSecretsDir, { recursive: true });
    fs.mkdirSync(testSecretsDir, { recursive: true });
    process.env.CONTENT_FOLDER = tempDir;
  });

  afterEach(() => {
    cleanup();
    delete process.env.CONTENT_FOLDER;
  });

  it("should return empty object when no secrets exist", () => {
    expect(getSecretsWithPriority("prod")).toEqual({});
  });

  it("should handle empty objects", () => {
    const prodFile = path.join(prodSecretsDir, "prod.yaml");
    const testFile = path.join(testSecretsDir, "test.yaml");

    fs.writeFileSync(prodFile, stringify({ empty_obj: {} }));
    fs.writeFileSync(testFile, stringify({ empty_obj: {} }));

    const secretsProd = getSecretsWithPriority("prod");
    const secretsTest = getSecretsWithPriority("test");

    expect(secretsProd).toEqual({ empty_obj: {} });
    expect(secretsTest).toEqual({ empty_obj: {} });
  });

  it("should return prod secrets when priority is prod and no test secrets exist", () => {
    const file = path.join(prodSecretsDir, "prod.yaml");
    fs.writeFileSync(file, stringify({ database: { host: "prod-host", port: 5432 } }));

    const secrets = getSecretsWithPriority("prod");
    expect(secrets).toEqual({ database: { host: "prod-host", port: 5432 } });
  });

  it("should return test secrets when priority is test and no prod secrets exist", () => {
    const file = path.join(testSecretsDir, "test.yaml");
    fs.writeFileSync(file, stringify({ database: { host: "test-host", port: 5432 } }));

    const secrets = getSecretsWithPriority("test");
    expect(secrets).toEqual({ database: { host: "test-host", port: 5432 } });
  });

  it("should prioritize prod secrets over test when priority is prod", () => {
    const prodFile = path.join(prodSecretsDir, "prod.yaml");
    const testFile = path.join(testSecretsDir, "test.yaml");

    fs.writeFileSync(prodFile, stringify({ database: { host: "prod-host", port: 5432 } }));
    fs.writeFileSync(testFile, stringify({ database: { host: "test-host" } }));

    const secrets = getSecretsWithPriority("prod");
    expect(secrets).toEqual({ database: { host: "prod-host", port: 5432 } });
  });

  it("should prioritize test secrets over prod when priority is test", () => {
    const prodFile = path.join(prodSecretsDir, "prod.yaml");
    const testFile = path.join(testSecretsDir, "test.yaml");

    fs.writeFileSync(prodFile, stringify({ database: { host: "prod-host", port: 5432 } }));
    fs.writeFileSync(testFile, stringify({ database: { host: "test-host" } }));

    const secrets = getSecretsWithPriority("test");
    expect(secrets).toEqual({ database: { host: "test-host", port: 5432 } });
  });

  it("should merge non-conflicting secrets from both environments", () => {
    const prodFile = path.join(prodSecretsDir, "prod.yaml");
    const testFile = path.join(testSecretsDir, "test.yaml");

    fs.writeFileSync(prodFile, stringify({ prod_only: "prod-value", shared: "prod-shared" }));
    fs.writeFileSync(testFile, stringify({ test_only: "test-value", shared: "test-shared" }));

    const secretsProd = getSecretsWithPriority("prod");
    const secretsTest = getSecretsWithPriority("test");

    expect(secretsProd).toEqual({ prod_only: "prod-value", test_only: "test-value", shared: "prod-shared" });
    expect(secretsTest).toEqual({ prod_only: "prod-value", test_only: "test-value", shared: "test-shared" });
  });

  it("should handle deeply nested secrets with priority", () => {
    const prodFile = path.join(prodSecretsDir, "prod.yaml");
    const testFile = path.join(testSecretsDir, "test.yaml");

    fs.writeFileSync(
      prodFile,
      stringify({ level1: { level2: { prod_key: "prod-value", shared_key: "prod-shared" } } }),
    );
    fs.writeFileSync(
      testFile,
      stringify({ level1: { level2: { test_key: "test-value", shared_key: "test-shared" } } }),
    );

    const secretsProd = getSecretsWithPriority("prod");
    const secretsTest = getSecretsWithPriority("test");

    expect(secretsProd).toEqual({
      level1: { level2: { prod_key: "prod-value", test_key: "test-value", shared_key: "prod-shared" } },
    });
    expect(secretsTest).toEqual({
      level1: { level2: { prod_key: "prod-value", test_key: "test-value", shared_key: "test-shared" } },
    });
  });

  it("should handle different value types", () => {
    const prodFile = path.join(prodSecretsDir, "prod.yaml");
    const testFile = path.join(testSecretsDir, "test.yaml");

    fs.writeFileSync(prodFile, stringify({ string: "prod-string", number: 100, boolean: false, null: null }));
    fs.writeFileSync(testFile, stringify({ string: "test-string", number: 200, boolean: true }));

    const secretsProd = getSecretsWithPriority("prod");
    const secretsTest = getSecretsWithPriority("test");

    expect(secretsProd).toEqual({ string: "prod-string", number: 100, boolean: false, null: null });
    expect(secretsTest).toEqual({ string: "test-string", number: 200, boolean: true, null: null });
  });

  it("should handle multiple files in same directory", () => {
    const prodFile1 = path.join(prodSecretsDir, "database.yaml");
    const prodFile2 = path.join(prodSecretsDir, "api.yaml");
    const testFile1 = path.join(testSecretsDir, "test.yaml");

    fs.writeFileSync(prodFile1, stringify({ database: { host: "prod-db" } }));
    fs.writeFileSync(prodFile2, stringify({ api: { key: "prod-api-key" } }));
    fs.writeFileSync(testFile1, stringify({ database: { host: "test-db" } }));

    const secretsProd = getSecretsWithPriority("prod");
    const secretsTest = getSecretsWithPriority("test");

    expect(secretsProd).toEqual({ database: { host: "prod-db" }, api: { key: "prod-api-key" } });
    expect(secretsTest).toEqual({ database: { host: "test-db" }, api: { key: "prod-api-key" } });
  });

  it("should handle secrets in subdirectories", () => {
    const prodSubdirectory = path.join(prodSecretsDir, "subdir");
    fs.mkdirSync(prodSubdirectory, { recursive: true });
    const prodFile = path.join(prodSubdirectory, "prod.yaml");
    const testFile = path.join(testSecretsDir, "test.yaml");
    fs.writeFileSync(prodFile, stringify({ sub_secret: "prod-sub-value" }));
    fs.writeFileSync(testFile, stringify({ sub_secret: "test-sub-value" }));

    const secretsProd = getSecretsWithPriority("prod");
    const secretsTest = getSecretsWithPriority("test");

    expect(secretsProd).toEqual({ sub_secret: "prod-sub-value" });
    expect(secretsTest).toEqual({ sub_secret: "test-sub-value" });
  });
});
