/**
 * Hook to access AuthContext
 *
 * @see design-docs/context-pattern.md
 */

import { useContext } from "react";
import { AuthContext } from "./Context";

/**
 * Hook to access AuthContext
 * @throws Error if used outside AuthProvider
 */
export function useAuthContext() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }

  return context;
}
