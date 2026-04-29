import fs from 'fs';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stringify } from 'yaml';

import {
  buildChatExportPaths,
  buildContentFilePath,
  getAllFiles,
  getHeadersMapping,
  getUrl,
  isValidFilename,
  isValidFilePath,
  mapSecretToJson,
  parseBoolean,
  parseJwt,
  readFile,
} from './utils';

const tempDir = path.join(__dirname, 'test-utils-dir');
const secretFile = path.join(tempDir, 'secret.yaml');
const nestedSecretFile = path.join(tempDir, 'nested.yaml');

function cleanup(): void {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

describe('utils', () => {
  beforeEach(() => {
    cleanup();
    fs.mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    cleanup();
  });

  it('mapSecretToJson overwrites objects instead of deep merging', () => {
    fs.writeFileSync(secretFile, stringify({ a: 1, b: { c: 2 } }));
    fs.writeFileSync(nestedSecretFile, stringify({ b: { d: 3 } }));
    const result = mapSecretToJson([secretFile, nestedSecretFile]);
    expect(result).toEqual({ a: 1, b: { d: 3 } });
  });

  it('buildContentFilePath returns correct path', () => {
    process.env.CONTENT_FOLDER = tempDir;
    const fileName = 'foo.txt';
    expect(buildContentFilePath(fileName)).toBe(path.join(tempDir, fileName));
  });

  it('buildChatExportPaths returns absolute fs path and relative file path', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1710000000000);

    const chatExportsDir = path.join(tempDir, 'chat-exports');
    const result = buildChatExportPaths(chatExportsDir);

    expect(result.absoluteFsPath).toMatch(
      new RegExp(
        `^${chatExportsDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${path.sep}chat-history-.+-1710000000000\\.xlsx$`,
      ),
    );
    expect(result.relativeFilePath).toMatch(new RegExp(`^chat-exports\\${path.sep}.+\\.xlsx$`));
    expect(path.isAbsolute(result.relativeFilePath)).toBe(false);
  });

  it('isValidFilename validates allowed filenames', () => {
    expect(isValidFilename('abc.txt')).toBe(true);
    expect(isValidFilename('õäöüÕÄÖÜ.txt')).toBe(true);
    expect(isValidFilename('bad|file.txt')).toBe(false);
  });

  it('isValidFilePath validates allowed file paths', () => {
    expect(isValidFilePath('abc.txt')).toBe(true);
    expect(isValidFilePath('../abc.txt')).toBe(false);
    expect(isValidFilePath('bad|file.txt')).toBe(false);
  });

  it('getAllFiles returns all files recursively', () => {
    process.env.CONTENT_FOLDER = tempDir;
    const subDir = path.join(tempDir, 'sub');
    fs.mkdirSync(subDir);
    fs.writeFileSync(path.join(tempDir, 'a.txt'), '1');
    fs.writeFileSync(path.join(subDir, 'b.txt'), '2');
    const files = getAllFiles('');
    expect(files).toContain(path.join(tempDir, 'a.txt'));
    expect(files).toContain(path.join(subDir, 'b.txt'));
  });

  it('readFile reads file content as string', () => {
    fs.writeFileSync(secretFile, 'hello');
    expect(readFile(secretFile)).toBe(Buffer.from('hello').toString());
  });

  it('parseBoolean parses true/false strings', () => {
    expect(parseBoolean('true')).toBe(true);
    expect(parseBoolean('false')).toBe(false);
    expect(parseBoolean('TRUE')).toBe(true);
    expect(parseBoolean('')).toBe(false);
  });

  it('getUrl extracts url from dir string', () => {
    expect(getUrl('/GET/foo/bar')).toBe('/foo/bar');
    expect(getUrl('/POST/foo/bar')).toBe('/foo/bar');
  });

  it('getHeadersMapping returns correct mapping for companies', () => {
    const mapping = getHeadersMapping('companies');
    expect(mapping.Registrikood).toBe('registry_code');
    expect(mapping.Nimi).toBe('name');
  });

  it('getHeadersMapping returns correct mapping for municipalities', () => {
    const mapping = getHeadersMapping('municipalities');
    expect(mapping.KUU).toBe('month');
    expect(mapping.MAAKOND).toBe('county');
  });

  it('getHeadersMapping returns empty object for unknown type', () => {
    expect(getHeadersMapping('unknown')).toEqual({});
  });

  it('parseJwt parses valid JWT', () => {
    const payload = { foo: 'bar' };
    const base64 = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '');
    const token = `header.${base64}.signature`;
    expect(parseJwt(token)).toEqual(payload);
  });

  it('parseJwt returns null for invalid JWT', () => {
    expect(parseJwt('bad.token')).toBeNull();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});
