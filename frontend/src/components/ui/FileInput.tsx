/**
 * FileInput component
 *
 * @see design-docs/frontend-patterns.md
 */

import React, { useMemo, useRef } from "react";
import type { InputHTMLAttributes } from "react";

interface FileInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> {
  label?: string;
  error?: string;
  hint?: string;
  testID?: string;
  selectedFileName?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FileInput = React.memo(
  ({
    label,
    error,
    hint,
    testID,
    id,
    className,
    accept,
    onChange,
    disabled,
    selectedFileName,
    ...nativeProps
  }: FileInputProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    const buttonId = useMemo(
      () => (testID ? `${testID}-button` : undefined),
      [testID]
    );

    const containerClasses = useMemo(
      () => `w-full ${className || ""}`,
      [className]
    );

    const labelClasses = useMemo(
      () => "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
      []
    );

    const buttonClasses = useMemo(() => {
      const baseClasses =
        "w-full px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 border";
      const stateClasses = error
        ? "border-red-500 focus:ring-red-500 dark:border-red-600 dark:focus:ring-red-600"
        : "border-gray-300 focus:ring-blue-500 dark:border-gray-600 dark:focus:ring-blue-400";
      const bgClasses =
        "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100";
      const hoverClasses = disabled
        ? ""
        : "hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer";
      const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";
      return `${baseClasses} ${stateClasses} ${bgClasses} ${hoverClasses} ${disabledClasses}`;
    }, [error, disabled]);

    const errorClasses = useMemo(
      () => "mt-1 text-sm text-red-600 dark:text-red-400",
      []
    );

    const hintClasses = useMemo(
      () => "mt-1 text-sm text-gray-500 dark:text-gray-400",
      []
    );

    const handleButtonClick = () => {
      if (!disabled && fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    return (
      <div
        data-testid={testID ? `${testID}-container` : undefined}
        className={containerClasses}
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
        <div className="relative">
          <input
            {...nativeProps}
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept={accept}
            onChange={onChange}
            disabled={disabled}
            className="hidden"
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            data-testid={testID ? `${testID}-input` : undefined}
          />
          <button
            type="button"
            id={buttonId}
            data-testid={buttonId}
            onClick={handleButtonClick}
            disabled={disabled}
            className={buttonClasses}
            aria-label={label || "Select file"}
          >
            {selectedFileName || "Choose file"}
          </button>
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

FileInput.displayName = "FileInput";
