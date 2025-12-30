import crypto from "crypto-js";

import { DecryptBodyWithKey, DecryptResponse } from "../../interfaces";

export function tripleDesDecrypt(body: DecryptBodyWithKey): DecryptResponse {
  const { cipher, key, isObject } = body;
  if (!cipher || !key) {
    return {
      error: true,
      message: !cipher ? "Cipher is missing" : "Key is missing",
    };
  }

  try {
    const bytes = crypto.TripleDES.decrypt(cipher, key);
    const utf8 = bytes.toString(crypto.enc.Utf8);

    // Crypto-JS returns empty string for invalid decrypt
    if (!utf8) {
      return {
        error: true,
        message: "Invalid cipher or key",
      };
    }

    return {
      error: false,
      content: !isObject ? utf8 : JSON.parse(utf8),
    };
  } catch (error) {
    console.error("Triple DES Decryption Error:", error);
    return {
      error: true,
      message: "Triple DES Decryption Failed",
    };
  }
}
