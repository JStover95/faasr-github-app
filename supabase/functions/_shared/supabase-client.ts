import { createClient, type SupabaseClient } from "./deps.ts";

export const deps = {
  createClient,
};

let cachedClient: SupabaseClient | null = null;

// Supabase client is an exception to the `getConfig` pattern because the required
// config is guaranteed by the Edge Runtime.
export function createSupabaseClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const client = deps.createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      global: {
        headers: { Authorization: Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
      },
    },
  );

  cachedClient = client;

  return client;
}

export function clearCachedClient() {
  cachedClient = null;
}
