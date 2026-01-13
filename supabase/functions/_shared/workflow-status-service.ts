/**
 * Workflow Status Service
 *
 * Handles the business logic for retrieving workflow registration status.
 * Orchestrates workflow run lookup and status formatting.
 */

import type { UserSession } from "./types.ts";
import { GitHubClientService } from "./github-client.ts";
import { getWorkflowRunById, sanitizeFileName } from "./workflow.ts";

export const deps = {
  GitHubClientService,
  getWorkflowRunById,
  sanitizeFileName,
};

/**
 * Workflow file name for FaaSr Register workflow
 */
const REGISTER_WORKFLOW_ID = "register-workflow.yml";

/**
 * Status result containing workflow run information
 */
export interface StatusResult {
  fileName: string;
  status: "pending" | "running" | "success" | "failed";
  workflowRunId: number;
  workflowRunUrl: string;
  errorMessage?: string | null;
  triggeredAt: string;
  completedAt: string | null;
}

/**
 * Workflow Status Service
 *
 * Handles workflow run status retrieval and formatting.
 */
export class WorkflowStatusService {
  constructor(private githubClient: GitHubClientService) {}

  /**
   * Get workflow registration status for a file
   *
   * @param session - User session with installation ID and user login
   * @param fileName - Name of the workflow file
   * @returns Status result with workflow run information
   * @throws Error if credentials are missing, workflow run not found, or GitHub operations fail
   */
  async getWorkflowStatus(
    session: UserSession,
    fileName: string,
  ): Promise<StatusResult> {
    if (!session.repoName) {
      throw new Error("Repository name not found in user session");
    }

    // Get authenticated Octokit instance
    const octokit = await this.githubClient.getAuthenticatedOctokit(session);

    // Sanitize file name
    const sanitizedFileName = deps.sanitizeFileName(fileName);

    // Get the most recent workflow run for the register workflow
    // For PoC, we assume one upload at a time, so the most recent run is the one we want
    const runs = await octokit.rest.actions.listWorkflowRuns({
      owner: session.userLogin,
      repo: session.repoName,
      workflow_id: REGISTER_WORKFLOW_ID,
      per_page: 1,
    });

    if (runs.data.workflow_runs.length === 0) {
      throw new Error("Workflow run not found");
    }

    // Get the most recent run
    const mostRecentRun = runs.data.workflow_runs[0];
    const runStatus = await deps.getWorkflowRunById(
      octokit,
      session.userLogin,
      session.repoName,
      mostRecentRun.id,
    );

    if (!runStatus) {
      throw new Error("Workflow run not found");
    }

    // Format response data
    return {
      fileName: sanitizedFileName,
      status: runStatus.status,
      workflowRunId: runStatus.id,
      workflowRunUrl: runStatus.htmlUrl,
      errorMessage: runStatus.status === "failed"
        ? runStatus.conclusion || "Workflow registration failed"
        : null,
      triggeredAt: runStatus.createdAt.toISOString(),
      completedAt:
        runStatus.status === "success" || runStatus.status === "failed"
          ? new Date().toISOString()
          : null,
    };
  }
}
