/**
 * Workflow utilities for file validation, commit, and workflow dispatch
 *
 * Provides functions for:
 * - Validating workflow JSON files
 * - Committing files to GitHub repository
 * - Triggering workflow dispatch events
 * - Retrieving workflow run status
 */

import type { Octokit } from "./deps.ts";

/**
 * Maximum file size in bytes (1MB for PoC)
 */
const MAX_FILE_SIZE = 1024 * 1024;

/**
 * Valid file name pattern: alphanumeric, hyphens, underscores, ending with .json
 */
const FILE_NAME_PATTERN = /^[a-zA-Z0-9_-]+\.json$/;

/**
 * Validate workflow JSON file
 *
 * @param fileName - Name of the file
 * @param fileContent - File content as string
 * @param fileSize - File size in bytes
 * @returns Validation result with errors if any
 */
export function validateWorkflowFile(
  fileName: string,
  fileContent: string,
  fileSize: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate file name
  if (!fileName || typeof fileName !== "string") {
    errors.push("File name is required");
  } else {
    // Check for path traversal attempts
    if (fileName.includes("/") || fileName.includes("\\")) {
      errors.push("File name cannot contain path separators");
    }

    // Check file extension
    if (!fileName.endsWith(".json")) {
      errors.push("File must have .json extension");
    }

    // Check file name pattern
    if (!FILE_NAME_PATTERN.test(fileName)) {
      errors.push(
        "File name must contain only letters, numbers, hyphens, and underscores",
      );
    }
  }

  // Validate file size
  if (fileSize > MAX_FILE_SIZE) {
    errors.push(`File size exceeds maximum of ${MAX_FILE_SIZE} bytes`);
  }

  // Validate JSON syntax
  try {
    JSON.parse(fileContent);
  } catch (_error) {
    errors.push("Invalid JSON: File must contain valid JSON syntax");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sanitize file name to prevent path traversal and ensure safety
 *
 * @param fileName - Original file name
 * @returns Sanitized file name
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators
  let sanitized = fileName.replace(/[/\\]/g, "");
  // Remove any remaining dangerous characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9_.-]/g, "");
  // Remove leading dots (filename must start with alphanumeric, underscore, or hyphen)
  sanitized = sanitized.replace(/^\.+/, "");
  // Collapse multiple consecutive dots in the middle (but preserve .json extension)
  // Split by .json to handle the extension separately
  if (sanitized.endsWith(".json")) {
    const namePart = sanitized.slice(0, -5); // Remove ".json"
    const sanitizedNamePart = namePart.replace(/\.{2,}/g, ".");
    sanitized = sanitizedNamePart + ".json";
  } else {
    sanitized = sanitized.replace(/\.{2,}/g, ".");
  }
  // Ensure it ends with .json
  if (!sanitized.endsWith(".json")) {
    sanitized = sanitized.replace(/\.json$/, "") + ".json";
  }
  // If after all sanitization we have an empty name or just ".json", use a default
  if (!sanitized || sanitized === ".json") {
    sanitized = "workflow.json";
  }
  return sanitized;
}

/**
 * Commit file to GitHub repository
 *
 * @param octokit - Authenticated Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param fileName - Name of the file to commit
 * @param fileContent - File content as string
 * @param branch - Branch to commit to (default: 'main')
 * @param message - Commit message
 * @returns Commit SHA
 */
export async function commitFileToRepository(
  octokit: Octokit,
  owner: string,
  repo: string,
  fileName: string,
  fileContent: string,
  branch: string = "main",
  message?: string,
): Promise<string> {
  const commitMessage = message || `Add workflow file: ${fileName}`;

  // Get the current file content if it exists (to get SHA for update)
  let fileSha: string | undefined;
  try {
    const existingFile = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: fileName,
      ref: branch,
    });

    if ("sha" in existingFile.data) {
      fileSha = existingFile.data.sha;
    }
  } catch (error: unknown) {
    // File doesn't exist, that's okay - we'll create it
    if (error && typeof error === "object" && "status" in error) {
      const status = error.status as number;
      if (status !== 404) {
        throw error;
      }
    }
  }

  // Encode file content as base64 (UTF-8 safe)
  const encoder = new TextEncoder();
  const bytes = encoder.encode(fileContent);
  const content = btoa(String.fromCharCode(...bytes));

  // Commit the file
  const response = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: fileName,
    message: commitMessage,
    content,
    branch,
    sha: fileSha, // Include SHA if updating existing file
  });

  const commitSha = response.data.commit.sha;

  if (!commitSha) {
    throw new Error("Failed to get commit SHA from GitHub API response");
  }

  return commitSha;
}

/**
 * Trigger workflow dispatch event
 *
 * @param octokit - Authenticated Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param workflowId - Workflow ID or file name (e.g., 'register-workflow.yml')
 * @param ref - Branch or tag to trigger workflow on (default: 'main')
 * @param inputs - Input parameters for the workflow
 * @returns void
 */
export async function triggerWorkflowDispatch(
  octokit: Octokit,
  owner: string,
  repo: string,
  workflowId: string,
  ref: string = "main",
  inputs?: Record<string, string>,
): Promise<void> {
  await octokit.rest.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: workflowId,
    ref,
    inputs: inputs || {},
  });
}

/**
 * Get workflow run status
 *
 * @param octokit - Authenticated Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param workflowRunId - Workflow run ID
 * @returns Workflow run information
 */
export async function getWorkflowRunStatus(
  octokit: Octokit,
  owner: string,
  repo: string,
  workflowRunId: number,
): Promise<{
  status: "pending" | "running" | "success" | "failed";
  conclusion: string | null;
  htmlUrl: string;
}> {
  const response = await octokit.rest.actions.getWorkflowRun({
    owner,
    repo,
    run_id: workflowRunId,
  });

  const run = response.data;
  let status: "pending" | "running" | "success" | "failed" = "pending";

  if (run.status === "completed") {
    status = run.conclusion === "success" ? "success" : "failed";
  } else if (run.status === "in_progress") {
    status = "running";
  }

  return {
    status,
    conclusion: run.conclusion,
    htmlUrl: run.html_url,
  };
}

/**
 * Get workflow run by run ID
 *
 * Recommended pattern: Store the workflow run ID when triggering the dispatch,
 * then use this function to get the run status directly by ID.
 *
 * @param octokit - Authenticated Octokit instance
 * @param owner - Repository owner
 * @param repo - Repository name
 * @param workflowRunId - Workflow run ID (should be stored when triggering dispatch)
 * @returns Workflow run information or null if not found
 */
export async function getWorkflowRunById(
  octokit: Octokit,
  owner: string,
  repo: string,
  workflowRunId: number,
): Promise<
  {
    id: number;
    status: "pending" | "running" | "success" | "failed";
    conclusion: string | null;
    htmlUrl: string;
    createdAt: Date;
  } | null
> {
  try {
    // Get the workflow run directly by ID (recommended pattern)
    const response = await octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id: workflowRunId,
    });

    const run = response.data;
    let status: "pending" | "running" | "success" | "failed" = "pending";

    if (run.status === "completed") {
      status = run.conclusion === "success" ? "success" : "failed";
    } else if (run.status === "in_progress") {
      status = "running";
    }

    return {
      id: workflowRunId,
      status,
      conclusion: run.conclusion,
      htmlUrl: run.html_url,
      createdAt: new Date(run.created_at),
    };
  } catch (error: unknown) {
    // If run not found (404), return null
    if (error && typeof error === "object" && "status" in error) {
      const status = error.status as number;
      if (status === 404) {
        return null;
      }
    }
    throw error;
  }
}
