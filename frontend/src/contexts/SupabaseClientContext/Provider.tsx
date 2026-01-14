/**
 * SupabaseClientContext Provider
 */

import React, { useMemo, useEffect } from "react";
import {
  SupabaseClientContext,
  type SupabaseClientContextValue,
} from "./Context";
import { createSupabaseClient } from "@/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

interface SupabaseClientProviderProps {
  children: React.ReactNode;
  client?: SupabaseClient; // Optional for dependency injection
}

export function SupabaseClientProvider({
  children,
  client,
}: SupabaseClientProviderProps) {
  const supabaseClient = useMemo(() => {
    if (client) {
      return client;
    }
    return createSupabaseClient();
  }, [client]);

  useEffect(() => {
    return () => {};
  }, []);

  const value = useMemo<SupabaseClientContextValue>(
    () => ({
      supabase: supabaseClient,
    }),
    [supabaseClient]
  );

  return (
    <SupabaseClientContext.Provider value={value}>
      {children}
    </SupabaseClientContext.Provider>
  );
}
