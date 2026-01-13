# Supabase Edge Functions Design Patterns

This document outlines design patterns and best practices for Supabase Edge Functions in this codebase. These patterns ensure maintainability, testability, and proper error handling.

## Design Patterns

### 1. Custom Error Classes (`_shared/errors.ts`)

Create custom error classes and export them from a shared `errors.ts` file located in `_shared/`. This provides:

- Type-safe error handling
- Consistent error responses across functions
- Clear error categorization (e.g., `MalformedRequestError`, `InternalServerError`)

**Example:**

```typescript
export class MalformedRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MalformedRequestError";
  }
}
```

### 2. Dependency Wrapping for Testing (`agent.ts`, `handler.ts`)

Wrap dependencies in a `deps` object to enable test mocking. This pattern allows:

- Easy unit testing by replacing dependencies with mocks
- Clear dependency declarations
- Separation of concerns

**Example:**

```typescript
const deps = {
  getConfig,
  queryDictionary,
};
```

### 3. Config Management (`config.ts`)

**Cache the config** to avoid multiple calls to `Deno.env`. **Verify, pull, and cache the config** in a dedicated `config.ts` file. This provides:

- Performance optimization (single env access)
- Centralized configuration validation
- Type safety with a config interface
- Early failure if required env vars are missing

**Example:**

```typescript
let cachedConfig: DictionaryAgentConfig | null = null;

export function getConfig(): DictionaryAgentConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  // ... validation and caching logic
}
```

### 4. Abstract Client Initialization (`handler.ts`)

**Abstract client initialization** to separate functions for test mocking. This allows:

- Easy mocking of external service clients in tests
- Clear separation of client creation logic
- Consistent client setup across the function

**Example:**

```typescript
function createAnthropicClient() {
  const { anthropicApiKey } = deps.getConfig();
  return new deps.Anthropic({
    apiKey: anthropicApiKey,
  });
}
```

### 5. Single Handler Function (`handler.ts`)

**Create a single handler function** for initializing clients, classes, orchestrating execution, and handling errors. This provides:

- Clear entry point for the edge function
- Centralized error handling
- Separation of concerns (handler vs. business logic)

**Example:**

```typescript
export async function handler(req: Request) {
  try {
    // ... initialization and execution
  } catch (err) {
    // ... error handling
  }
}
```

### 6. Error Handling (`handler.ts`)

**Log and handle unexpected errors** with a generic error message. This ensures:

- Sensitive error details are not exposed to clients
- Errors are logged for debugging
- Appropriate HTTP status codes are returned
- Custom error types are handled appropriately

**Example:**

```typescript
catch (err) {
  if (err instanceof MalformedRequestError) {
    return new Response(String(err.message), { status: 400 });
  }
  console.error(err);
  return new Response(
    new InternalServerError("An unexpected error occurred").message,
    { status: 500 }
  );
}
```

### 7. Index.ts Isolation (`index.ts`)

**Serve the function from an `index.ts` file alone** so Deno does not interfere with testing. This pattern:

- Keeps the Deno.serve call isolated
- Allows importing handler for testing without executing Deno.serve
- Maintains clean separation between runtime and test code

**Example:**

```typescript
import { handler } from "./handler.ts";

Deno.serve(handler);
```

## File Structure

A typical Supabase Edge Function should follow this structure:

```plaintext
function-name/
  ├── index.ts          # Deno.serve entry point only
  ├── handler.ts        # Main request handler with error handling
  ├── agent.ts          # Business logic (if applicable)
  ├── config.ts         # Configuration management
  ├── tools.ts          # Tool definitions (if applicable)
  ├── deps.ts           # Dependency imports
  └── deno.json         # Deno configuration

_shared/
  └── errors.ts         # Shared error classes
```

## Summary

These patterns work together to create:

- **Testable code**: Dependencies are wrapped and abstracted
- **Maintainable code**: Clear separation of concerns
- **Robust error handling**: Custom errors with appropriate responses
- **Performance**: Config caching reduces env access overhead
- **Clean architecture**: Isolated entry points and clear module boundaries
