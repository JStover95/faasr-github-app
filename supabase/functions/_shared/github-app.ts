/**
 * GitHub App utilities for authentication and installation token management
 *
 * Provides functions for:
 * - JWT generation for GitHub App authentication
 * - Installation token retrieval
 * - Permission validation
 */

import { App, jwt } from "./deps.ts";
import type { GitHubInstallation } from "./types.ts";

/**
 * GitHub App configuration
 */
interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  clientId?: string;
  clientSecret?: string;
}

/**
 * Installation token response structure
 */
interface InstallationToken {
  token: string;
  expiresAt: string;
}

/**
 * Type guard to verify installation token structure
 *
 * @param value - Unknown value from octokit.auth()
 * @returns True if value has the expected token structure
 */
function isInstallationToken(value: unknown): value is InstallationToken {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const token = value as Record<string, unknown>;

  return typeof token.token === "string" && typeof token.expiresAt === "string";
}

/**
 * Type guard to verify GitHub installation structure
 *
 * @param value - Unknown value from API response
 * @returns True if value has the expected installation structure
 */
function isGitHubInstallation(value: unknown): value is GitHubInstallation {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const installation = value as Record<string, unknown>;

  // Check required top-level fields
  if (typeof installation.id !== "number") {
    return false;
  }

  // Check account structure
  if (
    typeof installation.account !== "object" ||
    installation.account === null
  ) {
    return false;
  }

  const account = installation.account as Record<string, unknown>;

  return (
    typeof account.login === "string" &&
    typeof account.id === "number" &&
    typeof account.avatar_url === "string"
  );
}

/**
 * Required permissions for the GitHub App installation
 * Per FR-004: repository creation, workflow dispatch, file management
 */
export const REQUIRED_PERMISSIONS = {
  contents: "write", // To create forks, commit files
  actions: "write", // To trigger workflow_dispatch events
  metadata: "read", // Basic repository metadata (always required)
} as const;

/**
 * Initialize GitHub App instance
 */
export function createGitHubApp(config: GitHubAppConfig): App {
  return new App({
    appId: config.appId,
    privateKey: config.privateKey,
    oauth: config.clientId && config.clientSecret
      ? {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      }
      : undefined,
  });
}

/**
 * Generate JWT token for GitHub App authentication
 *
 * GitHub App JWTs use RS256 algorithm and expire after 10 minutes.
 * The JWT is signed with the app's private key and includes the app ID as the issuer.
 *
 * @param appId - GitHub App ID
 * @param privateKey - GitHub App private key (PEM format)
 * @returns JWT token string
 */
export function generateAppJWT(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now,
    exp: now + 600, // 10 minutes (GitHub App JWT expiration)
    iss: appId, // GitHub App ID as issuer
  };

  return jwt.sign(payload, privateKey, {
    algorithm: "RS256",
  });
}

/**
 * Get installation token for a specific installation
 *
 * @param appId - GitHub App ID
 * @param privateKey - GitHub App private key
 * @param installationId - Installation ID from GitHub
 * @returns Installation token and expiration time
 */
export async function getInstallationToken(
  appId: string,
  privateKey: string,
  installationId: string,
): Promise<{ token: string; expiresAt: string }> {
  const app = createGitHubApp({ appId, privateKey });
  const octokit = await app.getInstallationOctokit(
    parseInt(installationId, 10),
  );

  // The auth() method requires the type option to be specified
  // Calling it without options causes "Cannot read properties of undefined (reading 'type')"
  const token = await octokit.auth({ type: "installation" });

  if (!isInstallationToken(token)) {
    throw new Error("Invalid installation token response from GitHub API");
  }

  return {
    token: token.token,
    expiresAt: token.expiresAt,
  };
}

/**
 * Get installation information from GitHub
 *
 * @param appId - GitHub App ID
 * @param privateKey - GitHub App private key
 * @param installationId - Installation ID from GitHub
 * @returns Installation information including permissions
 */
export async function getInstallation(
  appId: string,
  privateKey: string,
  installationId: string,
): Promise<GitHubInstallation> {
  const app = createGitHubApp({ appId, privateKey });
  const octokit = await app.getInstallationOctokit(
    parseInt(installationId, 10),
  );

  const response = await octokit.request(
    "GET /app/installations/{installation_id}",
    {
      installation_id: parseInt(installationId, 10),
    },
  );

  if (!isGitHubInstallation(response.data)) {
    throw new Error("Invalid installation data response from GitHub API");
  }

  return response.data;
}

/**
 * Validate that installation has required permissions
 *
 * @param installation - Installation information from GitHub
 * @returns Object with validation result and missing permissions
 */
export function validateInstallationPermissions(
  installation: GitHubInstallation,
): { valid: boolean; missingPermissions: string[] } {
  const missingPermissions: string[] = [];
  const permissions = installation.permissions || {};

  // Check contents permission
  if (!permissions.contents || permissions.contents !== "write") {
    missingPermissions.push("contents:write");
  }

  // Check actions permission
  if (!permissions.actions || permissions.actions !== "write") {
    missingPermissions.push("actions:write");
  }

  // Check metadata permission (always required)
  if (!permissions.metadata || permissions.metadata !== "read") {
    missingPermissions.push("metadata:read");
  }

  return {
    valid: missingPermissions.length === 0,
    missingPermissions,
  };
}

/**
 * Check if installation has required permissions
 *
 * @param appId - GitHub App ID
 * @param privateKey - GitHub App private key
 * @param installationId - Installation ID from GitHub
 * @returns Validation result
 */
export async function checkInstallationPermissions(
  appId: string,
  privateKey: string,
  installationId: string,
): Promise<{ valid: boolean; missingPermissions: string[] }> {
  try {
    const installation = await getInstallation(
      appId,
      privateKey,
      installationId,
    );
    return validateInstallationPermissions(installation);
  } catch (_error) {
    // If we can't fetch installation, assume invalid
    return {
      valid: false,
      missingPermissions: Object.keys(REQUIRED_PERMISSIONS),
    };
  }
}
