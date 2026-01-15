# Backend Integration Patterns

This document outlines the patterns and best practices for integrating with Supabase Edge Functions from the frontend, including error handling, type safety, and user-friendly error messaging.

## Table of Contents

1. [Error Handling Pattern](#error-handling-pattern)
2. [Supabase Function Error Types](#supabase-function-error-types)
3. [Implementation Guidelines](#implementation-guidelines)
4. [Examples](#examples)

## Error Handling Pattern

### Overview

All backend integration code (contexts, routes, components) should follow a consistent error handling pattern that:

1. Uses **dedicated error constants** for user-friendly messages
2. Uses **error handler functions** that check Supabase-specific error types
3. Maps backend error codes to frontend error messages
4. Provides structured error responses with appropriate fallbacks

This pattern is based on the AuthContext error handling approach and extends it to all Supabase function invocations.

### Core Principles

1. **Centralized Error Messages**: All error messages are defined as constants at the top of the file
2. **Type-Safe Error Handling**: Use Supabase's error type guards to distinguish error types
3. **Structured Error Responses**: Handler functions return structured objects with error messages and codes
4. **Graceful Degradation**: Always provide default error messages as fallbacks
5. **Backend Error Mapping**: Map backend error codes to user-friendly frontend messages

## Supabase Function Error Types

Supabase provides three specific error types for function invocations:

### 1. FunctionsHttpError

**When it occurs**: The edge function returned an error response (4xx, 5xx status codes)

**Key properties**:

- `context.status` - HTTP status code
- `context.json()` - Async method to get the error response body

**Usage**:

```typescript
if (error instanceof FunctionsHttpError) {
  const errorData = await error.context.json();
  const errorCode = errorData.error || errorData.errorCode;
  const message = errorData.message || error.message;
}
```

### 2. FunctionsRelayError

**When it occurs**: Network/relay error between client and Supabase edge function

**Key properties**:

- `message` - Error message describing the relay error

**Usage**:

```typescript
if (error instanceof FunctionsRelayError) {
  console.log('Relay error:', error.message);
}
```

### 3. FunctionsFetchError

**When it occurs**: Fetch operation failed (network issues, CORS, etc.)

**Key properties**:

- `message` - Error message describing the fetch error

**Usage**:

```typescript
if (error instanceof FunctionsFetchError) {
  console.log('Fetch error:', error.message);
}
```

## Implementation Guidelines

### Step 1: Define Error Constants

Create error constant objects with descriptive names grouped by operation:

```typescript
const OPERATION_ERRORS = {
  specificError1: "User-friendly message for error 1.",
  specificError2: "User-friendly message for error 2.",
  default: "Generic fallback message.",
} as const;
```

**Naming conventions**:

- Use `SCREAMING_SNAKE_CASE` for the constant object name
- Use `camelCase` for individual error keys
- Always include a `default` error message
- Group related errors by operation (e.g., `INSTALL_ERRORS`, `UPLOAD_ERRORS`)

### Step 2: Create Error Mapping Function

Create a dedicated function that maps error codes to user-friendly messages using a `switch/case` pattern:

```typescript
const getOperationErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "specific_error_code_1":
      return OPERATION_ERRORS.specificError1;
    case "specific_error_code_2":
      return OPERATION_ERRORS.specificError2;
    default:
      return OPERATION_ERRORS.default;
  }
};
```

### Step 3: Create Error Handler Functions

Create dedicated handler functions that:

1. Check error types using `instanceof`
2. Extract error data from `FunctionsHttpError.context.json()`
3. Use the error mapping function to get user-friendly messages
4. Return structured error objects

```typescript
const handleOperationError = async (
  error: unknown
): Promise<{ message: string; errorCode?: string }> => {
  if (error instanceof FunctionsHttpError) {
    try {
      const errorData = await error.context.json();
      const errorCode = errorData.error || errorData.errorCode;
      const message =
        errorData.message || getOperationErrorMessage(errorCode);

      return { message, errorCode };
    } catch {
      return { message: error.message || OPERATION_ERRORS.default };
    }
  } else if (error instanceof FunctionsRelayError) {
    return { message: error.message || OPERATION_ERRORS.default };
  } else if (error instanceof FunctionsFetchError) {
    return { message: error.message || OPERATION_ERRORS.default };
  } else if (error instanceof Error) {
    return { message: error.message || OPERATION_ERRORS.default };
  }
  return { message: OPERATION_ERRORS.default };
};
```

### Step 4: Import Error Types

Always import the Supabase error types at the top of your file:

```typescript
import {
  FunctionsHttpError,
  FunctionsRelayError,
  FunctionsFetchError,
} from "@supabase/supabase-js";
```

### Step 5: Use Error Handlers in Function Calls

Apply the error handlers when invoking Supabase functions:

```typescript
try {
  const { data, error } = await supabase.functions.invoke("function-name", {
    method: "GET",
  });

  if (error) {
    const { message } = await handleOperationError(error);
    // Handle error (show toast, update state, etc.)
    return;
  }

  // Handle success
} catch (error) {
  const { message } = await handleOperationError(error);
  // Handle error
}
```

## Examples

### Example 1: WorkflowsContext Error Handling

#### Error Constants

```typescript
const INSTALL_ERRORS = {
  missingInstallationId:
    "Missing installation ID. Please try installing again.",
  missingPermissions:
    "The app needs additional permissions. Please reinstall with the required permissions.",
  noForkFound:
    "No fork of the source repository found. Please fork the repository and try again.",
  rateLimit: "Too many requests. Please try again in a few minutes.",
  failedToGetUser: "Failed to get user. Please try again.",
  installationFailed: "Installation failed. Please try again.",
  default: "Failed to initiate installation.",
} as const;
```

#### Error Mapping Function (Example 1)

```typescript
const getInstallErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "missing_installation_id":
      return INSTALL_ERRORS.missingInstallationId;
    case "missing_permissions":
      return INSTALL_ERRORS.missingPermissions;
    case "no_fork_found":
      return INSTALL_ERRORS.noForkFound;
    case "rate_limit":
      return INSTALL_ERRORS.rateLimit;
    case "failed_to_get_user":
      return INSTALL_ERRORS.failedToGetUser;
    case "installation_failed":
      return INSTALL_ERRORS.installationFailed;
    default:
      return INSTALL_ERRORS.installationFailed;
  }
};
```

#### Error Handler

```typescript
const handleFunctionError = async (
  error: unknown
): Promise<{ message: string; errorCode?: string }> => {
  if (error instanceof FunctionsHttpError) {
    try {
      const errorData = await error.context.json();
      const errorCode = errorData.error || errorData.errorCode;
      const message =
        errorData.message || getInstallErrorMessage(errorCode);

      return { message, errorCode };
    } catch {
      return { message: error.message || INSTALL_ERRORS.default };
    }
  } else if (error instanceof FunctionsRelayError) {
    return { message: error.message || INSTALL_ERRORS.default };
  } else if (error instanceof FunctionsFetchError) {
    return { message: error.message || INSTALL_ERRORS.default };
  } else if (error instanceof Error) {
    return { message: error.message || INSTALL_ERRORS.default };
  }
  return { message: INSTALL_ERRORS.default };
};
```

#### Usage in Context Function

```typescript
const initiateInstall = useCallback(async () => {
  setState((prev) => ({
    ...prev,
    loading: true,
    error: null,
  }));

  try {
    const { data, error } = await supabase.functions.invoke("install", {
      method: "GET",
    });

    if (error) {
      const { message } = await handleFunctionError(error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
      toastActions.showToast(message, "error");
      return;
    }

    // Handle success case
    if (
      data &&
      typeof data === "object" &&
      "success" in data &&
      data.success &&
      "redirectUrl" in data
    ) {
      window.location.href = data.redirectUrl as string;
    } else {
      const message = INSTALL_ERRORS.default;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: message,
      }));
      toastActions.showToast(message, "error");
    }
  } catch (error) {
    const { message } = await handleFunctionError(error);
    setState((prev) => ({
      ...prev,
      loading: false,
      error: message,
    }));
    toastActions.showToast(message, "error");
  }
}, [supabase, toastActions]);
```

### Example 2: Callback Route Error Handling

#### Error Constants (Example 2)

```typescript
const CALLBACK_ERRORS = {
  missingInstallationId:
    "Missing installation ID. Please try installing again.",
  missingPermissions:
    "The app needs additional permissions. Please reinstall with the required permissions.",
  noForkFound:
    "No fork of the source repository found. Please fork the repository and try again.",
  rateLimit: "Too many requests. Please try again in a few minutes.",
  failedToGetUser: "Failed to get user. Please try again.",
  installationFailed: "Installation failed. Please try again.",
  invalidResponse: "Invalid response from callback.",
  default: "Failed to process installation callback.",
} as const;
```

#### Error Mapping Function (Example 2)

```typescript
const getCallbackErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "missing_installation_id":
      return CALLBACK_ERRORS.missingInstallationId;
    case "missing_permissions":
      return CALLBACK_ERRORS.missingPermissions;
    case "no_fork_found":
      return CALLBACK_ERRORS.noForkFound;
    case "rate_limit":
      return CALLBACK_ERRORS.rateLimit;
    case "failed_to_get_user":
      return CALLBACK_ERRORS.failedToGetUser;
    case "installation_failed":
      return CALLBACK_ERRORS.installationFailed;
    default:
      return CALLBACK_ERRORS.installationFailed;
  }
};
```

#### Error Handler (Route-specific)

```typescript
const handleCallbackError = async (
  error: unknown
): Promise<{ message: string; errorCode?: string }> => {
  if (error instanceof FunctionsHttpError) {
    try {
      const errorData = await error.context.json();
      const errorCode = errorData.error || errorData.errorCode;
      const message =
        errorData.message || getCallbackErrorMessage(errorCode);

      return { message, errorCode };
    } catch {
      return { message: error.message || CALLBACK_ERRORS.default };
    }
  } else if (error instanceof FunctionsRelayError) {
    return { message: error.message || CALLBACK_ERRORS.default };
  } else if (error instanceof FunctionsFetchError) {
    return { message: error.message || CALLBACK_ERRORS.default };
  } else if (error instanceof Error) {
    return { message: error.message || CALLBACK_ERRORS.default };
  }
  return { message: CALLBACK_ERRORS.default };
};
```

#### Usage in Route

```typescript
const processCallback = async () => {
  try {
    const queryParams = new URLSearchParams({
      installation_id: installationId,
    }).toString();
    const { data, error } = await supabase.functions.invoke(
      `callback?${queryParams}`,
      {
        method: "GET",
      }
    );

    if (error) {
      const { message } = await handleCallbackError(error);
      toastActions.showToast(message, "error");
      navigate("/");
      return;
    }

    if (!data || typeof data !== "object") {
      toastActions.showToast(CALLBACK_ERRORS.invalidResponse, "error");
      navigate("/");
      return;
    }

    if ("success" in data && data.success) {
      // Handle success
      const login = (data.login as string) || undefined;
      const successMessage = login
        ? `GitHub App installed successfully for ${login}!`
        : "GitHub App installed successfully!";
      toastActions.showToast(successMessage, "success");
      workflowsActions.checkInstallation();
      navigate("/");
    } else {
      // Handle failure response
      const errorCode = (data.error as string) || "installation_failed";
      const errorMessage =
        (data.message as string) || getCallbackErrorMessage(errorCode);

      toastActions.showToast(errorMessage, "error");
      navigate("/");
    }
  } catch (error) {
    const { message } = await handleCallbackError(error);
    toastActions.showToast(message, "error");
    navigate("/");
  }
};
```

### Example 3: Special Case - 404 Handling in Polling

For operations that poll for status (e.g., workflow registration), you may need to distinguish between "not found yet" (404) and actual errors:

```typescript
const REGISTRATION_ERRORS = {
  invalidResponse: "Invalid response from status check.",
  notFound: "Workflow run not found yet.",
  timeout: "Registration status check timed out. Please check manually.",
  default: "Failed to check registration status.",
} as const;

const handleRegistrationError = async (
  error: unknown
): Promise<{ message: string; isNotFound: boolean }> => {
  if (error instanceof FunctionsHttpError) {
    // Check for 404 (workflow run not found yet)
    if (error.context.status === 404) {
      return { message: REGISTRATION_ERRORS.notFound, isNotFound: true };
    }
    try {
      const errorData = await error.context.json();
      const message =
        errorData.message ||
        errorData.error ||
        error.message ||
        REGISTRATION_ERRORS.default;
      return { message, isNotFound: false };
    } catch {
      return {
        message: error.message || REGISTRATION_ERRORS.default,
        isNotFound: false,
      };
    }
  } else if (error instanceof FunctionsRelayError) {
    return {
      message: error.message || REGISTRATION_ERRORS.default,
      isNotFound: false,
    };
  } else if (error instanceof FunctionsFetchError) {
    return {
      message: error.message || REGISTRATION_ERRORS.default,
      isNotFound: false,
    };
  } else if (error instanceof Error) {
    // Check if it's a 404 (workflow run not found yet)
    if (
      error.message?.includes("404") ||
      error.message?.includes("not found")
    ) {
      return { message: REGISTRATION_ERRORS.notFound, isNotFound: true };
    }
    return {
      message: error.message || REGISTRATION_ERRORS.default,
      isNotFound: false,
    };
  }
  return { message: REGISTRATION_ERRORS.default, isNotFound: false };
};

// Usage in polling function
const checkStatus = async () => {
  try {
    const { data, error } = await supabase.functions.invoke(
      `workflows?${queryParams}`,
      {
        method: "GET",
      }
    );

    if (error) {
      const { message, isNotFound } = await handleRegistrationError(error);
      // If it's a 404 (workflow run not found yet), continue polling
      if (isNotFound) {
        return; // Continue polling
      }
      throw new Error(message);
    }

    // Process data...
  } catch (error) {
    // Handle error...
  }
};
```

## Best Practices

### 1. Consistent Error Structure

Always structure errors consistently:

```typescript
{
  message: string;      // User-friendly message
  errorCode?: string;   // Optional backend error code
}
```

### 2. Async Error Handlers

Make error handlers `async` to support extracting JSON from `FunctionsHttpError`:

```typescript
const handleError = async (error: unknown): Promise<{ message: string }> => {
  // ...
};
```

### 3. Always Await Error Handlers

When calling async error handlers, always await them:

```typescript
const { message } = await handleError(error);
```

### 4. Fallback Messages

Always provide fallback messages at every level:

```typescript
// 1. Extract from error data
const message = errorData.message || 
                errorData.error || 
                error.message || 
                ERROR_CONSTANTS.default;

// 2. Catch block for JSON parsing
} catch {
  return { message: error.message || ERROR_CONSTANTS.default };
}

// 3. Final fallback
return { message: ERROR_CONSTANTS.default };
```

### 5. Error Code Mapping

Map backend error codes to user-friendly messages using a `switch/case` pattern:

```typescript
const getErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "missing_installation_id":
      return INSTALL_ERRORS.missingInstallationId;
    case "missing_permissions":
      return INSTALL_ERRORS.missingPermissions;
    default:
      return INSTALL_ERRORS.default;
  }
};
```

**Rationale**: The `switch/case` pattern is more readable and maintainable than nested ternary operators or multiple `if` statements, especially when mapping multiple error codes.

### 6. Type Guards

Use `instanceof` for type checking, not string comparisons:

```typescript
// ✅ Good
if (error instanceof FunctionsHttpError) {
  // ...
}

// ❌ Bad
if (error.name === "FunctionsHttpError") {
  // ...
}
```

### 7. Context Status Checks

For HTTP errors, check the status code when needed:

```typescript
if (error instanceof FunctionsHttpError) {
  if (error.context.status === 404) {
    // Handle 404 specifically
  }
}
```

## Backend Integration Checklist

When integrating with a new Supabase edge function:

- [ ] Import Supabase error types (`FunctionsHttpError`, `FunctionsRelayError`, `FunctionsFetchError`)
- [ ] Define error constants for the operation
- [ ] Create error handler function(s) with type checking
- [ ] Map backend error codes to frontend messages
- [ ] Use error handler in function invocation
- [ ] Provide fallback messages at all levels
- [ ] Handle both `error` from response and `catch` block errors
- [ ] Update state and show user feedback (toasts, etc.)
- [ ] Test error scenarios (network errors, backend errors, invalid responses)

## Related Patterns

- **[AuthContext Error Handling](../frontend/src/contexts/AuthContext/Provider.tsx)** - Original pattern for auth errors
- **[Frontend Patterns](./frontend-patterns.md)** - General frontend architecture patterns
- **[Supabase Edge Functions](./supabase.md)** - Backend error response patterns
