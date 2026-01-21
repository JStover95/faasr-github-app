/**
 * Workflows V2 Config
 *
 * Configuration management for workflows-v2 edge function.
 * Uses caching pattern for performance.
 *
 * @see design-docs/supabase.md - Config caching pattern
 */

export interface WorkflowsV2Config {
  githubAppId: string;
  githubPrivateKey: string;
  jwtSecret: string;
}

let configCache: WorkflowsV2Config | null = null;

export function clearCache(): void {
  configCache = null;
}

export function getConfig(): WorkflowsV2Config {
  if (configCache) {
    return configCache;
  }

  const githubAppId = Deno.env.get("GITHUB_APP_ID");
  const githubPrivateKey = Deno.env.get("GITHUB_PRIVATE_KEY");
  const jwtSecret = Deno.env.get("JWT_SECRET");

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
    githubAppId,
    githubPrivateKey,
    jwtSecret,
  };

  return configCache;
}
