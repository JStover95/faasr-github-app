# Supabase Edge Functions Design Patterns

This document outlines design patterns and best practices for Supabase Edge Functions in this codebase. These patterns ensure maintainability, testability, and proper error handling.

## Routing Constraints

Supabase Edge Functions do not support nested RESTful path patterns (e.g., `/user/{id}/profile`). Each edge function must have a single URL path (e.g., `/functions/v1/install` or `/functions/v1/workflows`). Routing should be based on HTTP methods and query parameters rather than path segments.

**Best Practices:**

- Route based on HTTP method (GET, POST, PUT, DELETE)
- Use query parameters for resource identifiers (e.g., `?filename=workflow.json`)
- Separate concerns into different edge functions rather than using nested paths
- Return 405 (Method Not Allowed) for unsupported HTTP methods

**Example:**

```typescript
// ✅ Good: Route by HTTP method
export async function handler(req: Request): Promise<Response> {
  if (req.method === "GET") {
    return handleGet(req);
  } else if (req.method === "POST") {
    return handlePost(req);
  } else {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ✅ Good: Use query params for identifiers
const url = new URL(req.url);
const filename = url.searchParams.get("filename");

// ❌ Bad: Nested path routing (not supported by Supabase)
if (path === "/workflows/status/filename.json") { ... }
```

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
- HTTP method-based routing

**Example:**

```typescript
export async function handler(req: Request) {
  const url = new URL(req.url);
  
  console.log("[FUNCTION] Request received", {
    method: req.method,
    fullPath: url.pathname,
    timestamp: new Date().toISOString(),
  });

  try {
    // Route based on HTTP method
    if (req.method === "GET") {
      return await handleGet(req);
    } else if (req.method === "POST") {
      return await handlePost(req);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } }
      );
    }
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
  ├── handler.ts        # Main request handler with HTTP method routing
  ├── config.ts         # Configuration management
  └── deno.json         # Deno configuration

_shared/
  └── errors.ts         # Shared error classes (if needed)
  └── *.ts              # Other shared utilities
```

## Example Functions

### Install Function (GET only)

- **URL**: `/functions/v1/install`
- **Method**: GET
- **Purpose**: Initiate GitHub App installation

### Callback Function (GET only)

- **URL**: `/functions/v1/callback?installation_id=123`
- **Method**: GET
- **Purpose**: Handle OAuth callback from GitHub

### Workflows Function (GET and POST)

- **URL**: `/functions/v1/workflows`
- **Methods**:
  - GET with `?filename=workflow.json` - Get workflow status
  - POST with FormData - Upload workflow

## Summary

These patterns work together to create:

- **Testable code**: Dependencies are wrapped and abstracted
- **Maintainable code**: Clear separation of concerns
- **Robust error handling**: Custom errors with appropriate responses
- **Performance**: Config caching reduces env access overhead
- **Clean architecture**: Isolated entry points and clear module boundaries
