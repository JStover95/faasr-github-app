/**
 * Workflows Edge Function
 *
 * Handles workflow file upload and registration:
 * - POST /workflows/upload - Uploads workflow JSON file, validates it, commits to GitHub, and triggers workflow dispatch
 * - GET /workflows/status/{fileName} - Returns workflow registration status
 */

import { GitHubClientService } from "../_shared/github-client.ts";
import { WorkflowUploadService } from "../_shared/workflow-upload-service.ts";
import { WorkflowStatusService } from "../_shared/workflow-status-service.ts";
import {
  createAuthErrorResponse,
  createConfigurationErrorResponse,
  createErrorResponse,
  createNotFoundErrorResponse,
  createValidationErrorResponse,
} from "../_shared/error-handler.ts";
import { createSupabaseClient } from "../_shared/supabase-client.ts";

/**
 * Services object for dependency injection and testing
 * This allows services to be stubbed in tests
 */
export const deps = {
  GitHubClientService,
  WorkflowUploadService,
  WorkflowStatusService,
  createSupabaseClient,
};

/**
 * Parse FormData from request
 */
export async function parseFormData(req: Request): Promise<{
  file: File | null;
  fileName: string | null;
}> {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const fileName = file?.name || null;

  return { file, fileName };
}

/**
 * Handle POST /workflows/upload - Upload and register workflow JSON file
 */
