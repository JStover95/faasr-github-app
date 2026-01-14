/**
 * Hook to access ToastContext
 *
 * @see design-docs/frontend-patterns.md
 */

import { useContext } from "react";
import { ToastContext } from "./Context";

/**
 * Hook to access ToastContext
 * @throws Error if used outside ToastProvider
 */
export function useToastContext() {
  const context = useContext(ToastContext);

  if (context === undefined) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }

  return context;
}
