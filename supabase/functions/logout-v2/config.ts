/**
 * Logout V2 Config
 *
 * Configuration management for logout-v2 edge function.
 * Uses caching pattern for performance.
 *
 * @see design-docs/supabase.md - Config caching pattern
 */

import type { CORSOptions } from "../_shared/cors.ts";

export interface LogoutV2Config {
  corsOptions?: CORSOptions;
}

let configCache: LogoutV2Config | null = null;

export function clearCache(): void {
  configCache = null;
}

export function getConfig(): LogoutV2Config {
  if (configCache) {
    return configCache;
  }

  configCache = {};

  const corsOrigin = Deno.env.get("CORS_ORIGIN");
  const corsHeaders = Deno.env.get("CORS_HEADERS");
  const corsCredentials = Deno.env.get("CORS_CREDENTIALS");

  if (corsOrigin || corsHeaders || corsCredentials) {
    configCache.corsOptions = {
      origin: corsOrigin,
      headers: corsHeaders,
      credentials: corsCredentials,
    };
  }

  return configCache;
}
