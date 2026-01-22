import { useEffect, useState } from "react";
import type { Route } from "./+types/home";
import { Header } from "@/components/ui/Header";
import { Button } from "@/components/ui/Button";
import { FileInput } from "@/components/ui/FileInput";
import { Checkbox } from "@/components/ui/Checkbox";
import { useStatelessAuthContext } from "@/contexts/StatelessAuthContext/use-stateless-auth-context";
import { useStatelessWorkflowsContext } from "@/contexts/StatelessWorkflowsContext/use-stateless-workflows-context";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "FaaSr GitHub App - V2" },
    {
      name: "description",
      content: "FaaSr GitHub App - Stateless flow",
    },
  ];
}

export const V2_HOME_TEST_IDS = {
  installButton: "v2-home-install-button",
  installMessage: "v2-home-install-message",
  uploadSection: "v2-home-upload-section",
  fileInput: "v2-home-file-input",
  customContainersCheckbox: "v2-home-custom-containers-checkbox",
  uploadButton: "v2-home-upload-button",
  uploadStatus: "v2-home-upload-status",
  registrationStatus: "v2-home-registration-status",
  workflowRunLink: "v2-home-workflow-run-link",
} as const;

interface UploadUIState {
  selectedFile: File | null;
  fileError: string | null;
  customContainers: boolean;
}

