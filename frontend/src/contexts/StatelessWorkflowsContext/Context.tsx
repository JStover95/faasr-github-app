/**
 * StatelessWorkflowsContext - Workflow management for v2 stateless flow
 *
 * @see design-docs/frontend-patterns.md
 */

import { createContext } from "react";

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
export interface StatelessWorkflowsState {
  /** Installation status */
  installationStatus: "checking" | "not_installed" | "installed" | "error";
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
export interface StatelessWorkflowsActions {
  /** Check if GitHub App is installed */
  checkInstallation: () => Promise<void>;
  /** Initiate GitHub App installation */
  initiateInstall: () => Promise<void>;
  /** Upload workflow file */
  uploadWorkflow: (file: File, customContainers?: boolean) => Promise<void>;
  /** Poll registration status */
  pollRegistrationStatus: (fileName: string) => Promise<void>;
  /** Reset state to initial values */
  resetState: () => void;
}

/**
 * Complete context value combining state and actions
 */
export interface StatelessWorkflowsContextValue {
  state: StatelessWorkflowsState;
  actions: StatelessWorkflowsActions;
}

/**
 * StatelessWorkflowsContext provides access to workflow management state and operations
 */
export const StatelessWorkflowsContext = createContext<
  StatelessWorkflowsContextValue | undefined
>(undefined);
