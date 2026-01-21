/**
 * Logout V2 Edge Function
 *
 * Clears authentication cookie:
 * - POST - Clears the auth cookie by setting expired cookie
 */

import { clearAuthCookie } from "../_shared/cookie-utils.ts";

/**
 * Dependencies object for testing
 * @see design-docs/supabase.md - Dependency injection pattern
 */
export const deps = {
  clearAuthCookie,
};

/**
 * Handle POST - Clear authentication cookie
 */
export function handleLogout(): Response {
  const response = new Response(
    JSON.stringify({
      success: true,
      message: "Logged out successfully",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );

  // Clear cookie
  deps.clearAuthCookie(response);

  console.log("[LOGOUT-V2] Cookie cleared");

  return response;
}

/**
 * Main Edge Function handler
 */
export function handler(req: Request): Response {
  const url = new URL(req.url);

  console.log("[LOGOUT-V2] Request received", {
    method: req.method,
    path: url.pathname,
  });

  try {
    if (req.method === "POST") {
      return handleLogout();
    } else {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch (error) {
    console.error("[LOGOUT-V2] Error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
