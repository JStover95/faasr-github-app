/**
 * ToastContainer component
 *
 * @see design-docs/frontend-patterns.md
 */

import React from "react";
import { useToastContext } from "@/contexts/ToastContext/use-toast-context";
import { Toast } from "./Toast";

export const TOAST_CONTAINER_TEST_IDS = {
  container: "toast-container",
} as const;

export const ToastContainer = React.memo(() => {
  const { toasts, actions } = useToastContext();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      data-testid={TOAST_CONTAINER_TEST_IDS.container}
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            id={toast.id}
            message={toast.message}
            variant={toast.variant}
            duration={toast.duration}
            onDismiss={actions.dismissToast}
            testID={`toast-${toast.id}`}
          />
        </div>
      ))}
    </div>
  );
});

ToastContainer.displayName = "ToastContainer";
