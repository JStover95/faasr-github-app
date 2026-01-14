/**
 * TextInput component
 *
 * @see design-docs/frontend-patterns.md
 */

import React, { useMemo } from "react";
import type { InputHTMLAttributes } from "react";

interface TextInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label?: string;
  error?: string;
  hint?: string;
  testID?: string;
  type?: "text" | "email" | "password" | "tel" | "url" | "search";
}

export const TextInput = React.memo(
  ({
    label,
    error,
    hint,
    testID,
    id,
    className,
    ...nativeProps
  }: TextInputProps) => {
    const inputId = useMemo(
      () => id || (testID ? `${testID}-input` : undefined),
      [id, testID]
    );
    const labelId = useMemo(
      () => (testID ? `${testID}-label` : undefined),
      [testID]
    );
    const errorId = useMemo(
      () => (testID ? `${testID}-error` : undefined),
      [testID]
    );
    const hintId = useMemo(
      () => (testID ? `${testID}-hint` : undefined),
      [testID]
    );

    const inputClasses = useMemo(() => {
      const baseClasses =
        "w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors";
      const stateClasses = error
        ? "border-red-500 focus:ring-red-500 dark:border-red-600 dark:focus:ring-red-600"
        : "border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:focus:ring-blue-400";
      const bgClasses =
        "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100";
      return `${baseClasses} ${stateClasses} ${bgClasses} ${className || ""}`;
    }, [error, className]);

    const labelClasses = useMemo(
      () => "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
      []
    );

    const errorClasses = useMemo(
      () => "mt-1 text-sm text-red-600 dark:text-red-400",
      []
    );

    const hintClasses = useMemo(
      () => "mt-1 text-sm text-gray-500 dark:text-gray-400",
      []
    );

    return (
      <div
        data-testid={testID ? `${testID}-container` : undefined}
        className="w-full"
      >
        {label && (
          <label
            htmlFor={inputId}
            id={labelId}
            data-testid={labelId}
            className={labelClasses}
          >
            {label}
          </label>
        )}
        <input
          {...nativeProps}
          id={inputId}
          type={nativeProps.type || "text"}
          className={inputClasses}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          data-testid={testID ? `${testID}-input` : undefined}
        />
        {error && (
          <div
            id={errorId}
            data-testid={errorId}
            className={errorClasses}
            role="alert"
          >
            {error}
          </div>
        )}
        {hint && !error && (
          <div id={hintId} data-testid={hintId} className={hintClasses}>
            {hint}
          </div>
        )}
      </div>
    );
  }
);

TextInput.displayName = "TextInput";
