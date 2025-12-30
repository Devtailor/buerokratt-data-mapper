import crypto, { KeyObject } from "crypto";

import { EncryptResponse } from "../../interfaces";

export function rsaEncrypt(content: string, publicKey: KeyObject): EncryptResponse {
  if (!content) {
    return {
      error: true,
      message: "Content is missing",
    };
  }

  try {
    const rsaData = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(content),
    );
    return {
      error: false,
      cipher: rsaData.toString("base64"),
    };
  } catch (error) {
    console.error("RSA Encryption Error:", error);
    return {
      error: true,
      message: "RSA Encryption Failed",
    };
  }
}
