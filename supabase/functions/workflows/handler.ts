/**
 * Workflows Edge Function
 *
 * Handles workflow file upload and registration:
 * - POST - Uploads workflow JSON file, validates it, commits to GitHub, and triggers workflow dispatch
 * - GET - Returns workflow registration status (requires ?filename= query param)
 */

import { GitHubClientService } from "../_shared/github-client.ts";
import { WorkflowUploadService } from "../_shared/workflow-upload-service.ts";
import { WorkflowStatusService } from "../_shared/workflow-status-service.ts";
import { createSupabaseClient } from "../_shared/supabase-client.ts";
import { getConfig } from "./config.ts";
import type { UserSession } from "../_shared/types.ts";

/**
 * Services object for dependency injection and testing
 * This allows services to be stubbed in tests
 */
export const deps = {
  GitHubClientService,
  WorkflowUploadService,
  WorkflowStatusService,
  createSupabaseClient,
  getConfig,
};

/**
 * Get user session from Supabase Auth
 */
export async function getUserSession(
  req: Request,
): Promise<UserSession | null> {
  const supabase = deps.createSupabaseClient(req);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const { data: installationResponse, error: installationError } =
    await supabase
      .rpc("get_gh_installation", { profile_id: user.id });

  if (
    installationError || !installationResponse ||
    installationResponse.length === 0
  ) {
    return null;
  }

  const installationData = installationResponse[0];

  if (!installationData.gh_installation_id || !installationData.gh_user_login) {
    return null;
  }

  return {
    installationId: installationData.gh_installation_id,
    userLogin: installationData.gh_user_login,
    userId: installationData.gh_user_id,
    avatarUrl: installationData.gh_avatar_url,
    repoName: installationData.gh_repo_name,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 3600000),
  };
}

/**
 * Parse FormData from request
 */
export async function parseFormData(req: Request): Promise<{
  file: File | null;
  fileName: string | null;
  customContainers: boolean | null;
}> {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const fileName = file?.name || null;
  const customContainersValue = formData.get("custom_containers");
  const customContainers = customContainersValue === null
    ? null
    : customContainersValue === "true";

  return { file, fileName, customContainers };
}

/**
 * Handle POST - Upload and register workflow JSON file
 */
export async function handleUpload(req: Request): Promise<Response> {
  const { githubAppId, githubPrivateKey } = deps.getConfig();

  try {
    // Validate session
    const session = await getUserSession(req);

    if (!session) {
      console.warn("[WORKFLOWS] Upload failed: Authentication required");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authentication required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("[WORKFLOWS] User session validated", {
      installationId: session.installationId,
      userLogin: session.userLogin,
    });

    console.log("[WORKFLOWS] Parsing FormData");

    const { file, fileName, customContainers } = await parseFormData(req);

    if (!file || !fileName) {
      console.warn("[WORKFLOWS] Upload failed: File is required", {
        hasFile: !!file,
        fileName: fileName || "missing",
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "File is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("[WORKFLOWS] File parsed successfully", {
      fileName,
      fileSize: file.size,
      fileType: file.type,
    });

    console.log("[WORKFLOWS] Initializing services", { fileName });

    const githubClient = new deps.GitHubClientService({
      appId: githubAppId,
      privateKey: githubPrivateKey,
    });
    const uploadService = new deps.WorkflowUploadService(githubClient);

    console.log("[WORKFLOWS] Starting workflow upload", {
      fileName,
      installationId: session.installationId,
    });

    const uploadResult = await uploadService.uploadWorkflow(
      session,
      file,
      fileName,
    );

    console.log("[WORKFLOWS] Workflow uploaded successfully", {
      fileName: uploadResult.fileName,
      commitSha: uploadResult.commitSha,
    });

    console.log("[WORKFLOWS] Triggering registration workflow", {
      fileName: uploadResult.fileName,
    });

    const registrationResult = await uploadService.triggerRegistration(
      session,
      uploadResult.fileName,
      customContainers ?? undefined,
    );

    console.log("[WORKFLOWS] Registration workflow triggered", {
      fileName: uploadResult.fileName,
      workflowRunId: registrationResult.workflowRunId,
      workflowRunUrl: registrationResult.workflowRunUrl,
    });

    console.log("[WORKFLOWS] Upload completed successfully");

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: "Workflow uploaded and registration triggered",
        fileName: uploadResult.fileName,
        commitSha: uploadResult.commitSha,
        workflowRunId: registrationResult.workflowRunId,
        workflowRunUrl: registrationResult.workflowRunUrl,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[WORKFLOWS] Upload error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Handle validation errors
    if (error instanceof Error && error.message.startsWith("Invalid file:")) {
      const errorMessage = error.message.replace("Invalid file: ", "");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid file",
          details: errorMessage,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Handle other errors
    const errorMessage = error instanceof Error
      ? error.message
      : "Upload failed";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Handle GET - Get workflow registration status
 * Requires ?filename= query parameter
 */
export async function handleStatus(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const fileName = url.searchParams.get("filename");

  if (!fileName) {
    console.warn(
      "[WORKFLOWS] Status request failed: filename parameter required",
    );
    return new Response(
      JSON.stringify({
        success: false,
        error: "filename parameter is required",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
  const { githubAppId, githubPrivateKey } = deps.getConfig();

  try {
    // Validate session
    console.log("[WORKFLOWS] Status request for file", { fileName });

    const session = await getUserSession(req);
    if (!session) {
      console.warn("[WORKFLOWS] Status check failed: Authentication required");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Authentication required",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("[WORKFLOWS] User session validated", {
      fileName,
      installationId: session.installationId,
    });

    console.log("[WORKFLOWS] Initializing services", { fileName });
    const githubClient = new deps.GitHubClientService({
      appId: githubAppId,
      privateKey: githubPrivateKey,
    });
    const statusService = new deps.WorkflowStatusService(githubClient);

    console.log("[WORKFLOWS] Fetching workflow status", { fileName });

    const result = await statusService.getWorkflowStatus(session, fileName);

    console.log("[WORKFLOWS] Workflow status retrieved", {
      fileName: result.fileName,
      status: result.status,
      workflowRunId: result.workflowRunId,
      hasError: !!result.errorMessage,
    });

    console.log("[WORKFLOWS] Status check completed");

    // Return success response
    return new Response(
      JSON.stringify({
        fileName: result.fileName,
        status: result.status,
        workflowRunId: result.workflowRunId,
        workflowRunUrl: result.workflowRunUrl,
        errorMessage: result.errorMessage,
        triggeredAt: result.triggeredAt,
        completedAt: result.completedAt,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[WORKFLOWS] Status error", {
      fileName,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Handle not found errors
    if (
      error instanceof Error &&
      error.message.includes("Workflow run not found")
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Handle other errors
    const errorMessage = error instanceof Error
      ? error.message
      : "Failed to get workflow status";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * Main Edge Function handler
 */
export async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const userAgent = req.headers.get("user-agent") || "unknown";
  const referer = req.headers.get("referer") || "none";

  console.log("[WORKFLOWS] Request received", {
    method: req.method,
    fullPath: url.pathname,
    userAgent,
    referer,
    timestamp: new Date().toISOString(),
  });

  try {
    // Route based on HTTP method
    if (req.method === "POST") {
      return await handleUpload(req);
    } else if (req.method === "GET") {
      return await handleStatus(req);
    } else {
      console.warn("[WORKFLOWS] Method not allowed", {
        method: req.method,
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed",
        }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error("[WORKFLOWS] Edge Function error", {
      method: req.method,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
