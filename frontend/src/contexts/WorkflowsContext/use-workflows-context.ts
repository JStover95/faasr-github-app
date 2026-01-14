/**
 * Hook to access WorkflowsContext
 *
 * @see design-docs/frontend-patterns.md
 */

import { useContext } from "react";
import { WorkflowsContext } from "./Context";

/**
 * Hook to access WorkflowsContext
 * @throws Error if used outside WorkflowsProvider
 */
export function useWorkflowsContext() {
  const context = useContext(WorkflowsContext);

  if (context === undefined) {
    throw new Error(
      "useWorkflowsContext must be used within a WorkflowsProvider"
    );
  }

  return context;
}
