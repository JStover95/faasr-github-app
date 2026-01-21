/**
 * Auth Status V2 Edge Function
 *
 * Verifies authentication cookie and returns user info:
 * - GET - Returns user info if cookie is valid, 401 if not
 *
 * Allows frontend to check auth status without exposing JWT secret.
 */

import { getUserSessionFromCookie } from "../_shared/session-utils.ts";
import { getConfig } from "./config.ts";

/**
 * Dependencies object for testing
 * @see design-docs/supabase.md - Dependency injection pattern
 */
export const deps = {
  getUserSessionFromCookie,
  getConfig,
};

/**
 * Handle GET - Verify cookie and return user info
 */
export async function handleAuthStatus(req: Request): Promise<Response> {
  const { jwtSecret } = deps.getConfig();

  try {
    const session = await deps.getUserSessionFromCookie(req, jwtSecret);

    console.log("[AUTH-STATUS-V2] Session verified", {
      userLogin: session.userLogin,
      installationId: session.installationId,
    });

    return new Response(
      JSON.stringify({
        userLogin: session.userLogin,
        avatarUrl: session.avatarUrl,
        repoName: session.repoName,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.warn("[AUTH-STATUS-V2] Session verification failed", {
      error: error instanceof Error ? error.message : String(error),
    });

    return new Response(
      JSON.stringify({
        error: "Unauthorized",
        message: "Invalid or missing authentication cookie",
      }),
      {
        status: 401,
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

  console.log("[AUTH-STATUS-V2] Request received", {
    method: req.method,
    path: url.pathname,
  });

  try {
    if (req.method === "GET") {
      return await handleAuthStatus(req);
    } else {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("[AUTH-STATUS-V2] Error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
