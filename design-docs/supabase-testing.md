# Testing Strategy

This document outlines testing patterns and best practices for Supabase Edge Functions and related code. These patterns ensure reliable, maintainable, and isolated tests.

## Testing Patterns

### 1. Mock Factory Pattern with Queues

**When mocking services or clients, use a mock factory pattern** that uses queues for mocking responses. This pattern allows:

- Sequential response configuration for multiple calls
- Clear test setup with predictable behavior
- Easy verification of call sequences
- Reusable mock implementations

**Example:**

```typescript
export class MockSupabaseClient {
  private _rpcResponses: Map<
    string,
    ((args: unknown) => { data: unknown; error: unknown })[]
  > = new Map();

  withRpcResponse(
    fn: string,
    callback: (args: unknown) => { data: unknown; error: unknown },
  ): this {
    const queue = this._rpcResponses.get(fn) || [];
    queue.push(callback);
    this._rpcResponses.set(fn, queue);
    return this;
  }

  rpc(fn: string, args: unknown): Promise<{ data: unknown; error: unknown }> {
    const queue = this._rpcResponses.get(fn);
    if (!queue || queue.length === 0) {
      return Promise.reject(
        new Error(`No RPC response configured for function: ${fn}`)
      );
    }
    const callback = queue.shift()!;
    return Promise.resolve(callback(args));
  }
}
```

### 2. Mock Client Wrapper Functions

**Wrap mock clients in a function that returns explicit any (safe for tests)**. This pattern:

- Provides type safety flexibility in test contexts
- Allows mock objects to satisfy complex type requirements
- Keeps test code clean and readable
- Isolates type casting to test utilities

**Example:**

```typescript
export function createMockSupabaseClient() {
  // deno-lint-ignore no-explicit-any
  return new MockSupabaseClient() as any;
}
```

### 3. Environment State Management

**When testing config, save and restore the env**. This ensures:

- Tests don't pollute the environment for other tests
- Tests can run in any order without side effects
- Clean test isolation
- Proper cleanup even if tests fail

**Example:**

```typescript
Deno.test("getConfig - should return a valid config", () => {
  const savedEnv = saveEnvState([
    "ANTHROPIC_MODEL",
    "ANTHROPIC_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);

  try {
    clearCache();
    Deno.env.set("ANTHROPIC_MODEL", "test_model");
    // ... set other env vars
    const config = getConfig();
    // ... assertions
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});
```

**Utility Functions:**

```typescript
export function saveEnvState(keys: string[]): EnvState {
  const state: EnvState = {};
  for (const key of keys) {
    state[key] = Deno.env.get(key);
  }
  return state;
}

export function restoreEnvState(state: EnvState): void {
  for (const [key, value] of Object.entries(state)) {
    if (value !== undefined) {
      Deno.env.set(key, value);
    } else {
      Deno.env.delete(key);
    }
  }
}
```

### 4. Dependency Stubbing

**TDD: Abstract client initialization allows for easy mocking in tests**. When dependencies are wrapped in a `deps` object (as per implementation patterns), use stubs to replace them in tests:

- Use Deno's `stub` function from `@std/testing/mock`
- Always restore stubs in `finally` blocks
- Stub the dependency object, not the implementation directly

**Example:**

```typescript
import { stub } from "jsr:@std/testing@1.0.16/mock";
import { deps } from "../../../functions/dictionary-agent/tools.ts";

Deno.test("queryDictionaryImpl - should return a query result", async () => {
  const mockSupabaseClient = createMockSupabaseClient();
  
  const createSupabaseClientStub = stub(
    deps,
    "createSupabaseClient",
    () => mockSupabaseClient,
  );

  try {
    mockSupabaseClient.withRpcResponse("search_dictionary_entries", () => ({
      data: [/* test data */],
      error: null,
    }));

    const result = await queryDictionaryImpl({ query: "test_query" });
    // ... assertions
  } finally {
    createSupabaseClientStub.restore();
  }
});
```

### 5. Test Structure

Follow this structure for consistent, maintainable tests:

1. **Setup**: Save env state, create mocks, configure stubs
2. **Execution**: Call the function under test
3. **Assertion**: Verify expected behavior
4. **Cleanup**: Restore env state, restore stubs (always in `finally` blocks)

**Template:**

```typescript
Deno.test("functionName - should do something", async () => {
  // Setup
  const savedEnv = saveEnvState([/* env keys */]);
  const mockClient = createMockSupabaseClient();
  const stub = stub(deps, "dependency", () => mockClient);

  try {
    // Configure mocks
    mockClient.withRpcResponse("function", () => ({ data: {}, error: null }));

    // Execution
    const result = await functionUnderTest();

    // Assertion
    assertEquals(result, expectedValue);
  } finally {
    // Cleanup
    stub.restore();
    restoreEnvState(savedEnv);
  }
});
```

## Test Utilities

Common test utilities should be placed in `supabase/tests/test-utils.ts`:

- `saveEnvState()` - Save current environment variable values
- `restoreEnvState()` - Restore environment variable values
- `MockSupabaseClient` - Mock Supabase client with queue-based responses
- `createMockSupabaseClient()` - Factory function for mock clients

## Best Practices

1. **Always use `finally` blocks** for cleanup to ensure it runs even if tests fail
2. **Clear caches** when testing cached functions (like `getConfig()`)
3. **Isolate tests** - each test should be independent and not rely on others
4. **Use descriptive test names** - follow the pattern: `functionName - should do something`
5. **Mock external dependencies** - never make real API calls or database queries in tests
6. **Test error cases** - verify error handling and edge cases
7. **Use appropriate assertions** - `assertEquals`, `assertRejects`, `assertThrows` from `@std/assert`

## Relationship to Implementation Patterns

These testing patterns work in conjunction with the implementation patterns documented in [supabase.md](./supabase.md):

- **Dependency wrapping enables easy mocking** - the `deps` object pattern allows stubbing
- **Abstract client initialization** - separate client creation functions can be easily stubbed
- **Config caching** - tests must clear cache between runs to ensure isolation
- **Index.ts isolation** - keeping `Deno.serve` separate allows importing handlers for testing

## Summary

These testing patterns ensure:

- **Isolated tests**: Environment and dependencies are properly managed
- **Maintainable tests**: Clear patterns and utilities reduce boilerplate
- **Reliable tests**: Proper cleanup prevents test pollution
- **Fast tests**: Mocks eliminate external dependencies and network calls
- **Clear test intent**: Factory patterns and descriptive names make tests self-documenting
