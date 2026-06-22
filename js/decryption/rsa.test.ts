import crypto from 'crypto';
import type { KeyObject } from 'crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import { rsaDecrypt } from './';

describe('rsaDecrypt', () => {
  let privateKey: KeyObject;
  let publicKey: KeyObject;

  beforeAll(() => {
    const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    publicKey = pub;
    privateKey = priv;
  });

  it('should return error if cipher is missing', () => {
    expect(rsaDecrypt('', privateKey).error).toBe(true);
  });

  it('should decrypt a valid RSA cipher string', () => {
    const text = 'hello world';
    const buffer = Buffer.from(text);
    const cipher = crypto
      .publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        buffer,
      )
      .toString('base64');
    const result = rsaDecrypt(cipher, privateKey);
    expect(result.error).toBe(false);
    expect(result.content).toBe(text);
  });

  it('should return error on invalid cipher', () => {
    const result = rsaDecrypt('invalid', privateKey);
    expect(result.error).toBe(true);
  });
});
