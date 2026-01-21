/**
 * Auth Status V2 Config
 *
 * Configuration management for auth-status-v2 edge function.
 * Uses caching pattern for performance.
 *
 * @see design-docs/supabase.md - Config caching pattern
 */

export interface AuthStatusV2Config {
  jwtSecret: string;
}

let configCache: AuthStatusV2Config | null = null;

export function clearCache(): void {
  configCache = null;
}

export function getConfig(): AuthStatusV2Config {
  if (configCache) {
    return configCache;
  }

  const jwtSecret = Deno.env.get("JWT_SECRET");

  if (!jwtSecret) {
    throw new Error("Missing environment variable: JWT_SECRET");
  }

  configCache = {
    jwtSecret,
  };

  return configCache;
}
