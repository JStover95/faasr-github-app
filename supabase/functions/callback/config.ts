/**
 * Configuration for the Callback Edge Function
 */

export interface CallbackConfig {
  githubAppId: string;
  githubPrivateKey: string;
}

let cachedConfig: CallbackConfig | null = null;

export function getConfig(): CallbackConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const githubAppId = Deno.env.get("GITHUB_APP_ID");
  const githubPrivateKey = Deno.env.get("GITHUB_PRIVATE_KEY");

  if (!githubAppId) {
    throw new Error("GITHUB_APP_ID is not set");
  }

  if (!githubPrivateKey) {
    throw new Error("GITHUB_PRIVATE_KEY is not set");
  }

  cachedConfig = {
    githubAppId,
    githubPrivateKey,
  };

  return cachedConfig;
}

/**
 * Clear the cached config (useful for testing)
 */
export function clearCache(): void {
  cachedConfig = null;
}
