import { describe, expect, it } from 'vitest';

import { convertJsonToYamlDomain, escapeTextFieldNewlines } from './jsonToYamlDomain.js';

describe('convertJsonToYamlDomain', () => {
  it('should convert simple JSON to YAML with proper text field handling', () => {
    const input = {
      name: 'test',
      text: 'simple text',
    };

    const result = convertJsonToYamlDomain(input);
    const expected = 'name: test\ntext: "simple text"\n';

    expect(result).toBe(expected);
  });

  it('should handle text fields with quotes properly', () => {
    const input = {
      text: 'text with "quotes" inside',
    };

    const result = convertJsonToYamlDomain(input);
    const expected = 'text: "text with \\"quotes\\" inside"\n';

    expect(result).toBe(expected);
  });

  it('should handle text fields with single quotes', () => {
    const input = {
      text: "text with 'single quotes'",
    };

    const result = convertJsonToYamlDomain(input);
    const expected = 'text: "text with \'single quotes\'"\n';

    expect(result).toBe(expected);
  });

  it('should preserve newlines in text fields as escaped characters', () => {
    const input = {
      text: 'new\n\nline',
    };

    const result = convertJsonToYamlDomain(input);
    const expected = 'text: "new\\n\\nline"\n';

    expect(result).toBe(expected);
  });

  it('should handle mixed newlines and quotes', () => {
    const input = {
      text: 'text with "quotes"\nand newlines',
    };

    const result = convertJsonToYamlDomain(input);
    const expected = 'text: "text with \\"quotes\\"\\nand newlines"\n';

    expect(result).toBe(expected);
  });

  it('should handle arrays with text fields', () => {
    const input = {
      items: [{ text: 'first item' }, { text: 'second item\nwith newline' }],
    };

    const result = convertJsonToYamlDomain(input);
    const expected = `items:
  - text: "first item"
  - text: "second item\\nwith newline"
`;

    expect(result).toBe(expected);
  });

  it('should handle nested objects with text fields', () => {
    const input = {
      level1: {
        level2: {
          text: 'nested text\nwith newline',
        },
      },
    };

    const result = convertJsonToYamlDomain(input);
    const expected = `level1:
  level2:
    text: "nested text\\nwith newline"
`;

    expect(result).toBe(expected);
  });

  it('should handle mixed content types', () => {
    const input = {
      number: 42,
      boolean: true,
      text: 'text with\nnewlines',
      array: [1, 2, 3],
      object: { key: 'value' },
    };

    const result = convertJsonToYamlDomain(input);
    const expected = `number: 42
boolean: true
text: "text with\\nnewlines"
array:
  - 1
  - 2
  - 3
object:
  key: value
`;

    expect(result).toBe(expected);
  });

  it('should handle empty objects and arrays', () => {
    const input = {
      emptyObject: {},
      emptyArray: [],
      text: 'some text',
    };

    const result = convertJsonToYamlDomain(input);
    const expected = `emptyObject: {}
emptyArray: []
text: "some text"
`;

    expect(result).toBe(expected);
  });

  it('should handle null values', () => {
    const input = {
      nullValue: null,
      text: 'text with null context',
    };

    const result = convertJsonToYamlDomain(input);
    const expected = `nullValue: null
text: "text with null context"
`;

    expect(result).toBe(expected);
  });

  it('should handle tabs and carriage returns without escaping them', () => {
    const input = {
      text: 'text with \t tabs and \r carriage returns',
    };

    const result = convertJsonToYamlDomain(input);
    // The YAML library will escape these characters, but our function doesn't
    expect(result).toContain('text: "');
    expect(result).toContain('tabs and');
    expect(result).toContain('carriage returns"');
  });

  it('should handle complex nested structure', () => {
    const input = {
      conversation: {
        intents: [
          {
            intent: 'greet',
            examples: [{ text: 'hello\nworld' }, { text: 'hi there' }],
          },
          {
            intent: 'goodbye',
            examples: [{ text: 'bye\nbye' }],
          },
        ],
      },
    };

    const result = convertJsonToYamlDomain(input);
    const expected = `conversation:
  intents:
    - intent: greet
      examples:
        - text: "hello\\nworld"
        - text: "hi there"
    - intent: goodbye
      examples:
        - text: "bye\\nbye"
`;

    expect(result).toBe(expected);
  });
});

