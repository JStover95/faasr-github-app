/**
 * Workflow Upload Service
 *
 * Handles the business logic for uploading and registering workflow files.
 * Orchestrates file validation, commit, and workflow dispatch.
 */

import type { UserSession } from "./types.ts";
import { GitHubClientService } from "./github-client.ts";
import {
  commitFileToRepository,
  sanitizeFileName,
  triggerWorkflowDispatch,
  validateWorkflowFile,
} from "./workflow.ts";

/**
 * Workflow file name for FaaSr Register workflow
 */
const REGISTER_WORKFLOW_ID = "register-workflow.yml";

/**
 * Default branch name
 */
const DEFAULT_BRANCH = "main";

/**
 * Repository name for workflow files
 */
const REPO_NAME = "FaaSr-workflow";

/**
 * Upload result containing file commit information
 */
export interface UploadResult {
  fileName: string;
  commitSha: string;
}

/**
 * Registration result containing workflow run information
 */
export interface RegistrationResult {
  workflowRunId?: number;
  workflowRunUrl?: string;
}

/**
 * File validation result
 */
export interface FileValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Workflow Upload Service
 *
 * Handles workflow file upload, validation, commit, and workflow dispatch.
 */
export class WorkflowUploadService {
  constructor(private githubClient: GitHubClientService) {}

  /**
   * Validate and sanitize file name and content
   *
   * @param fileName - Original file name
   * @param fileContent - File content as string
   * @param fileSize - File size in bytes
   * @returns Validation result with sanitized file name
   */
  validateFile(
    fileName: string,
    fileContent: string,
    fileSize: number,
  ): { valid: boolean; errors: string[]; sanitizedFileName: string } {
    const sanitizedFileName = sanitizeFileName(fileName);
    const validation = validateWorkflowFile(
      sanitizedFileName,
      fileContent,
      fileSize,
    );

    return {
      valid: validation.valid,
      errors: validation.errors,
      sanitizedFileName,
    };
  }

  /**
   * Upload workflow file to repository
   *
   * @param session - User session with installation ID and user login
   * @param file - File object from FormData
   * @param fileName - Original file name
   * @returns Upload result with commit SHA and sanitized file name
   * @throws Error if validation fails, credentials are missing, or GitHub operations fail
   */
  async uploadWorkflow(
    session: UserSession,
    file: File,
    fileName: string,
  ): Promise<UploadResult> {
    // Get authenticated Octokit instance
    const octokit = await this.githubClient.getAuthenticatedOctokit(session);

    // Read file content
    const fileContent = await file.text();
    const fileSize = file.size;

    // Validate and sanitize file
    const validation = this.validateFile(fileName, fileContent, fileSize);
    if (!validation.valid) {
      throw new Error(`Invalid file: ${validation.errors.join(", ")}`);
    }

    const sanitizedFileName = validation.sanitizedFileName;

    // Commit file to repository
    const commitSha = await commitFileToRepository(
      octokit,
      session.userLogin,
      REPO_NAME,
      sanitizedFileName,
      fileContent,
      DEFAULT_BRANCH,
    );

    return {
      fileName: sanitizedFileName,
      commitSha,
    };
  }

  /**
   * Trigger workflow registration dispatch
   *
   * @param session - User session with installation ID and user login
   * @param fileName - Sanitized workflow file name
   * @returns Registration result with workflow run information (may be undefined if not immediately available)
   * @throws Error if credentials are missing or GitHub operations fail
   */
  async triggerRegistration(
    session: UserSession,
    fileName: string,
  ): Promise<RegistrationResult> {
    // Get authenticated Octokit instance
    const octokit = await this.githubClient.getAuthenticatedOctokit(session);

    // Trigger workflow dispatch (non-blocking - failures are logged but don't fail the operation)
    let workflowRunId: number | undefined;
    let workflowRunUrl: string | undefined;

    try {
      await triggerWorkflowDispatch(
        octokit,
        session.userLogin,
        REPO_NAME,
        REGISTER_WORKFLOW_ID,
        DEFAULT_BRANCH,
        {
          workflow_file: fileName,
        },
      );

      // Try to get the workflow run ID (may not be immediately available)
      try {
        const runs = await octokit.rest.actions.listWorkflowRuns({
          owner: session.userLogin,
          repo: REPO_NAME,
          workflow_id: REGISTER_WORKFLOW_ID,
          per_page: 1,
        });

        if (runs.data.workflow_runs.length > 0) {
          const run = runs.data.workflow_runs[0];
          workflowRunId = run.id;
          workflowRunUrl = run.html_url;
        }
      } catch (error) {
        // If we can't get the run ID, that's okay - it might not be available yet
        console.error("Failed to get workflow run ID:", error);
      }
    } catch (error) {
      // If workflow dispatch fails, still return success
      // The workflow might not exist yet or there might be a temporary issue
      console.error("Workflow dispatch failed:", error);
    }

    return {
      workflowRunId,
      workflowRunUrl,
    };
  }
}
