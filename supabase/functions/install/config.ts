export interface InstallConfig {
  githubInstallationUrl: string;
  githubClientId: string;
  frontendUrl: string;
  githubAppId: string;
  githubPrivateKey: string;
}

let cachedConfig: InstallConfig | null = null;

export function getConfig(): InstallConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const githubInstallationUrl = Deno.env.get("GITHUB_INSTALLATION_URL");
  const githubClientId = Deno.env.get("GITHUB_CLIENT_ID");
  const frontendUrl = Deno.env.get("FRONTEND_URL");
  const githubAppId = Deno.env.get("GITHUB_APP_ID");
  const githubPrivateKey = Deno.env.get("GITHUB_PRIVATE_KEY");

  const missingEnvVars = [];

  if (!githubInstallationUrl) {
    missingEnvVars.push("GITHUB_INSTALLATION_URL");
  }
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

  if (
    !(githubInstallationUrl && githubClientId && frontendUrl && githubAppId &&
      githubPrivateKey)
  ) {
    throw new Error(
      `Missing environment variables: ${missingEnvVars.join(", ")}`,
    );
  }

  cachedConfig = {
    githubInstallationUrl,
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
