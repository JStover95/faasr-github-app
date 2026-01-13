/**
 * Repository utilities for fork detection
 *
 * Provides functions for:
 * - Checking if a fork exists
 */

import type { Octokit } from "./deps.ts";
import type { RepositoryFork } from "./types.ts";

/**
 * Source repository configuration
 */
const SOURCE_REPO = {
  owner: "FaaSr",
  name: "FaaSr-workflow",
} as const;

/**
 * Check if a fork of FaaSr-workflow exists for the given user
 *
 * @param octokit - Authenticated Octokit instance
 * @param userLogin - GitHub username to check for fork
 * @returns Fork information if exists, null otherwise
 */
export async function checkForkExists(
  octokit: Octokit,
  userLogin: string,
): Promise<RepositoryFork | null> {
  try {
    const response = await octokit.rest.repos.get({
      owner: userLogin,
      repo: SOURCE_REPO.name,
    });

    // Check if this is a fork of the source repository
    if (response.data.fork && response.data.parent) {
      const parent = response.data.parent;
      if (
        parent.owner.login === SOURCE_REPO.owner &&
        parent.name === SOURCE_REPO.name
      ) {
        return {
          owner: userLogin,
          repoName: SOURCE_REPO.name,
          forkUrl: response.data.html_url,
          forkStatus: "exists",
          defaultBranch: response.data.default_branch || "main",
          createdAt: response.data.created_at
            ? new Date(response.data.created_at)
            : undefined,
        };
      }
    }

    return null;
  } catch (error: unknown) {
    // Repository doesn't exist or is not accessible
    if (error && typeof error === "object" && "status" in error) {
      const status = error.status as number;
      if (status === 404) {
        return null;
      }
    }
    // Wrap non-Error objects in an Error
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      `Failed to check fork existence: ${JSON.stringify(error)}`,
    );
  }
}
