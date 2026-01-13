export interface WorkflowsConfig {
  githubAppId: string;
  githubPrivateKey: string;
  frontendUrl: string;
}

let cachedConfig: WorkflowsConfig | null = null;

export function getConfig(): WorkflowsConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const githubAppId = Deno.env.get("GITHUB_APP_ID");
  const githubPrivateKey = Deno.env.get("GITHUB_PRIVATE_KEY");
  const frontendUrl = Deno.env.get("FRONTEND_URL");

  const missingEnvVars = [];

  if (!githubAppId) {
    missingEnvVars.push("GITHUB_APP_ID");
  }
  if (!githubPrivateKey) {
    missingEnvVars.push("GITHUB_PRIVATE_KEY");
  }
  if (!frontendUrl) {
    missingEnvVars.push("FRONTEND_URL");
  }

  if (!(githubAppId && githubPrivateKey && frontendUrl)) {
    throw new Error(
      `Missing environment variables: ${missingEnvVars.join(", ")}`,
    );
  }

  cachedConfig = {
    githubAppId,
    githubPrivateKey,
    frontendUrl,
  };

  return cachedConfig;
}

export function clearCache(): void {
  cachedConfig = null;
}
