/**
 * GitHub Client Service
 *
 * Provides centralized GitHub App credential management and Octokit instance creation.
 * Eliminates duplication of credential retrieval and authentication logic.
 */

import { Octokit } from "./deps.ts";
import { getInstallationToken } from "./github-app.ts";
import type { UserSession } from "./types.ts";

/**
 * GitHub App credentials
 */
export interface GitHubCredentials {
  appId: string;
  privateKey: string;
}

/**
 * Configuration validation result
 */
export interface ConfigurationValidation {
  valid: boolean;
  error?: string;
}

/**
 * GitHub Client Service
 *
 * Handles GitHub App credential retrieval and authenticated Octokit instance creation.
 */
export class GitHubClientService {
  /**
   * Get GitHub App credentials from environment variables
   *
   * @returns Credentials object or null if not configured
   */
  getCredentials(): GitHubCredentials | null {
    const appId = Deno.env.get("GITHUB_APP_ID");
    const privateKey = Deno.env.get("GITHUB_PRIVATE_KEY");

    if (!appId || !privateKey) {
      return null;
    }

    return { appId, privateKey };
  }

  /**
   * Validate that required GitHub App configuration is present
   *
   * @returns Validation result with error message if invalid
   */
  validateConfiguration(): ConfigurationValidation {
    const credentials = this.getCredentials();

    if (!credentials) {
      return {
        valid: false,
        error: "GitHub App configuration missing",
      };
    }

    return { valid: true };
  }

  /**
   * Get authenticated Octokit instance for a user session
   *
   * @param session - User session with installation ID
   * @returns Authenticated Octokit instance
   * @throws Error if credentials are missing or authentication fails
   */
  async getAuthenticatedOctokit(session: UserSession): Promise<Octokit> {
    const credentials = this.getCredentials();

    if (!credentials) {
      throw new Error("GitHub App configuration missing");
    }

    const { token } = await getInstallationToken(
      credentials.appId,
      credentials.privateKey,
      session.installationId,
    );

    return new Octokit({ auth: token });
  }
}
