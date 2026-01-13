/**
 * Repository utilities for fork detection
 *
 * Provides functions for:
 * - Checking if a repository is a fork of the source repository
 */

import type { Octokit } from "./deps.ts";

/**
 * Source repository configuration
 */
const SOURCE_REPO = {
  owner: "FaaSr",
  name: "FaaSr-workflow",
} as const;

/**
 * Check if a repository is a fork of the source repository
 *
 * @param octokit - Authenticated Octokit instance
 * @param owner - GitHub username who owns the repository
 * @param repoName - Name of the repository to check
 * @returns True if the repository is a fork of the source repository, false otherwise
 */
export async function isFork(
  octokit: Octokit,
  owner: string,
  repoName: string,
): Promise<boolean> {
  try {
    const response = await octokit.rest.repos.get({
      owner,
      repo: repoName,
    });

    // Check if this is a fork of the source repository
    if (response.data.fork && response.data.parent) {
      const parent = response.data.parent;
      if (
        parent.owner.login === SOURCE_REPO.owner &&
        parent.name === SOURCE_REPO.name
      ) {
        return true;
      }
    }

    return false;
  } catch (error: unknown) {
    // Repository doesn't exist or is not accessible
    if (error && typeof error === "object" && "status" in error) {
      const status = error.status as number;
      if (status === 404) {
        return false;
      }
    }
    // Wrap non-Error objects in an Error
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      `Failed to check if repository is fork: ${JSON.stringify(error)}`,
    );
  }
}
