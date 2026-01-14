/**
 * Button component
 *
 * @see design-docs/frontend-patterns.md
 */

import React, { useMemo } from "react";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick"
> {
  title: string;
  onClick: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary";
  testID?: string;
}

export const Button = React.memo(
  ({
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
      const baseClasses =
        "w-full px-4 py-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
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
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              data-testid={testID ? `${testID}-loading` : undefined}
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
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
  }
);

Button.displayName = "Button";