describe('escapeTextFieldNewlines', () => {
  it('should process simple text field with newlines', () => {
    const input = { text: 'hello\nworld' };
    const result = escapeTextFieldNewlines(input);
    const expected = { text: 'hello\\nworld' };
    expect(result).toEqual(expected);
  });

  it('should process text field with multiple newlines', () => {
    const input = { text: 'line1\n\nline3' };
    const result = escapeTextFieldNewlines(input);
    const expected = { text: 'line1\\n\\nline3' };
    expect(result).toEqual(expected);
  });

  it('should not process non-text fields', () => {
    const input = { name: 'hello\nworld', text: 'hello\nworld' };
    const result = escapeTextFieldNewlines(input);
    const expected = { name: 'hello\nworld', text: 'hello\\nworld' };
    expect(result).toEqual(expected);
  });

  it('should process nested objects with text fields', () => {
    const input = { level1: { level2: { text: 'nested\ntext' } } };
    const result = escapeTextFieldNewlines(input);
    const expected = { level1: { level2: { text: 'nested\\ntext' } } };
    expect(result).toEqual(expected);
  });

  it('should process arrays with text fields', () => {
    const input = {
      items: [{ text: 'first\nitem' }, { text: 'second\nitem' }],
    };
    const result = escapeTextFieldNewlines(input);
    const expected = {
      items: [{ text: 'first\\nitem' }, { text: 'second\\nitem' }],
    };
    expect(result).toEqual(expected);
  });

  it('should handle mixed content types', () => {
    const input = {
      number: 42,
      boolean: true,
      text: 'text\nwith\nnewlines',
      array: [1, 2, 3],
      object: { key: 'value' },
    };
    const result = escapeTextFieldNewlines(input);
    const expected = {
      number: 42,
      boolean: true,
      text: 'text\\nwith\\nnewlines',
      array: [1, 2, 3],
      object: { key: 'value' },
    };
    expect(result).toEqual(expected);
  });

  it('should handle empty objects and arrays', () => {
    const input = { emptyObject: {}, emptyArray: [], text: 'some\ntext' };
    const result = escapeTextFieldNewlines(input);
    const expected = { emptyObject: {}, emptyArray: [], text: 'some\\ntext' };
    expect(result).toEqual(expected);
  });

  it('should handle null values', () => {
    const input = { nullValue: null, text: 'text\nwith\nnull' };
    const result = escapeTextFieldNewlines(input);
    const expected = { nullValue: null, text: 'text\\nwith\\nnull' };
    expect(result).toEqual(expected);
  });

  it('should handle complex nested structure', () => {
    const input = {
      conversation: {
        intents: [
          {
            intent: 'greet',
            examples: [{ text: 'hello\nworld' }, { text: 'hi\nthere' }],
          },
        ],
      },
    };
    const result = escapeTextFieldNewlines(input);
    const expected = {
      conversation: {
        intents: [
          {
            intent: 'greet',
            examples: [{ text: 'hello\\nworld' }, { text: 'hi\\nthere' }],
          },
        ],
      },
    };
    expect(result).toEqual(expected);
  });

  it('should handle non-string text values', () => {
    const input = { text: 123, anotherText: 'real\ntext' };
    const result = escapeTextFieldNewlines(input);
    const expected = { text: 123, anotherText: 'real\ntext' };
    expect(result).toEqual(expected);
  });

  it('should handle deeply nested text fields', () => {
    const input = {
      a: { b: { c: { d: { e: { text: 'very\ndeep\nnesting' } } } } },
    };
    const result = escapeTextFieldNewlines(input);
    const expected = {
      a: { b: { c: { d: { e: { text: 'very\\ndeep\\nnesting' } } } } },
    };
    expect(result).toEqual(expected);
  });

  it('should handle primitive values', () => {
    const input = 'just a string';
    const result = escapeTextFieldNewlines(input);
    expect(result).toBe(input);
  });

  it('should handle null input', () => {
    const input = null;
    const result = escapeTextFieldNewlines(input);
    expect(result).toBe(input);
  });

  it('should handle undefined input', () => {
    const input = undefined;
    const result = escapeTextFieldNewlines(input);
    expect(result).toBe(input);
  });
});
