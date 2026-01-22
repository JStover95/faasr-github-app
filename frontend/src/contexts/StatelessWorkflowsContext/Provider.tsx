/**
 * StatelessWorkflowsContext Provider
 *
 * Simplified version for v2 stateless flow - uses fetch instead of Supabase client
 *
 * @see design-docs/frontend-patterns.md - Single state object pattern
 * @see design-docs/backend-integration.md - Error handling pattern
 */

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type PropsWithChildren,
} from "react";
import {
  StatelessWorkflowsContext,
  type StatelessWorkflowsState,
  type StatelessWorkflowsContextValue,
  type UploadedFile,
  type RegistrationData,
} from "./Context";
import { useStatelessAuthContext } from "../StatelessAuthContext/use-stateless-auth-context";
import { useToastContext } from "../ToastContext/use-toast-context";

const POLL_INTERVAL_MS = 3000; // 3 seconds
const POLL_TIMEOUT_MS = 300000; // 5 minutes

// Error constants
const INSTALL_ERRORS = {
  default: "Failed to initiate installation.",
} as const;

const UPLOAD_ERRORS = {
  invalidResponse: "Invalid response from upload.",
  uploadFailed: "Upload failed.",
  default: "Failed to upload workflow.",
} as const;

const REGISTRATION_ERRORS = {
  invalidResponse: "Invalid response from status check.",
  notFound: "Workflow run not found yet.",
  timeout: "Registration status check timed out. Please check manually.",
  default: "Failed to check registration status.",
} as const;

