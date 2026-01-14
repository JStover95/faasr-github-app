/**
 * Hook to access SupabaseClientContext
 */

import { useContext } from "react";
import { SupabaseClientContext } from "./Context";

/**
 * Hook to access SupabaseClientContext
 */
export function useSupabaseClientContext() {
  const context = useContext(SupabaseClientContext);

  if (context === undefined) {
    throw new Error(
      "useSupabaseClientContext must be used within a SupabaseClientProvider"
    );
  }

  return context;
}
