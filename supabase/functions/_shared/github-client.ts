/**
 * GitHub Client Service
 *
 * Provides authenticated Octokit instance creation for GitHub App operations.
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
 * GitHub Client Service
 *
 * Handles authenticated Octokit instance creation using provided credentials.
 */
export class GitHubClientService {
  constructor(private credentials: GitHubCredentials) {}

  /**
   * Get authenticated Octokit instance for a user session
   *
   * @param session - User session with installation ID
   * @returns Authenticated Octokit instance
   * @throws Error if authentication fails
   */
  async getAuthenticatedOctokit(session: UserSession): Promise<Octokit> {
    const { token } = await getInstallationToken(
      this.credentials.appId,
      this.credentials.privateKey,
      session.installationId,
    );

    return new Octokit({ auth: token });
  }
}
