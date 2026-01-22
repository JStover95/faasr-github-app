/**
 * Hook for accessing StatelessAuthContext
 *
 * @see design-docs/frontend-patterns.md - Context pattern
 */

import { useContext } from "react";
import { StatelessAuthContext } from "./Context";

export function useStatelessAuthContext() {
  const context = useContext(StatelessAuthContext);
  if (!context) {
    throw new Error(
      "useStatelessAuthContext must be used within StatelessAuthProvider"
    );
  }
  return context;
}
