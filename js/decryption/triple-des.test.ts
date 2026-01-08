import cryptoJs from 'crypto-js';
import { describe, expect, it } from 'vitest';

import { tripleDesDecrypt } from './';

describe('tripleDesDecrypt', () => {
  it('should return error if cipher or key is missing', () => {
    expect(tripleDesDecrypt({ cipher: '', key: 'key', isObject: false }).error).toBe(true);
    expect(tripleDesDecrypt({ cipher: 'cipher', key: '', isObject: false }).error).toBe(true);
  });

  it('should decrypt a valid Triple DES cipher string', () => {
    const key = 'testkey';
    const text = 'hello world';
    const cipher = cryptoJs.TripleDES.encrypt(text, key).toString();
    const result = tripleDesDecrypt({ cipher, key, isObject: false });
    expect(result.error).toBe(false);
    expect(result.content).toBe(text);
  });

  it('should parse JSON if isObject is true', () => {
    const key = 'testkey';
    const obj = { foo: 'bar' };
    const cipher = cryptoJs.TripleDES.encrypt(JSON.stringify(obj), key).toString();
    const result = tripleDesDecrypt({ cipher, key, isObject: true });
    expect(result.error).toBe(false);
    expect(result.content).toEqual(obj);
  });

  it('should return error on invalid cipher', () => {
    const result = tripleDesDecrypt({ cipher: 'invalid', key: 'key', isObject: false });
    expect(result.error).toBe(true);
  });
});
