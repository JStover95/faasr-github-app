/**
 * Repository utilities for fork detection and creation
 *
 * Provides functions for:
 * - Checking if a fork exists
 * - Creating a new fork of the FaaSr-workflow repository
 */

import { Octokit } from "./deps.ts";
import type { RepositoryFork } from "./types.ts";

/**
 * Source repository configuration
 */
const SOURCE_REPO = {
  owner: "FaaSr",
  name: "FaaSr-workflow",
};

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

/**
 * Poll until the forked repository is ready
 *
 * GitHub's fork API returns immediately, but the fork may not be ready for operations.
 * This function polls the repository until it's accessible and confirmed as a fork.
 *
 * @param octokit - Authenticated Octokit instance
 * @param userLogin - GitHub username who owns the fork
 * @param maxAttempts - Maximum number of polling attempts (default: 30)
 * @param delayMs - Delay between polling attempts in milliseconds (default: 2000)
 * @returns Fork information when ready
 * @throws Error if fork is not ready after max attempts
 */
export async function pollUntilForkReady(
  octokit: Octokit,
  userLogin: string,
  maxAttempts: number = 30,
  delayMs: number = 1000,
): Promise<RepositoryFork> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const fork = await checkForkExists(octokit, userLogin);

    if (fork) {
      // Fork exists and is ready
      return fork;
    }

    // If not the last attempt, wait before trying again
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Fork still not ready after all attempts
  throw new Error(
    `Fork for ${userLogin}/${SOURCE_REPO.name} is not ready after ${maxAttempts} attempts (${
      (maxAttempts * delayMs) / 1000
    }s)`,
  );
}

/**
 * Create a fork of FaaSr-workflow repository for the given user
 *
 * @param octokit - Authenticated Octokit instance
 * @param userLogin - GitHub username to create fork for
 * @returns Fork information
 */
export async function createFork(
  octokit: Octokit,
  userLogin: string,
): Promise<RepositoryFork> {
  try {
    await octokit.rest.repos.createFork({
      owner: SOURCE_REPO.owner,
      repo: SOURCE_REPO.name,
      organization: undefined, // Fork to user's account, not organization
    });

    // Poll until fork is ready (GitHub API may return immediately but fork may not be ready)
    const fork = await pollUntilForkReady(octokit, userLogin);

    return {
      ...fork,
      forkStatus: "created",
      createdAt: new Date(),
    };
  } catch (error: unknown) {
    // Check if fork already exists (409 Conflict)
    if (error && typeof error === "object" && "status" in error) {
      const status = error.status as number;
      if (status === 403) {
        // Permission denied - might mean fork already exists, try to check
        const existingFork = await checkForkExists(octokit, userLogin);
        if (existingFork) {
          return existingFork;
        }
      }
    }
    // Wrap non-Error objects in an Error
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      `Failed to create fork: ${JSON.stringify(error)}`,
    );
  }
}

/**
 * Ensure fork exists for user (check first, create if needed)
 *
 * @param octokit - Authenticated Octokit instance
 * @param userLogin - GitHub username
 * @returns Fork information
 */
export async function ensureForkExists(
  octokit: Octokit,
  userLogin: string,
): Promise<RepositoryFork> {
  // First check if fork already exists
  const existingFork = await checkForkExists(octokit, userLogin);
  if (existingFork) {
    return existingFork;
  }

  // Fork doesn't exist, create it
  return await createFork(octokit, userLogin);
}
