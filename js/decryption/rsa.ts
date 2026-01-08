import crypto, { KeyObject } from 'crypto';

import { DecryptResponse } from '../../interfaces';

export function rsaDecrypt(cipher: string, privateKey: KeyObject): DecryptResponse {
  if (!cipher) {
    return {
      error: true,
      message: 'Cipher is missing',
    };
  }

  try {
    const rsaDecryptedData = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256',
      },
      Buffer.from(cipher, 'base64'),
    );
    return {
      error: false,
      content: rsaDecryptedData.toString(),
    };
  } catch (error) {
    console.log('Decryption Error:', error);
    return {
      error: true,
      message: 'RSA Decryption Failed',
    };
  }
}
