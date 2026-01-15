export interface WorkflowsConfig {
  githubAppId: string;
  githubPrivateKey: string;
}

let cachedConfig: WorkflowsConfig | null = null;

export function getConfig(): WorkflowsConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const githubAppId = Deno.env.get("GITHUB_APP_ID");
  const githubPrivateKey = Deno.env.get("GITHUB_PRIVATE_KEY");

  const missingEnvVars = [];

  if (!githubAppId) {
    missingEnvVars.push("GITHUB_APP_ID");
  }
  if (!githubPrivateKey) {
    missingEnvVars.push("GITHUB_PRIVATE_KEY");
  }

  if (!(githubAppId && githubPrivateKey)) {
    throw new Error(
      `Missing environment variables: ${missingEnvVars.join(", ")}`,
    );
  }

  cachedConfig = {
    githubAppId,
    githubPrivateKey,
  };

  return cachedConfig;
}

export function clearCache(): void {
  cachedConfig = null;
}
