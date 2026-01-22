/**
 * Hook for accessing StatelessWorkflowsContext
 *
 * @see design-docs/frontend-patterns.md - Context pattern
 */

import { useContext } from "react";
import { StatelessWorkflowsContext } from "./Context";

export function useStatelessWorkflowsContext() {
  const context = useContext(StatelessWorkflowsContext);
  if (!context) {
    throw new Error(
      "useStatelessWorkflowsContext must be used within StatelessWorkflowsProvider"
    );
  }
  return context;
}
