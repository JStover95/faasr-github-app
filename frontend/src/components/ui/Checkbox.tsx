/**
 * Checkbox component
 *
 * @see design-docs/frontend-patterns.md
 */

import React, { useMemo } from "react";
import type { InputHTMLAttributes } from "react";

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> {
  label?: string;
  error?: string;
  hint?: string;
  testID?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Checkbox = React.memo(
  ({
    label,
    error,
    hint,
    testID,
    id,
    className,
    checked,
    onChange,
    disabled,
    ...nativeProps
  }: CheckboxProps) => {
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

    const containerClasses = useMemo(
      () => `w-full ${className || ""}`,
      [className]
    );

    const checkboxWrapperClasses = useMemo(() => "flex items-center", []);

    const checkboxClasses = useMemo(() => {
      const baseClasses =
        "h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors";
      const stateClasses = error
        ? "border-red-500 focus:ring-red-500 dark:border-red-600 dark:focus:ring-red-600"
        : "border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:focus:ring-blue-400";
      const disabledClasses = disabled
        ? "opacity-50 cursor-not-allowed"
        : "cursor-pointer";
      return `${baseClasses} ${stateClasses} ${disabledClasses}`;
    }, [error, disabled]);

    const labelClasses = useMemo(
      () =>
        "ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer",
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
        className={containerClasses}
      >
        <div className={checkboxWrapperClasses}>
          <input
            {...nativeProps}
            id={inputId}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            className={checkboxClasses}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            data-testid={testID ? `${testID}-input` : undefined}
          />
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
        </div>
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

Checkbox.displayName = "Checkbox";
