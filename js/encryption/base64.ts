import { EncryptResponse } from "../../interfaces";

export function base64Encrypt(content: string | object): EncryptResponse {
  if (!content) {
    return {
      error: true,
      message: "Content is missing",
    };
  }

  try {
    const data = typeof content === "string" ? content : JSON.stringify(content);
    return {
      error: false,
      cipher: btoa(data),
    };
  } catch (error) {
    console.error("Base64 Encryption Error:", error);
    return {
      error: true,
      message: "Base64 Encryption Failed",
    };
  }
}