export async function handleUpload(req: Request): Promise<Response> {
  const startTime = Date.now();
  const url = new URL(req.url);
  const userAgent = req.headers.get("user-agent") || "unknown";
  const contentType = req.headers.get("content-type") || "unknown";

  console.log("[WORKFLOWS] Upload request received", {
    method: req.method,
    path: url.pathname,
    contentType,
    userAgent,
    timestamp: new Date().toISOString(),
  });

  try {
    // Validate session
    console.log("[WORKFLOWS] Validating user session");
    const session = await deps.getUserFromRequest(req);
    if (!session) {
      console.warn("[WORKFLOWS] Upload failed: Authentication required");
      return createAuthErrorResponse(req);
    }
    console.log("[WORKFLOWS] User session validated", {
      userId: session.installationId,
      userLogin: session.userLogin,
    });

    // Parse FormData
    console.log("[WORKFLOWS] Parsing FormData");
    const { file, fileName } = await parseFormData(req);

    if (!file || !fileName) {
      console.warn("[WORKFLOWS] Upload failed: File is required", {
        hasFile: !!file,
        fileName: fileName || "missing",
      });
      return createValidationErrorResponse("File is required", undefined, req);
    }

    console.log("[WORKFLOWS] File parsed successfully", {
      fileName,
      fileSize: file.size,
      fileType: file.type,
    });

    // Initialize services
    console.log("[WORKFLOWS] Initializing services", { fileName });
    const githubClient = new deps.GitHubClientService();
    const uploadService = new deps.WorkflowUploadService(githubClient);

    // Execute upload business logic
    console.log("[WORKFLOWS] Starting workflow upload", {
      fileName,
      userId: session.installationId,
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

    // Trigger registration workflow
    console.log("[WORKFLOWS] Triggering registration workflow", {
      fileName: uploadResult.fileName,
    });
    const registrationResult = await uploadService.triggerRegistration(
      session,
      uploadResult.fileName,
    );
    console.log("[WORKFLOWS] Registration workflow triggered", {
      fileName: uploadResult.fileName,
      workflowRunId: registrationResult.workflowRunId,
      workflowRunUrl: registrationResult.workflowRunUrl,
    });

    const duration = Date.now() - startTime;
    console.log("[WORKFLOWS] Upload completed successfully", {
      fileName: uploadResult.fileName,
      commitSha: uploadResult.commitSha,
      workflowRunId: registrationResult.workflowRunId,
      duration: `${duration}ms`,
    });

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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[WORKFLOWS] Upload error", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    // Handle validation errors
    if (error instanceof Error && error.message.startsWith("Invalid file:")) {
      const errors = error.message.replace("Invalid file: ", "").split(", ");
      return createValidationErrorResponse("Invalid file", errors, req);
    }

    // Handle configuration errors
    if (
      error instanceof Error &&
      error.message.includes("GitHub App configuration missing")
    ) {
      return createConfigurationErrorResponse(error.message, req);
    }

    // Handle other errors
    return createErrorResponse(error, 500, "Upload failed", req);
  }
}

/**
 * Handle GET /workflows/status/{fileName} - Get workflow registration status
 */
export async function handleStatus(
  req: Request,
  fileName: string,
): Promise<Response> {
  const startTime = Date.now();
  const url = new URL(req.url);
  const userAgent = req.headers.get("user-agent") || "unknown";

  const supabase = deps.createSupabaseClient();

  console.log("[WORKFLOWS] Status request received", {
    method: req.method,
    path: url.pathname,
    fileName,
    userAgent,
    timestamp: new Date().toISOString(),
  });

  try {
    // Validate session
    console.log("[WORKFLOWS] Validating user session", { fileName });

    const { user: { id: profileId } } = await supabase.auth.getUser();
    const installationId = await supabase.rpc("get_installation_id", {
      profile_id: profileId,
    });

    if (!(typeof installationId === "string" && installationId.length > 0)) {
      console.warn(
        "[WORKFLOWS] Status check failed: Installation ID not found",
        {
          profileId,
        },
      );
      return createAuthErrorResponse();
    }

    console.log("[WORKFLOWS] User session validated", {
      fileName,
      installationId,
    });

    // Initialize services
    console.log("[WORKFLOWS] Initializing services", { fileName });
    const githubClient = new deps.GitHubClientService();
    const statusService = new deps.WorkflowStatusService(githubClient);

    // Execute status retrieval business logic
    console.log("[WORKFLOWS] Fetching workflow status", { fileName });

    const result = await statusService.getWorkflowStatus(
      installationId,
      fileName,
    );

    console.log("[WORKFLOWS] Workflow status retrieved", {
      fileName: result.fileName,
      status: result.status,
      workflowRunId: result.workflowRunId,
      hasError: !!result.errorMessage,
    });

    const duration = Date.now() - startTime;
    console.log("[WORKFLOWS] Status check completed", {
      fileName: result.fileName,
      status: result.status,
      duration: `${duration}ms`,
    });

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
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[WORKFLOWS] Status error", {
      fileName,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    // Handle not found errors
    if (
      error instanceof Error &&
      error.message.includes("Workflow run not found")
    ) {
      return createNotFoundErrorResponse(error.message, req);
    }

    // Handle configuration errors
    if (
      error instanceof Error &&
      error.message.includes("GitHub App configuration missing")
    ) {
      return createConfigurationErrorResponse(error.message, req);
    }

    // Handle other errors
    return createErrorResponse(
      error,
      500,
      "Failed to get workflow status",
      req,
    );
  }
}

/**
 * Main Edge Function handler
 */
if (import.meta.main) {
  // Validate environment variables on module load (once per Edge Function instance)
  try {
    validateEnvironmentOnStartup();
  } catch (error) {
    console.error("Environment validation failed:", error);
    // Don't throw here - let individual handlers handle missing env vars gracefully
  }

  Deno.serve(async (req: Request) => {
    const requestStartTime = Date.now();
    const corsHeaders = getCorsHeaders(req);
    const url = new URL(req.url);
    const userAgent = req.headers.get("user-agent") || "unknown";
    const referer = req.headers.get("referer") || "none";

    // Extract path after /functions/v1
    const pathMatch = url.pathname.match(/\/functions\/v1(\/.*)$/);
    const path = pathMatch ? pathMatch[1] : url.pathname;

    console.log("[WORKFLOWS] Request received", {
      method: req.method,
      path,
      fullPath: url.pathname,
      userAgent,
      referer,
      timestamp: new Date().toISOString(),
    });

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      console.log("[WORKFLOWS] CORS preflight request handled", { path });
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Route to appropriate handler
      if (path === "/workflows/upload" && req.method === "POST") {
        return await handleUpload(req);
      } else if (
        path.startsWith("/workflows/status/") &&
        req.method === "GET"
      ) {
        // Extract fileName from path
        const fileNameMatch = path.match(/\/workflows\/status\/(.+)$/);
        if (!fileNameMatch) {
          console.warn(
            "[WORKFLOWS] Status request failed: File name is required",
            {
              path,
            },
          );
          return new Response(
            JSON.stringify({
              success: false,
              error: "File name is required",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        const fileName = decodeURIComponent(fileNameMatch[1]);
        return await handleStatus(req, fileName);
      } else {
        console.warn("[WORKFLOWS] Route not found", {
          method: req.method,
          path,
        });
        return new Response(
          JSON.stringify({
            success: false,
            error: "Not found",
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    } catch (error) {
      const duration = Date.now() - requestStartTime;
      console.error("[WORKFLOWS] Edge Function error", {
        method: req.method,
        path,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Internal server error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  });
}
