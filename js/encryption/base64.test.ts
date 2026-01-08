import { describe, expect, it } from 'vitest';

import { base64Encrypt } from './';

const fromBase64 = (str: string): string => Buffer.from(str, 'base64').toString('utf8');

describe('base64Encrypt', () => {
  it('should return error if content is missing', () => {
    expect(base64Encrypt('').error).toBe(true);
  });

  it('should encode and decode a string', () => {
    const text = 'hello world';
    const { error, cipher } = base64Encrypt(text);
    expect(error).toBe(false);
    expect(fromBase64(cipher!)).toBe(text);
  });

  it('should encode and decode an object', () => {
    const obj = { foo: 'bar' };
    const { error, cipher } = base64Encrypt(obj);
    expect(error).toBe(false);
    expect(JSON.parse(fromBase64(cipher!))).toEqual(obj);
  });
});
