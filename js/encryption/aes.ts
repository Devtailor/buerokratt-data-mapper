import crypto from 'crypto-js';

import { EncryptBodyWithKey, EncryptResponse } from '../../interfaces';

export function aesEncrypt(body: EncryptBodyWithKey): EncryptResponse {
  const { content, key } = body;
  if (!content || !key) {
    return {
      error: true,
      message: !content ? 'Content is missing' : 'Key is missing',
    };
  }

  try {
    const data = typeof content === 'string' ? content : JSON.stringify(content);
    return {
      error: false,
      cipher: crypto.AES.encrypt(data, key).toString(),
    };
  } catch (error) {
    console.error('AES Encryption Error:', error);
    return {
      error: true,
      message: 'AES Encryption Failed',
    };
  }
}
