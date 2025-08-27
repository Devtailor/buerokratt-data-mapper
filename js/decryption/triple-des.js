import crypto from 'crypto-js';

export default async function tripleDesDecrypt(cipher, key, isObject) {
  if (!cipher || !key) {
    return {
      error: true,
      message: `${!cipher ? 'Cipher is missing' : 'Key is missing'}`,
    };
  }

  try {
    const bytes = crypto.TripleDES.decrypt(cipher, key);
    return {
      error: false,
      content: !isObject ? bytes.toString(crypto.enc.Utf8) : JSON.parse(bytes.toString(crypto.enc.Utf8)),
    };
  } catch (_) {
    return {
      error: true,
      message: 'Triple DES Decryption Failed',
    };
  }
}
