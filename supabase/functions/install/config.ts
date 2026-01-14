export interface InstallConfig {
  githubInstallationUrl: string;
}

let cachedConfig: InstallConfig | null = null;

export function getConfig(): InstallConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const githubInstallationUrl = Deno.env.get("GITHUB_INSTALLATION_URL");

  if (!githubInstallationUrl) {
    throw new Error("Missing environment variable: GITHUB_INSTALLATION_URL");
  }

  cachedConfig = {
    githubInstallationUrl,
  };

  return cachedConfig;
}

export function clearCache(): void {
  cachedConfig = null;
}
