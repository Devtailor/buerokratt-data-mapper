import { expect } from "vitest";

/**
 * Helper function to test YAML output by normalizing line endings and whitespace
 */
export const expectYamlOutput = (actual: string, expected: string) => {
  // Normalize line endings and trim whitespace for comparison
  const normalizedActual = actual.replace(/\r\n/g, "\n").trim();
  const normalizedExpected = expected.replace(/\r\n/g, "\n").trim();

  expect(normalizedActual).toBe(normalizedExpected);
};

/**
 * Helper function to create test data with various text field scenarios
 */
export const createTestData = {
  simple: () => ({
    name: "test",
    text: "simple text",
  }),

  withQuotes: () => ({
    text: 'text with "quotes" inside',
  }),

  withNewlines: () => ({
    text: "new\n\nline",
  }),

  complex: () => ({
    conversation: {
      intents: [
        {
          intent: "greet",
          examples: [{ text: "hello\nworld" }, { text: "hi there" }],
        },
      ],
    },
  }),
};

/**
 * Helper function to run a test with multiple input variations
 */
export const testWithVariations = (
  testFn: (input: any) => string,
  testCases: Array<{ input: any; expected: string; description: string }>
) => {
  testCases.forEach(({ input, expected, description }) => {
    it(`should handle ${description}`, () => {
      const result = testFn(input);
      expectYamlOutput(result, expected);
    });
  });
};
