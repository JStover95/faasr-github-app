/**
 * Session Utilities
 *
 * Extracts and validates user session from cookies.
 * Integrates cookie utilities and JWT verification to provide UserSession interface.
 *
 * @see design-docs/supabase.md - Dependency injection pattern
 */

import type { UserSession } from "./types.ts";
import { getAuthCookie } from "./cookie-utils.ts";
import { verifyJWT, type JWTPayload } from "./jwt-utils.ts";

// Dependency injection for testability
export const deps = {
  getAuthCookie,
  verifyJWT,
};

/**
 * Get user session from cookie in request
 * @param request - Request object containing cookie
 * @param secret - JWT signing secret
 * @returns UserSession if valid, throws error otherwise
 * @throws Error if cookie missing, invalid, or expired
 */
export async function getUserSessionFromCookie(
  request: Request,
  secret: string
): Promise<UserSession> {
  const token = deps.getAuthCookie(request);

  if (!token) {
    throw new Error("Missing authentication cookie");
  }

  try {
    const payload: JWTPayload = await deps.verifyJWT(token, secret);

    // Map JWT payload to UserSession interface
    const session: UserSession = {
      installationId: payload.installation_id,
      userLogin: payload.gh_user_login,
      userId: payload.gh_user_id,
      avatarUrl: payload.gh_avatar_url,
      repoName: payload.gh_repo_name,
      createdAt: new Date(payload.iat * 1000),
      expiresAt: new Date(payload.exp * 1000),
    };

    return session;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid session: ${error.message}`);
    }
    throw new Error("Invalid session");
  }
}
