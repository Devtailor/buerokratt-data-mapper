import { DecryptBodyBase, DecryptResponse } from '../../interfaces';

export function base64Decrypt(body: DecryptBodyBase): DecryptResponse {
  const { cipher, isObject } = body;
  if (!cipher) {
    return {
      error: true,
      message: 'Cipher is missing',
    };
  }

  try {
    const decoded = atob(cipher);
    return {
      error: false,
      content: !isObject ? decoded : JSON.parse(decoded),
    };
  } catch (error) {
    console.error('Base64 Decryption Error:', error);
    return {
      error: true,
      message: 'Base64 Decryption Failed',
    };
  }
}
