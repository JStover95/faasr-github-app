/**
 * Install Edge Function
 *
 * Handles GitHub App installation redirect:
 * - GET - Redirects to GitHub App installation page
 *
 * Session management is handled by Supabase Auth client on the frontend.
 */

import { getConfig } from "./config.ts";

/**
 * Services object for dependency injection and testing
 * This allows functions to be stubbed in tests
 */
export const deps = {
  getConfig,
};

/**
 * Handle GET - Initiate GitHub App installation
 * This redirects the user to the GitHub App installation page.
 */
export function handleInstall(): Response {
  const { githubInstallationUrl } = deps.getConfig();

  // Build GitHub App installation URL
  const githubInstallUrl = new URL(githubInstallationUrl);
  githubInstallUrl.searchParams.set("state", "install");

  console.log("[INSTALL] Install redirect generated", {
    redirectUrl: githubInstallUrl.toString(),
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
 * Main Edge Function handler
 */
export function handler(req: Request): Response {
  const url = new URL(req.url);
  const userAgent = req.headers.get("user-agent") || "unknown";
  const referer = req.headers.get("referer") || "none";

  console.log("[INSTALL] Request received", {
    method: req.method,
    fullPath: url.pathname,
    userAgent,
    referer,
    timestamp: new Date().toISOString(),
  });

  try {
    // Only support GET method
    if (req.method === "GET") {
      return handleInstall();
    } else {
      console.warn("[INSTALL] Method not allowed", {
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
    console.error("[INSTALL] Edge Function error", {
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
