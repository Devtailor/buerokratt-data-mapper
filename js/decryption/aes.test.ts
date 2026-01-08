import cryptoJs from 'crypto-js';
import { describe, expect, it } from 'vitest';

import { aesDecrypt } from './';

describe('aesDecrypt', () => {
  it('should return error if cipher or key is missing', () => {
    expect(aesDecrypt({ cipher: '', key: 'key', isObject: false }).error).toBe(true);
    expect(aesDecrypt({ cipher: 'cipher', key: '', isObject: false }).error).toBe(true);
  });

  it('should decrypt a valid AES cipher string', () => {
    const key = 'testkey';
    const text = 'hello world';
    const cipher = cryptoJs.AES.encrypt(text, key).toString();
    const result = aesDecrypt({ cipher, key, isObject: false });
    expect(result.error).toBe(false);
    expect(result.content).toBe(text);
  });

  it('should parse JSON if isObject is true', () => {
    const key = 'testkey';
    const obj = { foo: 'bar' };
    const cipher = cryptoJs.AES.encrypt(JSON.stringify(obj), key).toString();
    const result = aesDecrypt({ cipher, key, isObject: true });
    expect(result.error).toBe(false);
    expect(result.content).toEqual(obj);
  });

  it('should return error on invalid cipher', () => {
    const result = aesDecrypt({ cipher: 'invalid', key: 'key', isObject: false });
    expect(result.error).toBe(true);
  });
});
