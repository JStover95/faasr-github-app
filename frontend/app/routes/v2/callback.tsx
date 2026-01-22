import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { MetaFunction } from "react-router";
import { Header } from "@/components/ui/Header";
import { useStatelessAuthContext } from "@/contexts/StatelessAuthContext/use-stateless-auth-context";
import { useStatelessWorkflowsContext } from "@/contexts/StatelessWorkflowsContext/use-stateless-workflows-context";
import { useToastContext } from "@/contexts/ToastContext/use-toast-context";

// Error constants
const CALLBACK_V2_ERRORS = {
  missingCode: "Missing authorization code. Please try again.",
  tokenExchangeFailed:
    "Failed to exchange authorization code. Please try again.",
  noInstallations:
    "No GitHub App installations found. Please install the app first.",
  noForkFound:
    "No fork of the source repository found. Please fork the repository and try again.",
  missingPermissions:
    "The app needs additional permissions. Please reinstall with the required permissions.",
  installationFailed: "Installation failed. Please try again.",
  invalidResponse: "Invalid response from callback.",
  default: "Failed to process installation callback.",
} as const;

/**
 * Map error code to user-friendly message
 */
const getCallbackV2ErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "missing_code":
      return CALLBACK_V2_ERRORS.missingCode;
    case "token_exchange_failed":
      return CALLBACK_V2_ERRORS.tokenExchangeFailed;
    case "no_installations":
      return CALLBACK_V2_ERRORS.noInstallations;
    case "no_fork_found":
      return CALLBACK_V2_ERRORS.noForkFound;
    case "missing_permissions":
      return CALLBACK_V2_ERRORS.missingPermissions;
    case "installation_failed":
      return CALLBACK_V2_ERRORS.installationFailed;
    default:
      return CALLBACK_V2_ERRORS.installationFailed;
  }
};

export const meta: MetaFunction = () => {
  return [
    { title: "GitHub App Callback - FaaSr GitHub App V2" },
    {
      name: "description",
      content: "Processing GitHub App installation callback",
    },
  ];
};

export default function V2Callback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { actions: authActions } = useStatelessAuthContext();
  const { actions: workflowsActions } = useStatelessWorkflowsContext();
  const { actions: toastActions } = useToastContext();

  const processingRef = useRef(false);

  useEffect(() => {
    // Don't process until auth is loaded
    if (authActions === undefined) {
      return;
    }

    // Prevent duplicate processing
    if (processingRef.current) {
      return;
    }
    processingRef.current = true;

    const code = searchParams.get("code");

    if (!code) {
      toastActions.showToast(
        "Missing authorization code. Please try installing again.",
        "error"
      );
      navigate("/v2/home");
      return;
    }

    // Process the callback
    const processCallback = async () => {
      try {
        const functionsEndpoint = import.meta.env
          .VITE_SUPABASE_FUNCTIONS_ENDPOINT;
        const queryParams = new URLSearchParams({
          code,
        }).toString();
        const response = await fetch(
          `${functionsEndpoint}/functions/v1/callback-v2?${queryParams}`,
          {
            method: "GET",
            credentials: "include", // Include cookies
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorCode = errorData.error || "installation_failed";
          const message =
            errorData.message || getCallbackV2ErrorMessage(errorCode);
          toastActions.showToast(message, "error");
          navigate("/v2/home");
          return;
        }

        const data = await response.json();

        if (!data || typeof data !== "object") {
          toastActions.showToast(CALLBACK_V2_ERRORS.invalidResponse, "error");
          navigate("/v2/home");
          return;
        }

        if ("success" in data && data.success) {
          // Installation successful
          const login = (data.login as string) || undefined;
          const successMessage = login
            ? `GitHub App installed successfully for ${login}!`
            : "GitHub App installed successfully!";
          toastActions.showToast(successMessage, "success");

          // Refresh auth status and installation status
          await authActions.checkAuth();
          workflowsActions.checkInstallation();

          // Redirect to home
          navigate("/v2/home");
        } else {
          // Installation failed - extract error from response
          const errorCode = (data.error as string) || "installation_failed";
          const errorMessage =
            (data.message as string) || getCallbackV2ErrorMessage(errorCode);

          toastActions.showToast(errorMessage, "error");

          // Redirect to home
          navigate("/v2/home");
        }
      } catch (error) {
        console.error("Callback error:", error);
        const errorMessage =
          error instanceof Error ? error.message : CALLBACK_V2_ERRORS.default;
        toastActions.showToast(errorMessage, "error");
        navigate("/v2/home");
      }
    };

    processCallback();
  }, [searchParams, navigate, authActions, workflowsActions, toastActions]);

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
