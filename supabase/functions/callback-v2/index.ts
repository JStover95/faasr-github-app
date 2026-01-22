/**
 * Callback V2 Edge Function Entry Point
 *
 * @see design-docs/supabase.md - Index.ts isolation pattern
 */

import { handler } from "./handler.ts";
import { setCorsHeaders } from "../_shared/cors.ts";
import { getConfig } from "./config.ts";

// No dependency injection for function entrypoints

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    const response = new Response("OK");
    setCorsHeaders(response, getConfig().corsOptions);
    return response;
  }

  const response = await handler(req);
  setCorsHeaders(response, getConfig().corsOptions);
  return response;
});
