import { createClient, type SupabaseClient } from "./deps.ts";

export const deps = {
  createClient,
};

// Supabase client is an exception to the `getConfig` pattern because the required
// config is guaranteed by the Edge Runtime.
export function createSupabaseClient(req: Request): SupabaseClient {
  // Extract Authorization header from request (contains user JWT)
  const authHeader = req.headers.get("Authorization") ?? "";

  // Create client with ANON_KEY and user's JWT token
  const client = deps.createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    {
      global: {
        headers: { Authorization: authHeader },
      },
    },
  );

  return client;
}
