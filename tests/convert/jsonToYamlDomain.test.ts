import { describe, it, expect } from "vitest";
import { convertJsonToYamlDomain } from "../../js/convert/jsonToYamlDomain.js";

describe("convertJsonToYamlDomain", () => {
  it("should convert simple JSON to YAML with proper text field handling", () => {
    const input = {
      name: "test",
      text: "simple text",
    };

    const result = convertJsonToYamlDomain(input);
    const expected = 'name: test\ntext: "simple text"\n';

    expect(result).toBe(expected);
  });

  it("should handle text fields with quotes properly", () => {
    const input = {
      text: 'text with "quotes" inside',
    };

    const result = convertJsonToYamlDomain(input);
    const expected = 'text: "text with \\"quotes\\" inside"\n';

    expect(result).toBe(expected);
  });

  it("should handle text fields with single quotes", () => {
    const input = {
      text: "text with 'single quotes'",
    };

    const result = convertJsonToYamlDomain(input);
    const expected = "text: \"text with 'single quotes'\"\n";

    expect(result).toBe(expected);
  });

  it("should preserve newlines in text fields as escaped characters", () => {
    const input = {
      text: "new\n\nline",
    };

    const result = convertJsonToYamlDomain(input);
    const expected = 'text: "new\\n\\nline"\n';

    expect(result).toBe(expected);
  });

  it("should handle mixed newlines and quotes", () => {
    const input = {
      text: 'text with "quotes"\nand newlines',
    };

    const result = convertJsonToYamlDomain(input);
    const expected = 'text: "text with \\"quotes\\"\\nand newlines"\n';

    expect(result).toBe(expected);
  });

  it("should handle arrays with text fields", () => {
    const input = {
      items: [{ text: "first item" }, { text: "second item\nwith newline" }],
    };

    const result = convertJsonToYamlDomain(input);
    const expected = `items:
  - text: "first item"
  - text: "second item\\nwith newline"
`;

    expect(result).toBe(expected);
  });

  it("should handle nested objects with text fields", () => {
    const input = {
      level1: {
        level2: {
          text: "nested text\nwith newline",
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

  it("should handle mixed content types", () => {
    const input = {
      number: 42,
      boolean: true,
      text: "text with\nnewlines",
      array: [1, 2, 3],
      object: { key: "value" },
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

  it("should handle empty objects and arrays", () => {
    const input = {
      emptyObject: {},
      emptyArray: [],
      text: "some text",
    };

    const result = convertJsonToYamlDomain(input);
    const expected = `emptyObject: {}
emptyArray: []
text: "some text"
`;

    expect(result).toBe(expected);
  });

  it("should handle null values", () => {
    const input = {
      nullValue: null,
      text: "text with null context",
    };

    const result = convertJsonToYamlDomain(input);
    const expected = `nullValue: null
text: "text with null context"
`;

    expect(result).toBe(expected);
  });

  it("should handle special characters in text fields", () => {
    const input = {
      text: "text with \t tabs and \r carriage returns",
    };

    const result = convertJsonToYamlDomain(input);
    const expected = 'text: "text with \\t tabs and \\r carriage returns"\n';

    expect(result).toBe(expected);
  });

  it("should handle complex nested structure", () => {
    const input = {
      conversation: {
        intents: [
          {
            intent: "greet",
            examples: [{ text: "hello\nworld" }, { text: "hi there" }],
          },
          {
            intent: "goodbye",
            examples: [{ text: "bye\nbye" }],
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
