/**
 * Install V2 Edge Function
 *
 * Handles GitHub OAuth authorization redirect:
 * - GET - Redirects to GitHub OAuth authorization page
 *
 * This is a stateless flow that uses OAuth instead of direct installation.
 */

import { getConfig } from "./config.ts";

/**
 * Dependencies object for testing
 * @see design-docs/supabase.md - Dependency injection pattern
 */
export const deps = {
  getConfig,
};

/**
 * Handle GET - Initiate GitHub OAuth flow
 * This redirects the user to the GitHub OAuth authorization page.
 */
export function handleInstallV2(): Response {
  const { githubClientId, githubCallbackUrlV2 } = deps.getConfig();

  const oauthUrl = new URL("https://github.com/login/oauth/authorize");
  oauthUrl.searchParams.set("client_id", githubClientId);
  oauthUrl.searchParams.set("redirect_uri", githubCallbackUrlV2);
  oauthUrl.searchParams.set("state", "v2_install");
  oauthUrl.searchParams.set("scope", "user:email"); // Optional: request user email

  console.log("[INSTALL-V2] OAuth redirect generated", {
    redirectUrl: oauthUrl.toString(),
  });

  return new Response(
    JSON.stringify({
      success: true,
      redirectUrl: oauthUrl.toString(),
      message: "Redirect to GitHub OAuth",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
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

  console.log("[INSTALL-V2] Request received", {
    method: req.method,
    fullPath: url.pathname,
    userAgent,
    referer,
    timestamp: new Date().toISOString(),
  });

  try {
    if (req.method === "GET") {
      return handleInstallV2();
    } else {
      console.warn("[INSTALL-V2] Method not allowed", {
        method: req.method,
      });
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("[INSTALL-V2] Edge Function error", {
      method: req.method,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
