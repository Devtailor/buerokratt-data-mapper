import { describe, expect, it } from 'vitest';

import { base64Decrypt } from './';

const toBase64 = (str: string): string => Buffer.from(str, 'utf8').toString('base64');

describe('base64Decrypt', () => {
  it('should return error if cipher is missing', () => {
    expect(base64Decrypt({ cipher: '', isObject: false }).error).toBe(true);
  });

  it('should decode a valid base64 string', () => {
    const text = 'hello world';
    const cipher = toBase64(text);
    const result = base64Decrypt({ cipher, isObject: false });
    expect(result.error).toBe(false);
    expect(result.content).toBe(text);
  });

  it('should parse JSON if isObject is true', () => {
    const obj = { foo: 'bar' };
    const cipher = toBase64(JSON.stringify(obj));
    const result = base64Decrypt({ cipher, isObject: true });
    expect(result.error).toBe(false);
    expect(result.content).toEqual(obj);
  });

  it('should return error on invalid base64', () => {
    const result = base64Decrypt({ cipher: '!!!', isObject: false });
    expect(result.error).toBe(true);
  });

  it('should return error on invalid JSON if isObject is true', () => {
    const cipher = toBase64('not json');
    const result = base64Decrypt({ cipher, isObject: true });
    expect(result.error).toBe(true);
  });
});
