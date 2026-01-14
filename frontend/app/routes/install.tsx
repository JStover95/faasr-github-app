import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { MetaFunction } from "react-router";
import { Header } from "@/components/ui/Header";
import { useAuthContext } from "@/contexts/AuthContext/use-auth-context";
import { useWorkflowsContext } from "@/contexts/WorkflowsContext/use-workflows-context";
import { useToastContext } from "@/contexts/ToastContext/use-toast-context";

export const meta: MetaFunction = () => {
  return [
    { title: "Install GitHub App - FaaSr GitHub App" },
    {
      name: "description",
      content: "Install the FaaSr GitHub App to get started",
    },
  ];
};

export default function Install() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state: authState } = useAuthContext();
  const { actions: workflowsActions } = useWorkflowsContext();
  const { actions: toastActions } = useToastContext();

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

    // Check for success or error in URL params
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const message = searchParams.get("message");
    const login = searchParams.get("login");

    if (success === "true") {
      // Installation successful
      const successMessage = login
        ? `GitHub App installed successfully for ${login}!`
        : "GitHub App installed successfully!";
      toastActions.showToast(successMessage, "success");

      // Refresh installation status
      workflowsActions.checkInstallation();

      // Redirect to home after a brief delay
      setTimeout(() => {
        navigate("/home");
      }, 1500);
    } else if (error) {
      // Installation failed
      const errorMessage =
        message ||
        (error === "missing_installation_id"
          ? "Missing installation ID. Please try installing again."
          : error === "missing_permissions"
            ? "The app needs additional permissions. Please reinstall with the required permissions."
            : error === "no_fork_found"
              ? "No fork of the source repository found. Please fork the repository and try again."
              : error === "rate_limit"
                ? "Too many requests. Please try again in a few minutes."
                : "Installation failed. Please try again.");

      toastActions.showToast(errorMessage, "error");

      // Redirect to home after showing error
      setTimeout(() => {
        navigate("/home");
      }, 3000);
    } else {
      // No params, just redirect to home
      navigate("/home");
    }
  }, [
    authState.loading,
    authState.isAuthenticated,
    searchParams,
    navigate,
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
              Installing GitHub App...
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300">
              Please wait while we process your installation.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
