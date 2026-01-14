/**
 * WorkflowsContext Provider
 *
 * @see design-docs/frontend-patterns.md
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
  WorkflowsContext,
  type WorkflowsContextValue,
  type WorkflowsState,
  type InstallationData,
  type UploadedFile,
  type RegistrationData,
} from "./Context";
import { useSupabaseClientContext } from "../SupabaseClientContext/use-supabase-client-context";
import { useToastContext } from "../ToastContext/use-toast-context";

const POLL_INTERVAL_MS = 3000; // 3 seconds
const POLL_TIMEOUT_MS = 300000; // 5 minutes (100 iterations)

/**
 * Type for installation response from get_gh_installation RPC function
 */
type InstallationResponse = Array<{
  gh_installation_id: string | null;
  gh_user_login: string | null;
  gh_user_id: number | null;
  gh_avatar_url: string | null;
  gh_repo_name: string | null;
}>;

/**
 * Type guard to check if installation response is valid and has installation data
 */
function isInstallationResponse(
  response: unknown
): response is InstallationResponse {
  return (
    Array.isArray(response) &&
    response.length > 0 &&
    response[0] !== null &&
    typeof response[0] === "object" &&
    "gh_installation_id" in response[0] &&
    response[0].gh_installation_id !== null &&
    response[0].gh_installation_id !== ""
  );
}

export function WorkflowsProvider({ children }: PropsWithChildren) {
  const { supabase } = useSupabaseClientContext();
  const { actions: toastActions } = useToastContext();

  // State following single state object pattern
  const [state, setState] = useState<WorkflowsState>({
    installationStatus: "checking",
    installationData: null,
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

  /**
   * Get Supabase functions base URL
   */
  const getFunctionsBaseUrl = useCallback(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error("VITE_SUPABASE_URL is not defined");
    }
    return `${supabaseUrl}/functions/v1`;
  }, []);

  /**
   * Check if GitHub App is installed
   */
  const checkInstallation = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      installationStatus: "checking",
      loading: true,
      error: null,
    }));

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setState((prev) => ({
          ...prev,
          installationStatus: "error",
          loading: false,
          error: "Failed to get user",
        }));
        return;
      }

      // Query GitHub installation data using RPC function
      const { data: installationResponse, error: installationError } =
        await supabase.rpc("get_gh_installation", { profile_id: user.id });

      if (installationError) {
        // Profile might not exist yet, treat as not installed
        setState((prev) => ({
          ...prev,
          installationStatus: "not_installed",
          installationData: null,
          loading: false,
          error: null,
        }));
        return;
      }

      if (isInstallationResponse(installationResponse)) {
        const installationData: InstallationData = {
          ghUserLogin: installationResponse[0].gh_user_login || undefined,
          ghRepoName: installationResponse[0].gh_repo_name || undefined,
          ghAvatarUrl: installationResponse[0].gh_avatar_url || undefined,
        };

        setState((prev) => ({
          ...prev,
          installationStatus: "installed",
          installationData,
          loading: false,
          error: null,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          installationStatus: "not_installed",
          installationData: null,
          loading: false,
          error: null,
        }));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to check installation";
      setState((prev) => ({
        ...prev,
        installationStatus: "error",
        loading: false,
        error: errorMessage,
      }));
      toastActions.showToast("Failed to check installation status", "error");
    }
  }, [supabase, toastActions]);

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
      const functionsBaseUrl = getFunctionsBaseUrl();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${functionsBaseUrl}/install/auth/install`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.success && data.redirectUrl) {
        // Redirect to GitHub
        window.location.href = data.redirectUrl;
      } else {
        throw new Error("Failed to get installation URL");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to initiate installation";
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      toastActions.showToast(errorMessage, "error");
    }
  }, [supabase, getFunctionsBaseUrl, toastActions]);

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
          const functionsBaseUrl = getFunctionsBaseUrl();
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session) {
            throw new Error("Not authenticated");
          }

          const encodedFileName = encodeURIComponent(fileName);
          const response = await fetch(
            `${functionsBaseUrl}/workflows/status/${encodedFileName}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (!response.ok) {
            if (response.status === 404) {
              // Workflow run not found yet, continue polling
              return;
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error ||
                `HTTP ${response.status}: ${response.statusText}`
            );
          }

          const data = await response.json();

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
    [supabase, getFunctionsBaseUrl, toastActions]
  );

  /**
   * Upload workflow file
   */
  const uploadWorkflow = useCallback(
    async (file: File) => {
      setState((prev) => ({
        ...prev,
        uploadStatus: "uploading",
        loading: true,
        error: null,
      }));

      try {
        const functionsBaseUrl = getFunctionsBaseUrl();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Not authenticated");
        }

        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${functionsBaseUrl}/workflows/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              errorData.details ||
              `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();

        if (data.success) {
          const uploadedFile: UploadedFile = {
            fileName: data.fileName,
            commitSha: data.commitSha,
            workflowRunId: data.workflowRunId,
            workflowRunUrl: data.workflowRunUrl,
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
          throw new Error(data.error || "Upload failed");
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to upload workflow";
        setState((prev) => ({
          ...prev,
          uploadStatus: "error",
          loading: false,
          error: errorMessage,
        }));
        toastActions.showToast(errorMessage, "error");
      }
    },
    [supabase, getFunctionsBaseUrl, toastActions, pollRegistrationStatus]
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
      installationData: null,
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
  const value = useMemo<WorkflowsContextValue>(
    () => ({
      state,
      actions,
    }),
    [state, actions]
  );

  return (
    <WorkflowsContext.Provider value={value}>
      {children}
    </WorkflowsContext.Provider>
  );
}
