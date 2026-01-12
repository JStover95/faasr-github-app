/**
 * Authentication Edge Function
 *
 * Handles GitHub App installation and session management:
 * - GET /auth/install - Redirects to GitHub App installation page
 * - GET /auth/callback - Handles installation callback, creates fork, establishes session
 *
 * Session management is handled by Supabase Auth client on the frontend.
 */

import {
  checkInstallationPermissions,
  getInstallation,
  getInstallationToken,
} from "../_shared/github-app.ts";
import { ensureForkExists } from "../_shared/repository.ts";
import { getConfig } from "./config.ts";
import { createSupabaseClient } from "../_shared/supabase-client.ts";

/**
 * Services object for dependency injection and testing
 * This allows functions to be stubbed in tests
 */
export const deps = {
  getInstallation,
  checkInstallationPermissions,
  getInstallationToken,
  ensureForkExists,
  createSupabaseClient,
};

/**
 * Handle GET /auth/install - Initiate GitHub App installation
 * This redirects the user to the GitHub App installation page.
 */
export function handleInstall(req: Request): Response {
  const startTime = Date.now();
  const url = new URL(req.url);
  const userAgent = req.headers.get("user-agent") || "unknown";

  console.log("[AUTH] Install request received", {
    method: req.method,
    path: url.pathname,
    userAgent,
    timestamp: new Date().toISOString(),
  });

  const clientId = Deno.env.get("GITHUB_CLIENT_ID");
  if (!clientId) {
    console.error("[AUTH] Install failed: GitHub App client ID not configured");
    return new Response(
      JSON.stringify({
        success: false,
        error: "GitHub App client ID not configured",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Build GitHub App installation URL
  const githubInstallUrl = new URL(
    "https://github.com/apps/faasr-test-app/installations/new",
  );
  githubInstallUrl.searchParams.set("state", "install");

  const duration = Date.now() - startTime;

  console.log("[AUTH] Install redirect generated", {
    redirectUrl: githubInstallUrl.toString(),
    duration: `${duration}ms`,
  });

  return new Response(
    JSON.stringify({
      success: true,
      redirectUrl: githubInstallUrl.toString(),
      message: "Redirect to GitHub App installation",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Handle GET /auth/callback - Handle GitHub App installation callback
 * This handles the GitHub App installation callback.
 */
export async function handleCallback(req: Request): Promise<Response> {
  const startTime = Date.now();
  const url = new URL(req.url);
  const userAgent = req.headers.get("user-agent") || "unknown";
  const installationId = url.searchParams.get("installation_id");

  console.log("[AUTH] Callback request received", {
    method: req.method,
    path: url.pathname,
    installationId: installationId || "missing",
    queryParams: Object.fromEntries(url.searchParams),
    userAgent,
    timestamp: new Date().toISOString(),
  });

  try {
    if (!installationId) {
      console.warn("[AUTH] Callback failed: Missing installation_id parameter");

      const redirectUrl = new URL("/install", getConfig().frontendUrl);
      redirectUrl.searchParams.set("error", "missing_installation_id");
      redirectUrl.searchParams.set(
        "message",
        "Missing installation ID. Please try installing again.",
      );

      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl.toString(),
        },
      });
    }

    console.log("[AUTH] Fetching installation information", { installationId });

    const installation = await deps.getInstallation(
      getConfig().githubAppId,
      getConfig().githubPrivateKey,
      installationId,
    );

    console.log("[AUTH] Installation retrieved", {
      installationId,
      accountLogin: installation.account.login,
      accountId: installation.account.id,
    });

    console.log("[AUTH] Validating installation permissions", {
      installationId,
    });

    // Validate permissions
    const permissionCheck = await deps.checkInstallationPermissions(
      getConfig().githubAppId,
      getConfig().githubPrivateKey,
      installationId,
    );

    if (!permissionCheck.valid) {
      console.warn("[AUTH] Permission check failed", {
        installationId,
        missingPermissions: permissionCheck.missingPermissions,
      });

      const frontendUrl = getConfig().frontendUrl;
      const redirectUrl = new URL("/install", frontendUrl);

      redirectUrl.searchParams.set("error", "missing_permissions");
      redirectUrl.searchParams.set(
        "message",
        "The app needs additional permissions. Please reinstall with the required permissions.",
      );

      return new Response(null, {
        status: 302,
        headers: {
          Location: redirectUrl.toString(),
        },
      });
    }

    console.log("[AUTH] Permissions validated successfully", {
      installationId,
    });

    console.log("[AUTH] Inserting installation_id into public.profiles", {
      installationId,
    });

    // Insert installation_id into public.profiles
    const supabase = deps.createSupabaseClient();
    const { user: { id: profileId } } = await supabase.auth.getUser();
    await supabase.rpc("insert_installation_id", {
      profile_id: profileId,
      installation_id: installationId,
    });

    console.log("[AUTH] Installation_id inserted into public.profiles", {
      profileId,
      installationId,
    });

    const duration = Date.now() - startTime;

    console.log("[AUTH] Callback completed successfully", {
      installationId,
      accountLogin: installation.account.login,
      duration: `${duration}ms`,
    });

    // Get frontend URL for redirect
    const redirectUrl = new URL("/install", getConfig().frontendUrl);
    redirectUrl.searchParams.set("success", "true");
    redirectUrl.searchParams.set("login", installation.account.login);

    console.log("[AUTH] Redirecting to frontend", {
      redirectUrl: redirectUrl.toString(),
    });

    // Redirect to frontend with success parameters
    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[AUTH] Callback error", {
      installationId: installationId || "unknown",
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    });

    // Provide user-friendly error messages
    let errorCode = "installation_failed";
    let errorMessage = "Installation failed. Please try again.";
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        errorCode = "rate_limit";
        errorMessage = "Too many requests. Please try again in a few minutes.";
      } else if (error.message.includes("permission")) {
        errorCode = "missing_permissions";
        errorMessage =
          "The app needs additional permissions. Please reinstall.";
      } else {
        errorMessage = error.message;
      }
    }

    const frontendUrl = getConfig().frontendUrl;
    const redirectUrl = new URL("/install", frontendUrl);
    redirectUrl.searchParams.set("error", errorCode);
    redirectUrl.searchParams.set("message", errorMessage);

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
      },
    });
  }
}

/**
 * Main Edge Function handler
 */
export async function handler(req: Request): Promise<Response> {
  const requestStartTime = Date.now();
  const url = new URL(req.url);
  const userAgent = req.headers.get("user-agent") || "unknown";
  const referer = req.headers.get("referer") || "none";

  // Extract path after /functions/v1
  const pathMatch = url.pathname.match(/\/functions\/v1(\/.*)$/);
  const path = pathMatch ? pathMatch[1] : url.pathname;

  console.log("[AUTH] Request received", {
    method: req.method,
    path,
    fullPath: url.pathname,
    userAgent,
    referer,
    timestamp: new Date().toISOString(),
  });

  try {
    // Route to appropriate handler
    if (path === "/auth/install" && req.method === "GET") {
      return handleInstall(req);
    } else if (path === "/auth/callback" && req.method === "GET") {
      return await handleCallback(req);
    } else {
      console.warn("[AUTH] Route not found", {
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
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    const duration = Date.now() - requestStartTime;
    console.error("[AUTH] Edge Function error", {
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
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
