/**
 * WorkflowsContext - Workflow management state and actions
 *
 * @see design-docs/frontend-patterns.md
 */

import { createContext } from "react";

/**
 * Installation data
 */
export interface InstallationData {
  ghUserLogin?: string;
  ghRepoName?: string;
  ghAvatarUrl?: string;
}

/**
 * Uploaded file data
 */
export interface UploadedFile {
  fileName: string;
  commitSha: string;
  workflowRunId: number;
  workflowRunUrl: string;
}

/**
 * Registration data
 */
export interface RegistrationData {
  fileName: string;
  status: "pending" | "running" | "success" | "failed";
  workflowRunUrl?: string;
  errorMessage?: string;
  triggeredAt?: string;
  completedAt?: string;
}

/**
 * Workflows state
 */
export interface WorkflowsState {
  /** Installation status */
  installationStatus: "checking" | "not_installed" | "installed" | "error";
  /** Installation data */
  installationData: InstallationData | null;

  /** Upload status */
  uploadStatus: "idle" | "uploading" | "uploaded" | "error";
  /** Uploaded file data */
  uploadedFile: UploadedFile | null;

  /** Registration polling status */
  registrationStatus: "idle" | "polling" | "success" | "failed" | "error";
  /** Registration data */
  registrationData: RegistrationData | null;

  /** General loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
}

/**
 * Workflows actions
 */
export interface WorkflowsActions {
  /** Check if GitHub App is installed */
  checkInstallation: () => Promise<void>;
  /** Initiate GitHub App installation */
  initiateInstall: () => Promise<void>;
  /** Upload workflow file */
  uploadWorkflow: (file: File) => Promise<void>;
  /** Poll registration status */
  pollRegistrationStatus: (fileName: string) => Promise<void>;
  /** Reset state to initial values */
  resetState: () => void;
}

/**
 * Complete context value combining state and actions
 */
export interface WorkflowsContextValue {
  state: WorkflowsState;
  actions: WorkflowsActions;
}

/**
 * WorkflowsContext provides access to workflow management state and operations
 */
export const WorkflowsContext = createContext<
  WorkflowsContextValue | undefined
>(undefined);
