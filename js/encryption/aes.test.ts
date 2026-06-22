import cryptoJs from 'crypto-js';
import { describe, expect, it } from 'vitest';

import { aesEncrypt } from './';

describe('aesEncrypt', () => {
  it('should return error if content or key is missing', () => {
    expect(aesEncrypt({ content: '', key: 'key' }).error).toBe(true);
    expect(aesEncrypt({ content: 'text', key: '' }).error).toBe(true);
  });

  it('should encrypt and decrypt a string correctly', () => {
    const key = 'testkey';
    const text = 'hello world';
    const { error, cipher } = aesEncrypt({ content: text, key });
    expect(error).toBe(false);
    expect(typeof cipher).toBe('string');
    const decrypted = cryptoJs.AES.decrypt(cipher!, key).toString(cryptoJs.enc.Utf8);
    expect(decrypted).toBe(text);
  });

  it('should encrypt and decrypt an object', () => {
    const key = 'testkey';
    const obj = { foo: 'bar' };
    const { error, cipher } = aesEncrypt({ content: obj, key });
    expect(error).toBe(false);
    const decrypted = JSON.parse(cryptoJs.AES.decrypt(cipher!, key).toString(cryptoJs.enc.Utf8));
    expect(decrypted).toEqual(obj);
  });
});
