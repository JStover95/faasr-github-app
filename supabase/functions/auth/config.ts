export interface AuthConfig {
  githubClientId: string;
  frontendUrl: string;
  githubAppId: string;
  githubPrivateKey: string;
}

let cachedConfig: AuthConfig | null = null;

export function getConfig(): AuthConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const githubClientId = Deno.env.get("GITHUB_CLIENT_ID");
  const frontendUrl = Deno.env.get("FRONTEND_URL");
  const githubAppId = Deno.env.get("GITHUB_APP_ID");
  const githubPrivateKey = Deno.env.get("GITHUB_PRIVATE_KEY");

  const missingEnvVars = [];

  if (!githubClientId) {
    missingEnvVars.push("GITHUB_CLIENT_ID");
  }
  if (!frontendUrl) {
    missingEnvVars.push("FRONTEND_URL");
  }
  if (!githubAppId) {
    missingEnvVars.push("GITHUB_APP_ID");
  }
  if (!githubPrivateKey) {
    missingEnvVars.push("GITHUB_PRIVATE_KEY");
  }

  if (!(githubClientId && frontendUrl && githubAppId && githubPrivateKey)) {
    throw new Error(
      `Missing environment variables: ${missingEnvVars.join(", ")}`,
    );
  }

  cachedConfig = {
    githubClientId,
    frontendUrl,
    githubAppId,
    githubPrivateKey,
  };

  return cachedConfig;
}

export function clearCache(): void {
  cachedConfig = null;
}
