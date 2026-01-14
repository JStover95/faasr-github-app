/**
 * ToastContext - Toast notification state and actions
 *
 * @see design-docs/frontend-patterns.md
 */

import { createContext } from "react";

/**
 * Toast notification
 */
export interface Toast {
  id: string;
  message: string;
  variant: "success" | "error" | "info" | "warning";
  duration?: number;
}

/**
 * Toast actions
 */
export interface ToastActions {
  /** Show a toast notification */
  showToast: (
    message: string,
    variant?: Toast["variant"],
    duration?: number
  ) => void;
  /** Dismiss a toast by ID */
  dismissToast: (id: string) => void;
}

/**
 * Complete context value combining state and actions
 */
export interface ToastContextValue {
  toasts: Toast[];
  actions: ToastActions;
}

/**
 * ToastContext provides access to toast notifications
 */
export const ToastContext = createContext<ToastContextValue | undefined>(
  undefined
);
