/**
 * Toast component
 *
 * @see design-docs/frontend-patterns.md
 */

import React, { useMemo, useEffect, useState, useCallback } from "react";

export const TOAST_TEST_IDS = {
  toast: "toast",
  message: "toast-message",
  closeButton: "toast-close-button",
} as const;

export interface ToastProps {
  id: string;
  message: string;
  variant?: "success" | "error" | "info" | "warning";
  duration?: number;
  onDismiss: (id: string) => void;
  testID?: string;
}

export const Toast = React.memo(
  ({
    id,
    message,
    variant = "info",
    duration = 5000,
    onDismiss,
    testID,
  }: ToastProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    const handleDismiss = useCallback(() => {
      setIsExiting(true);
      setTimeout(() => {
        onDismiss(id);
      }, 300); // Match transition duration
    }, [id, onDismiss]);

    useEffect(() => {
      // Trigger enter animation
      const enterTimer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(enterTimer);
    }, []);

    useEffect(() => {
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, duration);
        return () => clearTimeout(timer);
      }
    }, [duration, handleDismiss]);

    const toastClasses = useMemo(() => {
      const baseClasses =
        "min-w-[320px] max-w-md p-4 rounded-lg shadow-lg transition-all duration-300 flex items-start justify-between gap-3";
      const variantClasses = {
        success: "bg-green-600 text-white dark:bg-green-500 dark:text-white",
        error: "bg-red-600 text-white dark:bg-red-500 dark:text-white",
        info: "bg-blue-600 text-white dark:bg-blue-500 dark:text-white",
        warning:
          "bg-yellow-500 text-gray-900 dark:bg-yellow-400 dark:text-gray-900",
      };
      const visibilityClasses =
        isVisible && !isExiting
          ? "opacity-100 translate-x-0"
          : "opacity-0 translate-x-full";
      return `${baseClasses} ${variantClasses[variant]} ${visibilityClasses}`;
    }, [variant, isVisible, isExiting]);

    const closeButtonClasses = useMemo(() => {
      const baseClasses =
        "flex-shrink-0 p-1 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
      const variantClasses = {
        success:
          "hover:bg-green-700 focus:ring-green-300 dark:hover:bg-green-600 dark:focus:ring-green-400",
        error:
          "hover:bg-red-700 focus:ring-red-300 dark:hover:bg-red-600 dark:focus:ring-red-400",
        info: "hover:bg-blue-700 focus:ring-blue-300 dark:hover:bg-blue-600 dark:focus:ring-blue-400",
        warning:
          "hover:bg-yellow-600 focus:ring-yellow-300 dark:hover:bg-yellow-500 dark:focus:ring-yellow-400",
      };
      return `${baseClasses} ${variantClasses[variant]}`;
    }, [variant]);

    return (
      <div
        role="alert"
        aria-live="polite"
        aria-atomic="true"
        data-testid={testID || `${TOAST_TEST_IDS.toast}-${id}`}
        className={toastClasses}
      >
        <div
          data-testid={
            testID ? `${testID}-message` : `${TOAST_TEST_IDS.message}-${id}`
          }
          className="flex-1 text-sm font-medium"
        >
          {message}
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
          data-testid={
            testID
              ? `${testID}-close-button`
              : `${TOAST_TEST_IDS.closeButton}-${id}`
          }
          className={closeButtonClasses}
        >
          <svg
            className="w-5 h-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    );
  }
);

Toast.displayName = "Toast";
