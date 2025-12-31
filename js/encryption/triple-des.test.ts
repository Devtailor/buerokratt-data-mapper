import cryptoJs from 'crypto-js';
import { describe, expect, it } from 'vitest';

import { tripleDesEncrypt } from './';

describe('tripleDesEncrypt', () => {
  it('should return error if content or key is missing', () => {
    expect(tripleDesEncrypt({ content: '', key: 'key' }).error).toBe(true);
    expect(tripleDesEncrypt({ content: 'text', key: '' }).error).toBe(true);
  });

  it('should encrypt and decrypt a string correctly', () => {
    const key = 'testkey';
    const text = 'hello world';
    const { error, cipher } = tripleDesEncrypt({ content: text, key });
    expect(error).toBe(false);
    expect(typeof cipher).toBe('string');
    const decrypted = cryptoJs.TripleDES.decrypt(cipher!, key).toString(cryptoJs.enc.Utf8);
    expect(decrypted).toBe(text);
  });

  it('should encrypt and decrypt an object', () => {
    const key = 'testkey';
    const obj = { foo: 'bar' };
    const { error, cipher } = tripleDesEncrypt({ content: obj, key });
    expect(error).toBe(false);
    const decrypted = JSON.parse(cryptoJs.TripleDES.decrypt(cipher!, key).toString(cryptoJs.enc.Utf8));
    expect(decrypted).toEqual(obj);
  });
});
