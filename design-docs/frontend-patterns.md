# Frontend Design Patterns

This document outlines the core design patterns and architectural principles used in the FaaSr GitHub App frontend (Vite/React).

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [State Management](#state-management)
3. [Component Architecture](#component-architecture)

## Testing Strategy

### Test ID Conventions

**Principle:** All routes must define test IDs for interactive and testable elements to enable reliable automated testing.

#### Test ID Implementation Pattern

```typescript
// Define test IDs as a constant object at the route level
export const AUTH_TEST_IDS = {
  emailInput: "auth-email-input",
  passwordInput: "auth-password-input",
  signInButton: "auth-sign-in-button",
  signUpButton: "auth-sign-up-button",
} as const;
```

#### Guidelines

1. **Route-level constants**: Define test IDs as exported constants at the top of each route file
2. **Naming convention**: Use `{FEATURE}_TEST_IDS` for the constant name
3. **ID format**: Use kebab-case with descriptive names: `{scope}-{element}-{type}`
4. **TypeScript const assertion**: Use `as const` to ensure type safety and autocompletion

#### Conditional Elements

For conditionally rendered elements (labels, errors, hints), apply test IDs conditionally:

```typescript
data-testid={testID ? `${testID}-label` : undefined}
```

**Rationale:** This ensures that:

- Optional UI elements can be tested when they appear
- Test IDs are only applied when a parent test ID is provided
- Component hierarchies maintain consistent test ID patterns

#### Best Practices

- ✅ **DO**: Define test IDs for all interactive elements (buttons, inputs, links)
- ✅ **DO**: Define test IDs for conditionally rendered elements (errors, loading states)
- ✅ **DO**: Use consistent naming patterns across routes
- ✅ **DO**: Export test ID constants for use in tests
- ✅ **DO**: Use `data-testid` attribute for web elements
- ❌ **DON'T**: Hard-code test IDs inline without constants
- ❌ **DON'T**: Skip test IDs for navigation elements

#### Example: Complete Implementation

```typescript
// Route file: app/(auth)/login.tsx
export const LOGIN_TEST_IDS = {
  emailInput: "login-email-input",
  passwordInput: "login-password-input",
  signInButton: "login-sign-in-button",
} as const;

export default function Login() {
  return (
    <form>
      <TextInput
        testID={LOGIN_TEST_IDS.emailInput}
        // ... other props
      />
      <Button
        testID={LOGIN_TEST_IDS.signInButton}
        // ... other props
      />
    </form>
  );
}
```

```typescript
// Component file: components/ui/TextInput.tsx
export const TextInput = ({ testID, label, error, hint, ...props }) => {
  return (
    <div data-testid={testID ? `${testID}-container` : undefined}>
      {label && (
        <label data-testid={testID ? `${testID}-label` : undefined}>
          {label}
        </label>
      )}
      <input
        data-testid={testID ? `${testID}-input` : undefined}
        {...props}
      />
      {error && (
        <div data-testid={testID ? `${testID}-error` : undefined}>
          {error}
        </div>
      )}
      {hint && !error && (
        <div data-testid={testID ? `${testID}-hint` : undefined}>
          {hint}
        </div>
      )}
    </div>
  );
};
```

## State Management

### Single State Object Pattern

**Principle:** Group related state variables into a single state object for atomic, predictable updates.

#### The Problem with Multiple useState

```typescript
// ❌ AVOID: Multiple independent state variables
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [errorMessage, setErrorMessage] = useState<string | null>(null);
const [hasError, setHasError] = useState(false);

// Problems:
// 1. Multiple setState calls can cause race conditions
// 2. State updates are not atomic
// 3. Difficult to ensure consistency between related states
const handleSubmit = async () => {
  setHasError(false);        // Update 1
  setErrorMessage(null);     // Update 2 - might cause multiple re-renders
  // ... async operation
  setHasError(true);         // Update 3
  setErrorMessage(error);    // Update 4 - states might be inconsistent
};
```

#### The Solution: Single State Object

```typescript
// ✅ RECOMMENDED: Single state object
interface LoginState {
  email: string;
  password: string;
  errorMessage: string | null;
  hasError: boolean;
}

const [state, setState] = useState<LoginState>({
  email: "",
  password: "",
  errorMessage: null,
  hasError: false,
});

// Benefits:
// 1. Atomic updates - all related state changes happen together
// 2. Predictable - state is always consistent
// 3. Single re-render per update
const handleSubmit = async () => {
  setState((prev) => ({ 
    ...prev, 
    hasError: false, 
    errorMessage: null 
  })); // Single atomic update
  
  const { success, error } = await signIn(state.email, state.password);
  
  if (!success && error) {
    setState((prev) => ({ 
      ...prev, 
      errorMessage: error, 
      hasError: true 
    })); // Another single atomic update
  }
};
```

#### When to Use This Pattern

✅ **Use single state object when:**

- State variables are related/coupled (e.g., form fields, error states)
- Multiple state variables need to update together
- State consistency is important
- Reducing re-renders is beneficial

❌ **Don't use single state object when:**

- State variables are truly independent
- Over-engineering simple components (single boolean flag, etc.)
- Different state variables trigger different side effects

#### Single State Object Pattern Guidelines

1. **Define TypeScript interface**: Always type your state object
2. **Use functional updates**: Use `setState((prev) => ({ ...prev, ... }))` for atomic updates
3. **Spread previous state**: Always spread `prev` to preserve unchanged fields
4. **Group by relationship**: Only group state that logically belongs together

#### Example: Form with Validation

```typescript
interface FormState {
  // Form fields
  email: string;
  password: string;
  confirmPassword: string;
  
  // Validation state
  errors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
  
  // UI state
  isSubmitting: boolean;
  submitError: string | null;
}

const [state, setState] = useState<FormState>({
  email: "",
  password: "",
  confirmPassword: "",
  errors: {},
  isSubmitting: false,
  submitError: null,
});

// Atomic field update
const handleEmailChange = (email: string) => {
  setState((prev) => ({ 
    ...prev, 
    email,
    errors: { ...prev.errors, email: undefined } // Clear error atomically
  }));
};

// Atomic submit with multiple state changes
const handleSubmit = async () => {
  setState((prev) => ({ 
    ...prev, 
    isSubmitting: true, 
    submitError: null 
  }));
  
  try {
    await submitForm(state.email, state.password);
    // Success - navigate away or reset form
  } catch (error) {
    setState((prev) => ({ 
      ...prev, 
      isSubmitting: false,
      submitError: error.message 
    }));
  }
};
```

## Component Architecture

### Thin Wrapper Pattern

**Principle:** Create reusable UI components as thin wrappers around native HTML elements to establish consistent patterns while maintaining flexibility.

#### Why Thin Wrappers?

1. **Consistency**: Enforce design system and accessibility standards
2. **Reusability**: Share common patterns across the app
3. **Maintainability**: Single source of truth for component behavior
4. **Flexibility**: Don't over-abstract - keep close to native APIs
5. **Performance**: Add optimizations (memoization, etc.) in one place

#### Thin Wrapper Pattern Implementation

```typescript
// ✅ GOOD: Thin wrapper with focused enhancements
import { type InputHTMLAttributes } from "react";

interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  // Custom props for enhanced functionality
  label?: string;
  error?: string;
  hint?: string;
  testID?: string;
  type?: "text" | "email" | "password" | "tel" | "url" | "search";
}

export const TextInput = React.memo(({ 
  label, 
  error, 
  hint, 
  testID,
  ...nativeProps 
}: TextInputProps) => {
  return (
    <div data-testid={testID ? `${testID}-container` : undefined}>
      {label && (
        <label
          htmlFor={inputId}
          data-testid={testID ? `${testID}-label` : undefined}
        >
          {label}
        </label>
      )}
      <input
        {...nativeProps}
        data-testid={testID ? `${testID}-input` : undefined}
        className={/* Tailwind classes */}
      />
      {error && (
        <div
          data-testid={testID ? `${testID}-error` : undefined}
          role="alert"
        >
          {error}
        </div>
      )}
      {hint && !error && (
        <div data-testid={testID ? `${testID}-hint` : undefined}>
          {hint}
        </div>
      )}
    </div>
  );
});
```

#### Thin Wrapper Pattern Guidelines

1. **Start with native props**: Import and extend native HTML element types
2. **Add focused enhancements**: Label, error handling, consistent styling
3. **Require accessibility**: Make accessibility props required where appropriate
4. **Support theming**: Integrate with Tailwind CSS and dark mode
5. **Add test IDs**: Include systematic test ID support
6. **Optimize with memo**: Use `React.memo` for performance
7. **Don't over-abstract**: If you need full native API access, expose it

#### What to Include in Wrappers

✅ **DO include:**

- Consistent styling/theming (Tailwind CSS)
- Standard layout patterns (label, error, hint)
- Accessibility enhancements (ARIA attributes, semantic HTML)
- Test ID patterns
- Common props used across the app
- Performance optimizations (memoization, style memoization)
- Dark mode support

❌ **DON'T include:**

- Complex business logic
- API calls or data fetching
- Heavy state management
- Props you might never use

#### Anti-Pattern: Over-Abstraction

```typescript
// ❌ BAD: Over-abstracted, loses flexibility
interface TextInputProps {
  variant: "email" | "password" | "text" | "number" | "phone";
  size: "small" | "medium" | "large";
  theme: "light" | "dark" | "primary" | "secondary";
  validationRules: ValidationRule[];
  // ... 20+ more custom props
}

// Problems:
// 1. Too opinionated - hard to use for edge cases
// 2. Loses access to native props
// 3. Maintenance burden as requirements grow
// 4. Difficult to extend without modifying wrapper
```

#### Component Wrapper Checklist

When creating a component wrapper, ensure:

- [ ] Extends native HTML element TypeScript types
- [ ] Includes accessibility props (ARIA attributes, semantic HTML)
- [ ] Integrates with Tailwind CSS and dark mode
- [ ] Supports test IDs (with conditional child test IDs)
- [ ] Uses React.memo for optimization
- [ ] Memoizes dynamic styles with useMemo
- [ ] Provides focused, common enhancements only
- [ ] Documents usage with JSDoc comments
- [ ] References design docs in component file header

#### Example: Complete Button Wrapper

```typescript
/**
 * Button component
 * 
 * @see design-docs/frontend-patterns.md
 */

import React, { useMemo } from "react";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  title: string;
  onClick: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary";
  testID?: string;
}

export const Button = React.memo(({
  title,
  onClick,
  loading = false,
  disabled = false,
  variant = "primary",
  testID,
  className,
  ...nativeProps
}: ButtonProps) => {
  const buttonClasses = useMemo(() => {
    const baseClasses = "w-full px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
    const variantClasses =
      variant === "primary"
        ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-400"
        : "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 dark:focus:ring-gray-400";
    return `${baseClasses} ${variantClasses} ${className || ""}`;
  }, [variant, className]);

  return (
    <button
      {...nativeProps}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClasses}
      data-testid={testID}
      aria-busy={loading}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <svg
            className="animate-spin -ml-1 mr-3 h-5 w-5 text-current"
            data-testid={testID ? `${testID}-loading` : undefined}
            aria-hidden="true"
          >
            {/* Spinner SVG */}
          </svg>
          <span data-testid={testID ? `${testID}-text` : undefined}>
            {title}
          </span>
        </span>
      ) : (
        <span data-testid={testID ? `${testID}-text` : undefined}>
          {title}
        </span>
      )}
    </button>
  );
});
```
