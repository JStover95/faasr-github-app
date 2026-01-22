/**
 * Install V2 Config
 *
 * Configuration management for install-v2 edge function.
 * Uses caching pattern for performance.
 *
 * @see design-docs/supabase.md - Config caching pattern
 */

import type { CORSOptions } from "../_shared/cors.ts";

export interface InstallV2Config {
  githubClientId: string;
  githubCallbackUrlV2: string;
  corsOptions?: CORSOptions;
}

let configCache: InstallV2Config | null = null;

export function clearCache(): void {
  configCache = null;
}

export function getConfig(): InstallV2Config {
  if (configCache) {
    return configCache;
  }

  const githubClientId = Deno.env.get("GITHUB_CLIENT_ID");
  const githubCallbackUrlV2 = Deno.env.get("GITHUB_OAUTH_CALLBACK_URL_V2");

  if (!githubClientId) {
    throw new Error("Missing environment variable: GITHUB_CLIENT_ID");
  }
  if (!githubCallbackUrlV2) {
    throw new Error(
      "Missing environment variable: GITHUB_OAUTH_CALLBACK_URL_V2",
    );
  }

  configCache = {
    githubClientId,
    githubCallbackUrlV2,
  };

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