export function StatelessWorkflowsProvider({ children }: PropsWithChildren) {
  const { state: authState, actions: authActions } = useStatelessAuthContext();
  const { actions: toastActions } = useToastContext();

  // Single state object pattern
  const [state, setState] = useState<StatelessWorkflowsState>({
    installationStatus: "checking",
    uploadStatus: "idle",
    uploadedFile: null,
    registrationStatus: "idle",
    registrationData: null,
    loading: false,
    error: null,
  });

  // Refs for polling cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, []);

  // Check installation status when authenticated
  useEffect(() => {
    if (
      !authState.loading &&
      authState.isAuthenticated &&
      state.installationStatus === "checking"
    ) {
      setState((prev) => ({
        ...prev,
        installationStatus: "installed",
      }));
    } else if (
      !authState.loading &&
      !authState.isAuthenticated &&
      state.installationStatus === "checking"
    ) {
      setState((prev) => ({
        ...prev,
        installationStatus: "not_installed",
      }));
    }
  }, [authState.loading, authState.isAuthenticated, state.installationStatus]);

  /**
   * Check if GitHub App is installed
   */
  const checkInstallation = useCallback(async () => {
    await authActions.checkAuth();
  }, [authActions]);

  /**
   * Initiate GitHub App installation
   */
  const initiateInstall = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      const functionsEndpoint = import.meta.env
        .VITE_SUPABASE_FUNCTIONS_ENDPOINT;
      const response = await fetch(
        `${functionsEndpoint}/functions/v1/install-v2`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get install URL");
      }

      const data = await response.json();

      if (data && data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error(INSTALL_ERRORS.default);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : INSTALL_ERRORS.default;
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      toastActions.showToast(errorMessage, "error");
    }
  }, [toastActions]);

  /**
   * Poll registration status
   */
  const pollRegistrationStatus = useCallback(
    async (fileName: string) => {
      // Clear any existing polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      setState((prev) => ({
        ...prev,
        registrationStatus: "polling",
        registrationData: {
          fileName,
          status: "pending",
        },
      }));

      pollingStartTimeRef.current = Date.now();

      const checkStatus = async () => {
        try {
          const functionsEndpoint = import.meta.env
            .VITE_SUPABASE_FUNCTIONS_ENDPOINT;
          const queryParams = new URLSearchParams({
            filename: fileName,
          }).toString();
          const response = await fetch(
            `${functionsEndpoint}/functions/v1/workflows-v2?${queryParams}`,
            {
              method: "GET",
              credentials: "include",
            }
          );

          if (response.status === 404) {
            // Workflow run not found yet, continue polling
            return;
          }

          if (!response.ok) {
            throw new Error("Failed to get workflow status");
          }

          const data = await response.json();

          if (!data || typeof data !== "object") {
            throw new Error("Invalid response from status check");
          }

          const registrationData: RegistrationData = {
            fileName: data.fileName,
            status: data.status,
            workflowRunUrl: data.workflowRunUrl,
            errorMessage: data.errorMessage,
            triggeredAt: data.triggeredAt,
            completedAt: data.completedAt,
          };

          // Check if we should stop polling
          if (data.status === "success") {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }

            setState((prev) => ({
              ...prev,
              registrationStatus: "success",
              registrationData,
              loading: false,
            }));

            toastActions.showToast(
              "Workflow registration completed successfully!",
              "success"
            );
          } else if (data.status === "failed") {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }

            setState((prev) => ({
              ...prev,
              registrationStatus: "failed",
              registrationData,
              loading: false,
            }));

            toastActions.showToast(
              data.errorMessage || "Workflow registration failed",
              "error"
            );
          } else {
            // Still pending or running, update state and continue polling
            setState((prev) => ({
              ...prev,
              registrationData,
            }));
          }
        } catch (error) {
          // Check for timeout
          if (
            pollingStartTimeRef.current &&
            Date.now() - pollingStartTimeRef.current > POLL_TIMEOUT_MS
          ) {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }

            setState((prev) => ({
              ...prev,
              registrationStatus: "error",
              loading: false,
              error: "Registration status check timed out",
            }));

            toastActions.showToast(
              "Registration status check timed out. Please check manually.",
              "error"
            );
          } else {
            // Log error but continue polling
            console.error("Error checking registration status:", error);
          }
        }
      };

      // Initial check
      await checkStatus();

      // Set up polling interval
      pollingIntervalRef.current = setInterval(checkStatus, POLL_INTERVAL_MS);

      // Set timeout to stop polling after max duration
      pollingTimeoutRef.current = setTimeout(() => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;

          setState((prev) => {
            // Only update if still polling
            if (prev.registrationStatus === "polling") {
              return {
                ...prev,
                registrationStatus: "error",
                loading: false,
                error: "Registration status check timed out",
              };
            }
            return prev;
          });

          toastActions.showToast(
            "Registration status check timed out. Please check manually.",
            "error"
          );
        }
      }, POLL_TIMEOUT_MS);
    },
    [toastActions]
  );

  /**
   * Upload workflow file
   */
  const uploadWorkflow = useCallback(
    async (file: File, customContainers?: boolean) => {
      setState((prev) => ({
        ...prev,
        uploadStatus: "uploading",
        loading: true,
        error: null,
      }));

      try {
        const functionsEndpoint = import.meta.env
          .VITE_SUPABASE_FUNCTIONS_ENDPOINT;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("custom_containers", String(customContainers ?? false));

        const response = await fetch(
          `${functionsEndpoint}/functions/v1/workflows-v2`,
          {
            method: "POST",
            credentials: "include",
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || errorData.error || UPLOAD_ERRORS.default
          );
        }

        const data = await response.json();

        if (!data || typeof data !== "object") {
          throw new Error("Invalid response from upload");
        }

        if ("success" in data && data.success) {
          const uploadedFile: UploadedFile = {
            fileName: data.fileName as string,
            commitSha: data.commitSha as string,
            workflowRunId: data.workflowRunId as number,
            workflowRunUrl: data.workflowRunUrl as string,
          };

          setState((prev) => ({
            ...prev,
            uploadStatus: "uploaded",
            uploadedFile,
            loading: false,
            error: null,
          }));

          toastActions.showToast(
            "Workflow uploaded successfully. Registration in progress...",
            "info"
          );

          // Start polling for registration status
          pollRegistrationStatus(data.fileName);
        } else {
          throw new Error(
            ("error" in data ? (data.error as string) : null) || "Upload failed"
          );
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : UPLOAD_ERRORS.default;
        setState((prev) => ({
          ...prev,
          uploadStatus: "error",
          loading: false,
          error: errorMessage,
        }));
        toastActions.showToast(errorMessage, "error");
      }
    },
    [toastActions, pollRegistrationStatus]
  );

  /**
   * Reset state to initial values
   */
  const resetState = useCallback(() => {
    // Clear polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    pollingStartTimeRef.current = null;

    setState({
      installationStatus: "checking",
      uploadStatus: "idle",
      uploadedFile: null,
      registrationStatus: "idle",
      registrationData: null,
      loading: false,
      error: null,
    });
  }, []);

  // Memoize actions
  const actions = useMemo(
    () => ({
      checkInstallation,
      initiateInstall,
      uploadWorkflow,
      pollRegistrationStatus,
      resetState,
    }),
    [
      checkInstallation,
      initiateInstall,
      uploadWorkflow,
      pollRegistrationStatus,
      resetState,
    ]
  );

  // Memoize context value
  const value = useMemo<StatelessWorkflowsContextValue>(
    () => ({
      state,
      actions,
    }),
    [state, actions]
  );

  return (
    <StatelessWorkflowsContext.Provider value={value}>
      {children}
    </StatelessWorkflowsContext.Provider>
  );
}
