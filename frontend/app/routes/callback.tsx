import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { MetaFunction } from "react-router";
import {
  FunctionsHttpError,
  FunctionsRelayError,
  FunctionsFetchError,
} from "@supabase/supabase-js";
import { Header } from "@/components/ui/Header";
import { useAuthContext } from "@/contexts/AuthContext/use-auth-context";
import { useSupabaseClientContext } from "@/contexts/SupabaseClientContext/use-supabase-client-context";
import { useWorkflowsContext } from "@/contexts/WorkflowsContext/use-workflows-context";
import { useToastContext } from "@/contexts/ToastContext/use-toast-context";

// Error constants
const CALLBACK_ERRORS = {
  missingInstallationId:
    "Missing installation ID. Please try installing again.",
  missingPermissions:
    "The app needs additional permissions. Please reinstall with the required permissions.",
  noForkFound:
    "No fork of the source repository found. Please fork the repository and try again.",
  rateLimit: "Too many requests. Please try again in a few minutes.",
  failedToGetUser: "Failed to get user. Please try again.",
  installationFailed: "Installation failed. Please try again.",
  invalidResponse: "Invalid response from callback.",
  default: "Failed to process installation callback.",
} as const;

/**
 * Map error code to user-friendly message
 */
const getCallbackErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "missing_installation_id":
      return CALLBACK_ERRORS.missingInstallationId;
    case "missing_permissions":
      return CALLBACK_ERRORS.missingPermissions;
    case "no_fork_found":
      return CALLBACK_ERRORS.noForkFound;
    case "rate_limit":
      return CALLBACK_ERRORS.rateLimit;
    case "failed_to_get_user":
      return CALLBACK_ERRORS.failedToGetUser;
    case "installation_failed":
      return CALLBACK_ERRORS.installationFailed;
    default:
      return CALLBACK_ERRORS.installationFailed;
  }
};

/**
 * Handle errors from Supabase function invocations for callback
 */
const handleCallbackError = async (
  error: unknown
): Promise<{ message: string; errorCode?: string }> => {
  if (error instanceof FunctionsHttpError) {
    try {
      const errorData = await error.context.json();
      const errorCode = errorData.error || errorData.errorCode;
      const message = errorData.message || getCallbackErrorMessage(errorCode);

      return { message, errorCode };
    } catch {
      return { message: error.message || CALLBACK_ERRORS.default };
    }
  } else if (error instanceof FunctionsRelayError) {
    return { message: error.message || CALLBACK_ERRORS.default };
  } else if (error instanceof FunctionsFetchError) {
    return { message: error.message || CALLBACK_ERRORS.default };
  } else if (error instanceof Error) {
    return { message: error.message || CALLBACK_ERRORS.default };
  }
  return { message: CALLBACK_ERRORS.default };
};

export const meta: MetaFunction = () => {
  return [
    { title: "GitHub App Callback - FaaSr GitHub App" },
    {
      name: "description",
      content: "Processing GitHub App installation callback",
    },
  ];
};

export default function Callback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state: authState } = useAuthContext();
  const { supabase } = useSupabaseClientContext();
  const { actions: workflowsActions } = useWorkflowsContext();
  const { actions: toastActions } = useToastContext();

  const processingRef = useRef(false);

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authState.loading && !authState.isAuthenticated) {
      navigate("/login");
      return;
    }

    // Don't process until auth is loaded
    if (authState.loading) {
      return;
    }

    // Prevent duplicate processing
    if (processingRef.current) {
      return;
    }
    processingRef.current = true;

    const installationId = searchParams.get("installation_id");

    if (!installationId) {
      toastActions.showToast(
        "Missing installation ID. Please try installing again.",
        "error"
      );
      navigate("/");
      return;
    }

    // Process the callback
    const processCallback = async () => {
      try {
        // Invoke the callback function with installation_id as query parameter
        const queryParams = new URLSearchParams({
          installation_id: installationId,
        }).toString();
        const { data, error } = await supabase.functions.invoke(
          `callback?${queryParams}`,
          {
            method: "GET",
          }
        );

        if (error) {
          const { message } = await handleCallbackError(error);
          toastActions.showToast(message, "error");
          navigate("/");
          return;
        }

        if (!data || typeof data !== "object") {
          toastActions.showToast(CALLBACK_ERRORS.invalidResponse, "error");
          navigate("/");
          return;
        }

        if ("success" in data && data.success) {
          // Installation successful
          const login = (data.login as string) || undefined;
          const successMessage = login
            ? `GitHub App installed successfully for ${login}!`
            : "GitHub App installed successfully!";
          toastActions.showToast(successMessage, "success");

          // Refresh installation status
          workflowsActions.checkInstallation();

          // Redirect to home
          navigate("/");
        } else {
          // Installation failed - extract error from response
          const errorCode = (data.error as string) || "installation_failed";
          const errorMessage =
            (data.message as string) || getCallbackErrorMessage(errorCode);

          toastActions.showToast(errorMessage, "error");

          // Redirect to home
          navigate("/");
        }
      } catch (error) {
        const { message } = await handleCallbackError(error);
        toastActions.showToast(message, "error");
        navigate("/");
      }
    };

    processCallback();
  }, [
    authState.loading,
    authState.isAuthenticated,
    searchParams,
    navigate,
    supabase,
    workflowsActions,
    toastActions,
  ]);

  // Don't render until loading is complete
  if (authState.loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!authState.isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              Processing GitHub App Installation...
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Please wait while we complete your installation.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
