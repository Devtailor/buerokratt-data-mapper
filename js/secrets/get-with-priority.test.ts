import fs from 'fs';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { stringify } from 'yaml';

import { getSecretsWithPriority } from './';

const tempDir = path.join(__dirname, 'test-secrets-dir');
const prodSecretsDir = path.join(tempDir, 'secrets', 'prod');
const testSecretsDir = path.join(tempDir, 'secrets', 'test');

describe('getSecretsWithPriority', () => {
  beforeEach(() => {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(prodSecretsDir, { recursive: true });
    fs.mkdirSync(testSecretsDir, { recursive: true });
    process.env.CONTENT_FOLDER = tempDir;
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    delete process.env.CONTENT_FOLDER;
  });

  it('should return empty object when no secrets exist', () => {
    expect(getSecretsWithPriority('prod')).toEqual({});
  });

  it('should handle empty objects', () => {
    const prodFile = path.join(prodSecretsDir, 'prod.yaml');
    const testFile = path.join(testSecretsDir, 'test.yaml');

    fs.writeFileSync(prodFile, stringify({ empty_obj: {} }));
    fs.writeFileSync(testFile, stringify({ empty_obj: {} }));

    const secretsProd = getSecretsWithPriority('prod');
    const secretsTest = getSecretsWithPriority('test');

    expect(secretsProd).toEqual({ empty_obj: {} });
    expect(secretsTest).toEqual({ empty_obj: {} });
  });

  it('should return prod secrets when priority is prod and no test secrets exist', () => {
    const file = path.join(prodSecretsDir, 'prod.yaml');
    fs.writeFileSync(file, stringify({ database: { host: 'prod-host', port: 5432 } }));

    const secrets = getSecretsWithPriority('prod');
    expect(secrets).toEqual({ database: { host: 'prod-host', port: 5432 } });
  });

  it('should return test secrets when priority is test and no prod secrets exist', () => {
    const file = path.join(testSecretsDir, 'test.yaml');
    fs.writeFileSync(file, stringify({ database: { host: 'test-host', port: 5432 } }));

    const secrets = getSecretsWithPriority('test');
    expect(secrets).toEqual({ database: { host: 'test-host', port: 5432 } });
  });

  it('should prioritize prod secrets over test when priority is prod', () => {
    const prodFile = path.join(prodSecretsDir, 'prod.yaml');
    const testFile = path.join(testSecretsDir, 'test.yaml');

    fs.writeFileSync(prodFile, stringify({ database: { host: 'prod-host', port: 5432 } }));
    fs.writeFileSync(testFile, stringify({ database: { host: 'test-host' } }));

    const secrets = getSecretsWithPriority('prod');
    expect(secrets).toEqual({ database: { host: 'prod-host', port: 5432 } });
  });

  it('should prioritize test secrets over prod when priority is test', () => {
    const prodFile = path.join(prodSecretsDir, 'prod.yaml');
    const testFile = path.join(testSecretsDir, 'test.yaml');

    fs.writeFileSync(prodFile, stringify({ database: { host: 'prod-host', port: 5432 } }));
    fs.writeFileSync(testFile, stringify({ database: { host: 'test-host' } }));

    const secrets = getSecretsWithPriority('test');
    expect(secrets).toEqual({ database: { host: 'test-host', port: 5432 } });
  });

  it('should merge non-conflicting secrets from both environments', () => {
    const prodFile = path.join(prodSecretsDir, 'prod.yaml');
    const testFile = path.join(testSecretsDir, 'test.yaml');

    fs.writeFileSync(prodFile, stringify({ prod_only: 'prod-value', shared: 'prod-shared' }));
    fs.writeFileSync(testFile, stringify({ test_only: 'test-value', shared: 'test-shared' }));

    const secretsProd = getSecretsWithPriority('prod');
    const secretsTest = getSecretsWithPriority('test');

    expect(secretsProd).toEqual({ prod_only: 'prod-value', test_only: 'test-value', shared: 'prod-shared' });
    expect(secretsTest).toEqual({ prod_only: 'prod-value', test_only: 'test-value', shared: 'test-shared' });
  });

  it('should handle deeply nested secrets with priority', () => {
    const prodFile = path.join(prodSecretsDir, 'prod.yaml');
    const testFile = path.join(testSecretsDir, 'test.yaml');

    fs.writeFileSync(
      prodFile,
      stringify({ level1: { level2: { prod_key: 'prod-value', shared_key: 'prod-shared' } } }),
    );
    fs.writeFileSync(
      testFile,
      stringify({ level1: { level2: { test_key: 'test-value', shared_key: 'test-shared' } } }),
    );

    const secretsProd = getSecretsWithPriority('prod');
    const secretsTest = getSecretsWithPriority('test');

    expect(secretsProd).toEqual({
      level1: { level2: { prod_key: 'prod-value', test_key: 'test-value', shared_key: 'prod-shared' } },
    });
    expect(secretsTest).toEqual({
      level1: { level2: { prod_key: 'prod-value', test_key: 'test-value', shared_key: 'test-shared' } },
    });
  });

  it('should handle different value types', () => {
    const prodFile = path.join(prodSecretsDir, 'prod.yaml');
    const testFile = path.join(testSecretsDir, 'test.yaml');

    fs.writeFileSync(prodFile, stringify({ string: 'prod-string', number: 100, boolean: false, null: null }));
    fs.writeFileSync(testFile, stringify({ string: 'test-string', number: 200, boolean: true }));

    const secretsProd = getSecretsWithPriority('prod');
    const secretsTest = getSecretsWithPriority('test');

    expect(secretsProd).toEqual({ string: 'prod-string', number: 100, boolean: false, null: null });
    expect(secretsTest).toEqual({ string: 'test-string', number: 200, boolean: true, null: null });
  });

  it('should handle multiple files in same directory', () => {
    const prodFile1 = path.join(prodSecretsDir, 'database.yaml');
    const prodFile2 = path.join(prodSecretsDir, 'api.yaml');
    const testFile1 = path.join(testSecretsDir, 'test.yaml');

    fs.writeFileSync(prodFile1, stringify({ database: { host: 'prod-db' } }));
    fs.writeFileSync(prodFile2, stringify({ api: { key: 'prod-api-key' } }));
    fs.writeFileSync(testFile1, stringify({ database: { host: 'test-db' } }));

    const secretsProd = getSecretsWithPriority('prod');
    const secretsTest = getSecretsWithPriority('test');

    expect(secretsProd).toEqual({ database: { host: 'prod-db' }, api: { key: 'prod-api-key' } });
    expect(secretsTest).toEqual({ database: { host: 'test-db' }, api: { key: 'prod-api-key' } });
  });

  it('should handle secrets in subdirectories', () => {
    const prodSubdirectory = path.join(prodSecretsDir, 'subdir');
    fs.mkdirSync(prodSubdirectory, { recursive: true });
    const prodFile = path.join(prodSubdirectory, 'prod.yaml');
    const testFile = path.join(testSecretsDir, 'test.yaml');
    fs.writeFileSync(prodFile, stringify({ sub_secret: 'prod-sub-value' }));
    fs.writeFileSync(testFile, stringify({ sub_secret: 'test-sub-value' }));

    const secretsProd = getSecretsWithPriority('prod');
    const secretsTest = getSecretsWithPriority('test');

    expect(secretsProd).toEqual({ sub_secret: 'prod-sub-value' });
    expect(secretsTest).toEqual({ sub_secret: 'test-sub-value' });
  });
});
