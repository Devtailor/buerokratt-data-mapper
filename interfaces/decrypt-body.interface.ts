export interface DecryptBodyBase {
  cipher: string;
  isObject?: boolean;
}

export interface DecryptBodyWithKey extends DecryptBodyBase {
  key: string;
}
