import crypto from "crypto";
import type { KeyObject } from "crypto";

import cryptoJs from "crypto-js";
import { describe, expect, it } from "vitest";

import { aesEncrypt, base64Encrypt, rsaEncrypt, stringToBase64Encrypt, tripleDesEncrypt } from "./";

const fromBase64 = (str: string): string => Buffer.from(str, "base64").toString("utf8");

describe("aesEncrypt", () => {
  it("should return error if content or key is missing", () => {
    expect(aesEncrypt({ content: "", key: "key" }).error).toBe(true);
    expect(aesEncrypt({ content: "text", key: "" }).error).toBe(true);
  });

  it("should encrypt and decrypt a string correctly", () => {
    const key = "testkey";
    const text = "hello world";
    const { error, cipher } = aesEncrypt({ content: text, key });
    expect(error).toBe(false);
    expect(typeof cipher).toBe("string");
    const decrypted = cryptoJs.AES.decrypt(cipher!, key).toString(cryptoJs.enc.Utf8);
    expect(decrypted).toBe(text);
  });

  it("should encrypt and decrypt an object", () => {
    const key = "testkey";
    const obj = { foo: "bar" };
    const { error, cipher } = aesEncrypt({ content: obj, key });
    expect(error).toBe(false);
    const decrypted = JSON.parse(cryptoJs.AES.decrypt(cipher!, key).toString(cryptoJs.enc.Utf8));
    expect(decrypted).toEqual(obj);
  });
});

describe("base64Encrypt", () => {
  it("should return error if content is missing", () => {
    expect(base64Encrypt("").error).toBe(true);
  });

  it("should encode and decode a string", () => {
    const text = "hello world";
    const { error, cipher } = base64Encrypt(text);
    expect(error).toBe(false);
    expect(fromBase64(cipher!)).toBe(text);
  });

  it("should encode and decode an object", () => {
    const obj = { foo: "bar" };
    const { error, cipher } = base64Encrypt(obj);
    expect(error).toBe(false);
    expect(JSON.parse(fromBase64(cipher!))).toEqual(obj);
  });
});

describe("stringToBase64Encrypt", () => {
  it("should encode a string to base64", () => {
    const text = "hello world";
    const result = stringToBase64Encrypt(text);
    expect(result?.cipher).toBe(Buffer.from(text).toString("base64"));
  });

  it("should handle empty string", () => {
    expect(stringToBase64Encrypt("")?.cipher).toBe("");
  });
});

describe("tripleDesEncrypt", () => {
  it("should return error if content or key is missing", () => {
    expect(tripleDesEncrypt({ content: "", key: "key" }).error).toBe(true);
    expect(tripleDesEncrypt({ content: "text", key: "" }).error).toBe(true);
  });

  it("should encrypt and decrypt a string correctly", () => {
    const key = "testkey";
    const text = "hello world";
    const { error, cipher } = tripleDesEncrypt({ content: text, key });
    expect(error).toBe(false);
    expect(typeof cipher).toBe("string");
    const decrypted = cryptoJs.TripleDES.decrypt(cipher!, key).toString(cryptoJs.enc.Utf8);
    expect(decrypted).toBe(text);
  });

  it("should encrypt and decrypt an object", () => {
    const key = "testkey";
    const obj = { foo: "bar" };
    const { error, cipher } = tripleDesEncrypt({ content: obj, key });
    expect(error).toBe(false);
    const decrypted = JSON.parse(cryptoJs.TripleDES.decrypt(cipher!, key).toString(cryptoJs.enc.Utf8));
    expect(decrypted).toEqual(obj);
  });
});

describe("rsaEncrypt", () => {
  let privateKey: KeyObject;
  let publicKey: KeyObject;

  beforeAll(() => {
    const { publicKey: pub, privateKey: priv } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    publicKey = pub;
    privateKey = priv;
  });

  it("should return error if content is missing", () => {
    expect(rsaEncrypt("", publicKey).error).toBe(true);
  });

  it("should encrypt and decrypt a string correctly", () => {
    const text = "hello world";
    const { error, cipher } = rsaEncrypt(text, publicKey);
    expect(error).toBe(false);
    expect(typeof cipher).toBe("string");
    const decrypted = crypto
      .privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        Buffer.from(cipher!, "base64"),
      )
      .toString();
    expect(decrypted).toBe(text);
  });
});
