import { createContext } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseClientContextValue {
  supabase: SupabaseClient;
}

export const SupabaseClientContext = createContext<
  SupabaseClientContextValue | undefined
>(undefined);
