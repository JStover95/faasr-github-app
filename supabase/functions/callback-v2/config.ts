/**
 * Callback V2 Config
 *
 * Configuration management for callback-v2 edge function.
 * Uses caching pattern for performance.
 *
 * @see design-docs/supabase.md - Config caching pattern
 */

import type { CORSOptions } from "../_shared/cors.ts";

export interface CallbackV2Config {
  githubClientId: string;
  githubClientSecret: string;
  githubAppId: string;
  githubPrivateKey: string;
  jwtSecret: string;
  corsOptions?: CORSOptions;
}

let configCache: CallbackV2Config | null = null;

export function clearCache(): void {
  configCache = null;
}

export function getConfig(): CallbackV2Config {
  if (configCache) {
    return configCache;
  }

  const githubClientId = Deno.env.get("GITHUB_CLIENT_ID");
  const githubClientSecret = Deno.env.get("GITHUB_CLIENT_SECRET");
  const githubAppId = Deno.env.get("GITHUB_APP_ID");
  const githubPrivateKey = Deno.env.get("GITHUB_PRIVATE_KEY");
  const jwtSecret = Deno.env.get("JWT_SECRET");

  if (!githubClientId) {
    throw new Error("Missing environment variable: GITHUB_CLIENT_ID");
  }
  if (!githubClientSecret) {
    throw new Error("Missing environment variable: GITHUB_CLIENT_SECRET");
  }
  if (!githubAppId) {
    throw new Error("Missing environment variable: GITHUB_APP_ID");
  }
  if (!githubPrivateKey) {
    throw new Error("Missing environment variable: GITHUB_PRIVATE_KEY");
  }
  if (!jwtSecret) {
    throw new Error("Missing environment variable: JWT_SECRET");
  }

  configCache = {
    githubClientId,
    githubClientSecret,
    githubAppId,
    githubPrivateKey,
    jwtSecret,
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
