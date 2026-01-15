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
  FunctionsHttpError,
  FunctionsRelayError,
  FunctionsFetchError,
} from "@supabase/supabase-js";
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

// Error constants
const INSTALL_ERRORS = {
  missingInstallationId:
    "Missing installation ID. Please try installing again.",
  missingPermissions:
    "The app needs additional permissions. Please reinstall with the required permissions.",
  noForkFound:
    "No fork of the source repository found. Please fork the repository and try again.",
  rateLimit: "Too many requests. Please try again in a few minutes.",
  failedToGetUser: "Failed to get user. Please try again.",
  installationFailed: "Installation failed. Please try again.",
  default: "Failed to initiate installation.",
} as const;

const CHECK_INSTALLATION_ERRORS = {
  failedToGetUser: "Failed to get user.",
  default: "Failed to check installation status.",
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

/**
 * Handle errors from Supabase function invocations
 */
const handleFunctionError = async (
  error: unknown
): Promise<{ message: string; errorCode?: string }> => {
  if (error instanceof FunctionsHttpError) {
    try {
      const errorData = await error.context.json();
      const errorCode = errorData.error || errorData.errorCode;
      const message = errorData.message || errorData.error || error.message;

      // Map callback-specific error codes
      if (errorCode === "missing_installation_id") {
        return { message: INSTALL_ERRORS.missingInstallationId, errorCode };
      }
      if (errorCode === "missing_permissions") {
        return { message: INSTALL_ERRORS.missingPermissions, errorCode };
      }
      if (errorCode === "no_fork_found") {
        return { message: INSTALL_ERRORS.noForkFound, errorCode };
      }
      if (errorCode === "rate_limit") {
        return { message: INSTALL_ERRORS.rateLimit, errorCode };
      }
      if (errorCode === "failed_to_get_user") {
        return { message: INSTALL_ERRORS.failedToGetUser, errorCode };
      }
      if (errorCode === "installation_failed") {
        return { message: INSTALL_ERRORS.installationFailed, errorCode };
      }

      return { message, errorCode };
    } catch {
      return { message: error.message || INSTALL_ERRORS.default };
    }
  } else if (error instanceof FunctionsRelayError) {
    return { message: error.message || INSTALL_ERRORS.default };
  } else if (error instanceof FunctionsFetchError) {
    return { message: error.message || INSTALL_ERRORS.default };
  } else if (error instanceof Error) {
    return { message: error.message || INSTALL_ERRORS.default };
  }
  return { message: INSTALL_ERRORS.default };
};

/**
 * Handle installation errors
 */
const handleInstallError = async (error: unknown): Promise<string> => {
  const { message } = await handleFunctionError(error);
  return message;
};

/**
 * Handle check installation errors
 */
const handleCheckInstallationError = (error: unknown): string => {
  if (error instanceof Error) {
    if (error.message.includes("Failed to get user")) {
      return CHECK_INSTALLATION_ERRORS.failedToGetUser;
    }
    return error.message || CHECK_INSTALLATION_ERRORS.default;
  }
  return CHECK_INSTALLATION_ERRORS.default;
};

/**
 * Handle upload errors
 */
const handleUploadError = async (error: unknown): Promise<string> => {
  if (error instanceof FunctionsHttpError) {
    try {
      const errorData = await error.context.json();
      return (
        errorData.message ||
        errorData.error ||
        error.message ||
        UPLOAD_ERRORS.default
      );
    } catch {
      return error.message || UPLOAD_ERRORS.default;
    }
  } else if (error instanceof FunctionsRelayError) {
    return error.message || UPLOAD_ERRORS.default;
  } else if (error instanceof FunctionsFetchError) {
    return error.message || UPLOAD_ERRORS.default;
  } else if (error instanceof Error) {
    return error.message || UPLOAD_ERRORS.default;
  }
  return UPLOAD_ERRORS.default;
};

/**
 * Handle registration status check errors
 */
const handleRegistrationError = async (
  error: unknown
): Promise<{ message: string; isNotFound: boolean }> => {
  if (error instanceof FunctionsHttpError) {
    // Check for 404 (workflow run not found yet)
    if (error.context.status === 404) {
      return { message: REGISTRATION_ERRORS.notFound, isNotFound: true };
    }
    try {
      const errorData = await error.context.json();
      const message =
        errorData.message ||
        errorData.error ||
        error.message ||
        REGISTRATION_ERRORS.default;
      return { message, isNotFound: false };
    } catch {
      return {
        message: error.message || REGISTRATION_ERRORS.default,
        isNotFound: false,
      };
    }
  } else if (error instanceof FunctionsRelayError) {
    return {
      message: error.message || REGISTRATION_ERRORS.default,
      isNotFound: false,
    };
  } else if (error instanceof FunctionsFetchError) {
    return {
      message: error.message || REGISTRATION_ERRORS.default,
      isNotFound: false,
    };
  } else if (error instanceof Error) {
    // Check if it's a 404 (workflow run not found yet)
    if (
      error.message?.includes("404") ||
      error.message?.includes("not found")
    ) {
      return { message: REGISTRATION_ERRORS.notFound, isNotFound: true };
    }
    return {
      message: error.message || REGISTRATION_ERRORS.default,
      isNotFound: false,
    };
  }
  return { message: REGISTRATION_ERRORS.default, isNotFound: false };
};

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
      const errorMessage = handleCheckInstallationError(error);
      setState((prev) => ({
        ...prev,
        installationStatus: "error",
        loading: false,
        error: errorMessage,
      }));
      toastActions.showToast(errorMessage, "error");
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
      // Install function now routes by HTTP method (GET only)
      const { data, error } = await supabase.functions.invoke("install", {
        method: "GET",
      });

      if (error) {
        const errorMessage = await handleInstallError(error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        toastActions.showToast(errorMessage, "error");
        return;
      }

      if (
        data &&
        typeof data === "object" &&
        "success" in data &&
        data.success &&
        "redirectUrl" in data
      ) {
        // Redirect to GitHub
        window.location.href = data.redirectUrl as string;
      } else {
        const errorMessage = INSTALL_ERRORS.default;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        toastActions.showToast(errorMessage, "error");
      }
    } catch (error) {
      const errorMessage = await handleInstallError(error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      toastActions.showToast(errorMessage, "error");
    }
  }, [supabase, toastActions]);

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
          // Workflows function now uses query params for GET requests
          const queryParams = new URLSearchParams({
            filename: fileName,
          }).toString();
          const { data, error } = await supabase.functions.invoke(
            `workflows?${queryParams}`,
            {
              method: "GET",
            }
          );

          if (error) {
            const { message, isNotFound } =
              await handleRegistrationError(error);
            // If it's a 404 (workflow run not found yet), continue polling
            if (isNotFound) {
              return;
            }
            throw new Error(message);
          }

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
    [supabase, toastActions]
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
        // Workflows function now expects FormData for POST requests
        const formData = new FormData();
        formData.append("file", file);
        formData.append("custom_containers", String(customContainers ?? false));

        const { data, error } = await supabase.functions.invoke("workflows", {
          method: "POST",
          body: formData,
        });

        if (error) {
          const errorMessage = await handleUploadError(error);
          throw new Error(errorMessage);
        }

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
        const errorMessage = await handleUploadError(error);
        setState((prev) => ({
          ...prev,
          uploadStatus: "error",
          loading: false,
          error: errorMessage,
        }));
        toastActions.showToast(errorMessage, "error");
      }
    },
    [supabase, toastActions, pollRegistrationStatus]
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
