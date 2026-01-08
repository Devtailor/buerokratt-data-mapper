import crypto from 'crypto';
import type { KeyObject } from 'crypto';

import { beforeAll, describe, expect, it } from 'vitest';

import { rsaEncrypt } from './';

describe('rsaEncrypt', () => {
  let privateKey: KeyObject;
  let publicKey: KeyObject;

  beforeAll(() => {
    const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    publicKey = pub;
    privateKey = priv;
  });

  it('should return error if content is missing', () => {
    expect(rsaEncrypt('', publicKey).error).toBe(true);
  });

  it('should encrypt and decrypt a string correctly', () => {
    const text = 'hello world';
    const { error, cipher } = rsaEncrypt(text, publicKey);
    expect(error).toBe(false);
    expect(typeof cipher).toBe('string');
    const decrypted = crypto
      .privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256',
        },
        Buffer.from(cipher!, 'base64'),
      )
      .toString();
    expect(decrypted).toBe(text);
  });
});
