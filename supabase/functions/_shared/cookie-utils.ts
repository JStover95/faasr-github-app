/**
 * Cookie Utilities
 *
 * Handles secure cookie operations for stateless authentication.
 * Sets httpOnly, secure, and SameSite cookies to prevent XSS and CSRF attacks.
 */

const COOKIE_NAME = "faasr_session_v2";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Set authentication cookie in response
 * @param response - Response object to set cookie header
 * @param token - JWT token to store in cookie
 */
export function setAuthCookie(response: Response, token: string): void {
  const cookieValue =
    `${COOKIE_NAME}=${token}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; SameSite=Lax${
      // Only set Secure flag in production (HTTPS)
      Deno.env.get("DENO_ENV") === "production" ? "; Secure" : ""}`;

  response.headers.append("Set-Cookie", cookieValue);
}

/**
 * Extract JWT from cookie header in request
 * @param request - Request object containing cookie header
 * @returns JWT token or null if not found
 */
export function getAuthCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${COOKIE_NAME}=`)) {
      return cookie.substring(COOKIE_NAME.length + 1);
    }
  }

  return null;
}

/**
 * Clear authentication cookie by setting expired cookie
 * @param response - Response object to set expired cookie header
 */
export function clearAuthCookie(response: Response): void {
  const cookieValue =
    `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${
      Deno.env.get("DENO_ENV") === "production" ? "; Secure" : ""
    }`;

  response.headers.append("Set-Cookie", cookieValue);
}
