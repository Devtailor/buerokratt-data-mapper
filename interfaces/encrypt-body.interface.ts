export interface EncryptBodyBase {
  content: string | object;
}

export interface EncryptBodyWithKey extends EncryptBodyBase {
  key: string;
}
