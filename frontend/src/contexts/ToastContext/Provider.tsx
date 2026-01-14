/**
 * ToastContext Provider
 *
 * @see design-docs/frontend-patterns.md
 */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  type PropsWithChildren,
} from "react";
import { ToastContext, type ToastContextValue, type Toast } from "./Context";

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 5000;

export function ToastProvider({ children }: PropsWithChildren) {
  // Following Single State Object Pattern
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Auto-dismiss timers map
  const timersRef = useMemo(() => new Map<string, NodeJS.Timeout>(), []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timersRef.forEach((timer) => clearTimeout(timer));
      timersRef.clear();
    };
  }, [timersRef]);

  const dismissToast = useCallback(
    (id: string) => {
      // Clear timer if exists
      const timer = timersRef.get(id);
      if (timer) {
        clearTimeout(timer);
        timersRef.delete(id);
      }

      // Remove toast from state
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    },
    [timersRef]
  );

  const showToast = useCallback(
    (
      message: string,
      variant: Toast["variant"] = "info",
      duration: number = DEFAULT_DURATION
    ) => {
      const id = crypto.randomUUID();
      const newToast: Toast = {
        id,
        message,
        variant,
        duration,
      };

      setToasts((prev) => {
        // Limit to MAX_TOASTS - remove oldest if at limit
        const updated = [...prev, newToast];
        if (updated.length > MAX_TOASTS) {
          const oldest = updated[0];
          const timer = timersRef.get(oldest.id);
          if (timer) {
            clearTimeout(timer);
            timersRef.delete(oldest.id);
          }
          return updated.slice(1);
        }
        return updated;
      });

      // Set up auto-dismiss timer
      if (duration > 0) {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, duration);
        timersRef.set(id, timer);
      }
    },
    [dismissToast, timersRef]
  );

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      toasts,
      actions: {
        showToast,
        dismissToast,
      },
    }),
    [toasts, showToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
    </ToastContext.Provider>
  );
}
