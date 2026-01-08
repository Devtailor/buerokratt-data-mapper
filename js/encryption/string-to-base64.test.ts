import { describe, expect, it } from 'vitest';

import { stringToBase64Encrypt } from './';

describe('stringToBase64Encrypt', () => {
  it('should encode a string to base64', () => {
    const text = 'hello world';
    const result = stringToBase64Encrypt(text);
    expect(result?.cipher).toBe(Buffer.from(text).toString('base64'));
  });

  it('should handle empty string', () => {
    expect(stringToBase64Encrypt('')?.cipher).toBe('');
  });
});
