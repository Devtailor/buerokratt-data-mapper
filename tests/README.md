# Testing Setup

This project uses **Vitest** for testing with **TypeScript** support, even though the main codebase is in JavaScript.

## Test Structure

```
tests/
├── convert/                    # Tests for conversion utilities
│   └── jsonToYamlDomain.test.ts
├── helpers/                    # Test utilities and helpers
│   └── testUtils.ts
└── README.md                   # This file
```

## Running Tests

### Development Mode (Watch)

```bash
npm test
```

This runs tests in watch mode, automatically re-running when files change.

### Run Once

```bash
npm run test:run
```

This runs all tests once and exits.

### UI Mode

```bash
npm run test:ui
```

This opens the Vitest UI for interactive testing and debugging.

## Writing Tests

### Test File Naming

- Test files should end with `.test.ts` or `.spec.ts`
- Place tests in a directory structure that mirrors your source code

### Example Test Structure

```typescript
import { describe, it, expect } from "vitest";
import { yourFunction } from "../../path/to/your/function.js";

describe("yourFunction", () => {
  it("should handle basic case", () => {
    const input = {
      /* test data */
    };
    const expected = "expected output";

    const result = yourFunction(input);
    expect(result).toBe(expected);
  });
});
```

### Using Test Helpers

```typescript
import { expectYamlOutput, createTestData } from "../helpers/testUtils";

it("should handle YAML output", () => {
  const input = createTestData.simple();
  const result = convertJsonToYamlDomain(input);

  expectYamlOutput(result, "expected yaml output");
});
```

## Configuration

- **Vitest Config**: `vitest.config.ts`
- **TypeScript Config**: `tsconfig.json`
- **Package Scripts**: See `package.json` scripts section

## Testing JavaScript with TypeScript

Since the main codebase is JavaScript but tests are in TypeScript:

- Tests can import and test JavaScript modules directly
- TypeScript provides better IDE support and type checking for tests
- The `tsconfig.json` is configured to allow JavaScript files (`"allowJs": true`)

## Best Practices

1. **Test Coverage**: Aim for comprehensive test coverage of edge cases
2. **Descriptive Names**: Use descriptive test names that explain the scenario
3. **Arrange-Act-Assert**: Structure tests with clear arrange, act, and assert sections
4. **Test Data**: Use helper functions to create consistent test data
5. **Isolation**: Each test should be independent and not rely on other tests
