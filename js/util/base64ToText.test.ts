import { base64ToText } from './base64ToText';

describe('base64ToText', () => {
  it('should decode valid base64 string to text', () => {
    const text = 'hello world';

    const base64 = Buffer.from(text).toString('base64');
    const result = base64ToText(base64);

    expect(result).toBe(text);
  });

  it('should handle empty string', () => {
    const base64 = Buffer.from('').toString('base64');
    const result = base64ToText(base64);

    expect(result).toBe('');
  });

  it('should handle special characters', () => {
    const text = 'hello\nworld\twith\rspecial chars';

    const base64 = Buffer.from(text).toString('base64');
    const result = base64ToText(base64);

    expect(result).toBe(text);
  });

  it('should handle unicode characters', () => {
    const text = 'õäöüÕÄÖÜ';

    const base64 = Buffer.from(text).toString('base64');
    const result = base64ToText(base64);

    expect(result).toBe(text);
  });
});
