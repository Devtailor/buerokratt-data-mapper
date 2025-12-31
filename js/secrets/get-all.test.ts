import fs from 'fs';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { stringify } from 'yaml';

import { getAllSecrets } from './';

const tempDir = path.join(__dirname, 'test-secrets-dir');
const prodSecretsDir = path.join(tempDir, 'secrets', 'prod');
const testSecretsDir = path.join(tempDir, 'secrets', 'test');

const setupDirectories = (): void => {
  fs.mkdirSync(prodSecretsDir, { recursive: true });
  fs.mkdirSync(testSecretsDir, { recursive: true });
  process.env.CONTENT_FOLDER = tempDir;
};

const cleanup = (): void => {
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
};

describe('getAllSecrets', () => {
  beforeEach(() => {
    cleanup();
    setupDirectories();
  });

  afterEach(() => {
    cleanup();
    delete process.env.CONTENT_FOLDER;
  });

  it('should return empty arrays when no secrets exist', () => {
    expect(getAllSecrets()).toEqual({ prod: [], test: [] });
  });

  it('should include null values when flattening', () => {
    const file = path.join(prodSecretsDir, 'null.yaml');
    fs.writeFileSync(file, stringify({ key: null, other: 'value', nested: { null_key: null, valid: 'data' } }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toEqual(['key', 'other', 'nested.null_key', 'nested.valid']);
    expect(secrets.test).toEqual([]);
  });

  it('should handle primitive values at root level', () => {
    const file = path.join(prodSecretsDir, 'simple.yaml');
    fs.writeFileSync(file, stringify({ database_host: 'localhost', database_port: 5432, api_key: 'secret-key' }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toEqual(['database_host', 'database_port', 'api_key']);
    expect(secrets.test).toEqual([]);
  });

  it('should return flattened secret paths from prod directory', () => {
    const file = path.join(prodSecretsDir, 'app.yaml');
    fs.writeFileSync(file, stringify({ database: { host: 'localhost', port: 5432 }, api: { key: 'secret-key' } }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toEqual(['database.host', 'database.port', 'api.key']);
    expect(secrets.test).toEqual([]);
  });

  it('should return flattened secret paths from test directory', () => {
    const file = path.join(testSecretsDir, 'app.yaml');
    fs.writeFileSync(file, stringify({ database: { host: 'localhost', port: 5432 }, api: { key: 'secret-key' } }));

    const secrets = getAllSecrets();
    expect(secrets.test).toEqual(['database.host', 'database.port', 'api.key']);
    expect(secrets.prod).toEqual([]);
  });

  it('should return secrets from both prod and test directories', () => {
    const prodFile = path.join(prodSecretsDir, 'prod.yaml');
    const testFile = path.join(testSecretsDir, 'test.yaml');

    fs.writeFileSync(prodFile, stringify({ prod_key: 'prod_value' }));
    fs.writeFileSync(testFile, stringify({ test_key: 'test_value' }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toEqual(['prod_key']);
    expect(secrets.test).toEqual(['test_key']);
  });

  it('should handle deeply nested secrets', () => {
    const file = path.join(prodSecretsDir, 'nested.yaml');
    fs.writeFileSync(file, stringify({ level1: { level2: { level3: { level4: { secret: 'value' } } } } }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toEqual(['level1.level2.level3.level4.secret']);
    expect(secrets.test).toEqual([]);
  });

  it('should handle multiple secret files in same directory', () => {
    const file1 = path.join(prodSecretsDir, 'database.yaml');
    const file2 = path.join(prodSecretsDir, 'api.yaml');

    fs.writeFileSync(file1, stringify({ database: { host: 'localhost', port: 5432 } }));
    fs.writeFileSync(file2, stringify({ api: { key: 'secret-key' } }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toHaveLength(3);
    expect(secrets.prod).toContain('database.host');
    expect(secrets.prod).toContain('database.port');
    expect(secrets.prod).toContain('api.key');
    expect(secrets.test).toEqual([]);
  });

  it('should handle secrets in subdirectories', () => {
    const subdirectory = path.join(prodSecretsDir, 'subdir');
    fs.mkdirSync(subdirectory, { recursive: true });
    const file = path.join(subdirectory, 'secret.yaml');
    fs.writeFileSync(file, stringify({ secret: 'value' }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toEqual(['secret']);
    expect(secrets.test).toEqual([]);
  });

  it('should not include duplicate paths', () => {
    const file1 = path.join(prodSecretsDir, 'file1.yaml');
    const file2 = path.join(prodSecretsDir, 'file2.yaml');

    fs.writeFileSync(file1, stringify({ common: { key: 'value1' } }));
    fs.writeFileSync(file2, stringify({ common: { key: 'value2' } }));

    const secrets = getAllSecrets();
    expect(secrets.prod).toEqual(['common.key']);
    expect(secrets.test).toEqual([]);
  });
});
