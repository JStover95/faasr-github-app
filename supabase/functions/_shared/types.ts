/**
 * TypeScript type definitions for FaaSr GitHub App MVP
 *
 * These types are shared across Supabase Edge Functions and match the data model
 * defined in specs/001-github-app-mvp/data-model.md
 */

/**
 * User Session - Represents an authenticated GitHub user session
 */
export interface UserSession {
  /** GitHub App installation ID after user installs the app */
  installationId: string;
  /** GitHub username/login */
  userLogin: string;
  /** GitHub user ID */
  userId: number;
  /** User's GitHub avatar URL */
  avatarUrl?: string;
  /** JWT session token (stored in HTTP-only cookie) */
  jwtToken: string;
  /** Session creation time */
  createdAt: Date;
  /** Session expiration time */
  expiresAt: Date;
}

/**
 * Repository Fork - Represents the user's fork of the FaaSr-workflow repository
 */
export interface RepositoryFork {
  /** GitHub username who owns the fork (same as userLogin) */
  owner: string;
  /** Repository name (always "FaaSr-workflow" for this use case) */
  repoName: string;
  /** Full GitHub URL to the fork */
  forkUrl: string;
  /** Status of fork operation */
  forkStatus: "pending" | "exists" | "created" | "failed";
  /** Default branch name (typically "main") */
  defaultBranch: string;
  /** When fork was created (if newly created) */
  createdAt?: Date;
}

/**
 * Workflow JSON File - Represents a FaaSr workflow configuration file
 */
export interface WorkflowJSONFile {
  /** Name of the workflow file (e.g., "my-workflow.json") */
  fileName: string;
  /** JSON content of the workflow file */
  fileContent: string | object;
  /** File size in bytes */
  fileSize: number;
  /** Status of upload/commit operation */
  uploadStatus: "pending" | "valid" | "invalid" | "committed" | "failed";
  /** Array of validation error messages */
  validationErrors?: string[];
  /** When file was uploaded */
  uploadedAt: Date;
  /** When file was committed to GitHub */
  committedAt?: Date;
}

/**
 * Workflow Registration - Represents the process of registering a workflow JSON file
 */
export interface WorkflowRegistration {
  /** Name of the workflow file being registered */
  workflowFileName: string;
  /** Status of registration workflow */
  registrationStatus: "pending" | "running" | "success" | "failed";
  /** GitHub Actions workflow run ID (if available) */
  workflowRunId?: number;
  /** URL to view workflow run in GitHub */
  workflowRunUrl?: string;
  /** Error message if registration failed */
  errorMessage?: string;
  /** When workflow dispatch was triggered */
  triggeredAt: Date;
  /** When registration workflow completed */
  completedAt?: Date;
}

/**
 * GitHub App Installation information
 */
export interface GitHubInstallation {
  id: number;
  account: {
    login: string;
    id: number;
    avatar_url: string;
  };
  permissions: {
    contents?: string;
    actions?: string;
    metadata?: string;
  };
}

/**
 * GitHub API Error response
 */
export interface GitHubError {
  message: string;
  documentation_url?: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
  }>;
}
