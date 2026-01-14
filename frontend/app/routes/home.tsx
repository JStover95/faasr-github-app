import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { useAuthContext } from "@/contexts/AuthContext/use-auth-context";
import { useWorkflowsContext } from "@/contexts/WorkflowsContext/use-workflows-context";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "FaaSr GitHub App" },
    {
      name: "description",
      content: "FaaSr GitHub App - Deploy and manage your serverless functions",
    },
  ];
}

export const HOME_TEST_IDS = {
  installButton: "home-install-button",
  installMessage: "home-install-message",
} as const;

export default function Home() {
  const navigate = useNavigate();
  const { state: authState } = useAuthContext();
  const { state: workflowsState, actions: workflowsActions } =
    useWorkflowsContext();

  useEffect(() => {
    if (!authState.loading && !authState.isAuthenticated) {
      navigate("/login");
    }
  }, [authState.loading, authState.isAuthenticated, navigate]);

  // Check installation status when authenticated
  useEffect(() => {
    if (
      authState.isAuthenticated &&
      workflowsState.installationStatus === "checking"
    ) {
      workflowsActions.checkInstallation();
    }
  }, [
    authState.isAuthenticated,
    workflowsState.installationStatus,
    workflowsActions,
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

  const isInstallationChecking =
    workflowsState.installationStatus === "checking";
  const isNotInstalled =
    workflowsState.installationStatus === "not_installed" ||
    workflowsState.installationStatus === "error";
  const isInstalled = workflowsState.installationStatus === "installed";

  const handleInstallClick = () => {
    workflowsActions.initiateInstall();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome to FaaSr GitHub App
          </h2>

          {isInstallationChecking && (
            <div className="mb-6">
              <p className="text-lg text-gray-700 dark:text-gray-300">
                Checking installation status...
              </p>
            </div>
          )}

          {isNotInstalled && (
            <div className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                Install GitHub App
              </h3>
              <p
                className="text-gray-700 dark:text-gray-300 mb-4"
                data-testid={HOME_TEST_IDS.installMessage}
              >
                To get started, you need to install the FaaSr GitHub App. This
                will allow you to upload and manage your workflow files.
              </p>
              <Button
                title="Install GitHub App"
                onClick={handleInstallClick}
                loading={workflowsState.loading}
                testID={HOME_TEST_IDS.installButton}
                className="max-w-xs"
              />
            </div>
          )}

          {isInstalled && (
            <div className="mb-6">
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                GitHub App is installed and ready to use.
                {workflowsState.installationData?.ghUserLogin && (
                  <span className="ml-2">
                    Logged in as{" "}
                    <span className="font-semibold">
                      {workflowsState.installationData.ghUserLogin}
                    </span>
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="mt-8">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
              {isInstalled
                ? "You can now upload and manage your workflow files."
                : "Get started by installing the GitHub App to deploy and manage your serverless functions with ease."}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