export default function V2Home() {
  const { state: authState } = useStatelessAuthContext();
  const { state: workflowsState, actions: workflowsActions } =
    useStatelessWorkflowsContext();

  // Single state object for upload UI
  const [uploadUIState, setUploadUIState] = useState<UploadUIState>({
    selectedFile: null,
    fileError: null,
    customContainers: false,
  });

  // Check installation status when authenticated
  useEffect(() => {
    if (
      !authState.loading &&
      authState.isAuthenticated &&
      workflowsState.installationStatus === "checking"
    ) {
      workflowsActions.checkInstallation();
    }
  }, [
    authState.loading,
    authState.isAuthenticated,
    workflowsState.installationStatus,
    workflowsActions,
  ]);

  // Reset file selection after completion to allow new uploads
  useEffect(() => {
    if (
      workflowsState.registrationStatus === "success" ||
      workflowsState.registrationStatus === "failed"
    ) {
      // Keep showing status but allow new file selection
      setUploadUIState((prev) => ({
        ...prev,
        selectedFile: null,
        fileError: null,
      }));
    }
  }, [workflowsState.registrationStatus]);

  // Don't render until loading is complete
  if (authState.loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
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

  // File selection with JSON validation
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setUploadUIState((prev) => ({
        ...prev,
        selectedFile: null,
        fileError: null,
      }));
      return;
    }

    // Validate JSON file
    if (!file.name.endsWith(".json")) {
      setUploadUIState((prev) => ({
        ...prev,
        selectedFile: null,
        fileError: "Please select a JSON file",
      }));
      return;
    }

    // Validate file size (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadUIState((prev) => ({
        ...prev,
        selectedFile: null,
        fileError: "File too large (max 5MB)",
      }));
      return;
    }

    setUploadUIState((prev) => ({
      ...prev,
      selectedFile: file,
      fileError: null,
    }));
  };

  // Checkbox change handler
  const handleCustomContainersChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setUploadUIState((prev) => ({
      ...prev,
      customContainers: event.target.checked,
    }));
  };

  // Upload handler
  const handleUpload = () => {
    if (!uploadUIState.selectedFile) return;

    workflowsActions.uploadWorkflow(
      uploadUIState.selectedFile,
      uploadUIState.customContainers
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome to FaaSr GitHub App (V2)
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
                data-testid={V2_HOME_TEST_IDS.installMessage}
              >
                To get started, you need to install the FaaSr GitHub App. This
                will allow you to upload and manage your workflow files.
              </p>
              <Button
                title="Install GitHub App"
                onClick={handleInstallClick}
                loading={workflowsState.loading}
                testID={V2_HOME_TEST_IDS.installButton}
                className="max-w-xs"
              />
            </div>
          )}

          {isInstalled && (
            <>
              <div className="mb-6">
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                  GitHub App is installed and ready to use.
                  {authState.userLogin && (
                    <span className="ml-2">
                      Logged in as{" "}
                      <span className="font-semibold">
                        {authState.userLogin}
                      </span>
                    </span>
                  )}
                </p>
              </div>

              {/* Upload Section */}
              <div
                className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                data-testid={V2_HOME_TEST_IDS.uploadSection}
              >
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Upload Workflow
                </h3>

                <div className="mb-4">
                  <FileInput
                    accept=".json"
                    onChange={handleFileChange}
                    error={uploadUIState.fileError || undefined}
                    hint="Select a JSON workflow file to upload"
                    testID={V2_HOME_TEST_IDS.fileInput}
                    selectedFileName={uploadUIState.selectedFile?.name}
                    disabled={
                      workflowsState.uploadStatus === "uploading" ||
                      workflowsState.registrationStatus === "polling"
                    }
                  />
                </div>

                <div className="mb-4">
                  <Checkbox
                    label="Allow custom containers"
                    checked={uploadUIState.customContainers}
                    onChange={handleCustomContainersChange}
                    testID={V2_HOME_TEST_IDS.customContainersCheckbox}
                    disabled={
                      workflowsState.uploadStatus === "uploading" ||
                      workflowsState.registrationStatus === "polling"
                    }
                  />
                </div>

                <div className="mb-4">
                  <Button
                    title="Upload Workflow"
                    onClick={handleUpload}
                    loading={workflowsState.uploadStatus === "uploading"}
                    disabled={
                      !uploadUIState.selectedFile ||
                      workflowsState.uploadStatus === "uploading" ||
                      workflowsState.registrationStatus === "polling"
                    }
                    testID={V2_HOME_TEST_IDS.uploadButton}
                    className="max-w-xs"
                  />
                </div>

                {/* Upload status display */}
                {workflowsState.uploadStatus === "uploaded" && (
                  <div
                    className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md"
                    data-testid={V2_HOME_TEST_IDS.uploadStatus}
                  >
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      ✓ Upload successful:{" "}
                      <span className="font-medium">
                        {workflowsState.uploadedFile?.fileName}
                      </span>
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Starting registration...
                    </p>
                  </div>
                )}

                {/* Registration polling status */}
                {workflowsState.registrationStatus === "polling" && (
                  <div
                    className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md"
                    data-testid={V2_HOME_TEST_IDS.registrationStatus}
                  >
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600 dark:text-blue-400"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          Checking registration status...
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                          Status:{" "}
                          <span className="font-medium capitalize">
                            {workflowsState.registrationData?.status ||
                              "pending"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success state with workflow run link */}
                {workflowsState.registrationStatus === "success" && (
                  <div
                    className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md"
                    data-testid={V2_HOME_TEST_IDS.registrationStatus}
                  >
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                      ✓ Registration complete!
                    </p>
                    {workflowsState.registrationData?.workflowRunUrl && (
                      <a
                        href={workflowsState.registrationData.workflowRunUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 underline font-medium"
                        data-testid={V2_HOME_TEST_IDS.workflowRunLink}
                      >
                        View workflow run →
                      </a>
                    )}
                  </div>
                )}

                {/* Error states */}
                {(workflowsState.uploadStatus === "error" ||
                  workflowsState.registrationStatus === "failed" ||
                  workflowsState.registrationStatus === "error") && (
                  <div
                    className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
                    data-testid={V2_HOME_TEST_IDS.uploadStatus}
                  >
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                      ✗ Error
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {workflowsState.error ||
                        workflowsState.registrationData?.errorMessage ||
                        "An error occurred"}
                    </p>
                  </div>
                )}
              </div>
            </>
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
