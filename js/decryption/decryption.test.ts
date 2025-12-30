import crypto from "crypto";
import type { KeyObject } from "crypto";

import cryptoJs from "crypto-js";
import { describe, expect, it } from "vitest";

import { aesDecrypt, base64Decrypt, rsaDecrypt, tripleDesDecrypt } from "./";

const toBase64 = (str: string): string => Buffer.from(str, "utf8").toString("base64");

describe("aesDecrypt", () => {
  it("should return error if cipher or key is missing", () => {
    expect(aesDecrypt({ cipher: "", key: "key", isObject: false }).error).toBe(true);
    expect(aesDecrypt({ cipher: "cipher", key: "", isObject: false }).error).toBe(true);
  });

  it("should decrypt a valid AES cipher string", () => {
    const key = "testkey";
    const text = "hello world";
    const cipher = cryptoJs.AES.encrypt(text, key).toString();
    const result = aesDecrypt({ cipher, key, isObject: false });
    expect(result.error).toBe(false);
    expect(result.content).toBe(text);
  });

  it("should parse JSON if isObject is true", () => {
    const key = "testkey";
    const obj = { foo: "bar" };
    const cipher = cryptoJs.AES.encrypt(JSON.stringify(obj), key).toString();
    const result = aesDecrypt({ cipher, key, isObject: true });
    expect(result.error).toBe(false);
    expect(result.content).toEqual(obj);
  });

  it("should return error on invalid cipher", () => {
    const result = aesDecrypt({ cipher: "invalid", key: "key", isObject: false });
    expect(result.error).toBe(true);
  });
});

describe("base64Decrypt", () => {
  it("should return error if cipher is missing", () => {
    expect(base64Decrypt({ cipher: "", isObject: false }).error).toBe(true);
  });

  it("should decode a valid base64 string", () => {
    const text = "hello world";
    const cipher = toBase64(text);
    const result = base64Decrypt({ cipher, isObject: false });
    expect(result.error).toBe(false);
    expect(result.content).toBe(text);
  });

  it("should parse JSON if isObject is true", () => {
    const obj = { foo: "bar" };
    const cipher = toBase64(JSON.stringify(obj));
    const result = base64Decrypt({ cipher, isObject: true });
    expect(result.error).toBe(false);
    expect(result.content).toEqual(obj);
  });

  it("should return error on invalid base64", () => {
    const result = base64Decrypt({ cipher: "!!!", isObject: false });
    expect(result.error).toBe(true);
  });

  it("should return error on invalid JSON if isObject is true", () => {
    const cipher = toBase64("not json");
    const result = base64Decrypt({ cipher, isObject: true });
    expect(result.error).toBe(true);
  });
});

describe("tripleDesDecrypt", () => {
  it("should return error if cipher or key is missing", () => {
    expect(tripleDesDecrypt({ cipher: "", key: "key", isObject: false }).error).toBe(true);
    expect(tripleDesDecrypt({ cipher: "cipher", key: "", isObject: false }).error).toBe(true);
  });

  it("should decrypt a valid Triple DES cipher string", () => {
    const key = "testkey";
    const text = "hello world";
    const cipher = cryptoJs.TripleDES.encrypt(text, key).toString();
    const result = tripleDesDecrypt({ cipher, key, isObject: false });
    expect(result.error).toBe(false);
    expect(result.content).toBe(text);
  });

  it("should parse JSON if isObject is true", () => {
    const key = "testkey";
    const obj = { foo: "bar" };
    const cipher = cryptoJs.TripleDES.encrypt(JSON.stringify(obj), key).toString();
    const result = tripleDesDecrypt({ cipher, key, isObject: true });
    expect(result.error).toBe(false);
    expect(result.content).toEqual(obj);
  });

  it("should return error on invalid cipher", () => {
    const result = tripleDesDecrypt({ cipher: "invalid", key: "key", isObject: false });
    expect(result.error).toBe(true);
  });
});

describe("rsaDecrypt", () => {
  let privateKey: KeyObject;
  let publicKey: KeyObject;

  beforeAll(() => {
    const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    publicKey = pub;
    privateKey = priv;
  });

  it("should return error if cipher is missing", () => {
    expect(rsaDecrypt("", privateKey).error).toBe(true);
  });

  it("should decrypt a valid RSA cipher string", () => {
    const text = "hello world";
    const buffer = Buffer.from(text);
    const cipher = crypto
      .publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        buffer,
      )
      .toString("base64");
    const result = rsaDecrypt(cipher, privateKey);
    expect(result.error).toBe(false);
    expect(result.content).toBe(text);
  });

  it("should return error on invalid cipher", () => {
    const result = rsaDecrypt("invalid", privateKey);
    expect(result.error).toBe(true);
  });
});
