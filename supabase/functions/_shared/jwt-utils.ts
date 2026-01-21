/**
 * JWT Utilities
 *
 * Provides JWT signing and verification using jose library for stateless authentication.
 * Uses HS256 algorithm for symmetric signing with installation data.
 *
 * @see design-docs/supabase.md - Dependency injection pattern
 */

import { jwtVerify, SignJWT } from "jose";

export interface JWTPayload {
  installation_id: string;
  gh_user_login: string;
  gh_user_id: number;
  gh_repo_name: string;
  gh_avatar_url?: string;
  iat: number;
  exp: number;
  jti: string;
}

// Dependency injection for testability
export const deps = {
  crypto,
  jwtVerify,
  SignJWT,
};

/**
 * Generate random nonce for JWT jti claim
 */
export function generateNonce(): string {
  const buffer = new Uint8Array(16);
  deps.crypto.getRandomValues(buffer);
  return Array.from(buffer, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Sign installation data into JWT
 * @param payload - Installation data to sign
 * @param secret - JWT signing secret (256+ bits)
 * @param expiresIn - Expiration in seconds (default: 7 days)
 */
export async function signJWT(
  payload: Omit<JWTPayload, "iat" | "exp" | "jti">,
  secret: string,
  expiresIn: number = 7 * 24 * 60 * 60,
): Promise<string> {
  const secretKey = new TextEncoder().encode(secret);
  const now = Math.floor(Date.now() / 1000);

  const jwt = await new deps.SignJWT({
    ...payload,
    iat: now,
    jti: generateNonce(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(now + expiresIn)
    .sign(secretKey);

  return jwt;
}

export function isJWTPayload(payload: unknown): payload is JWTPayload {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "installation_id" in payload &&
    "gh_user_login" in payload &&
    "gh_user_id" in payload &&
    "gh_repo_name" in payload &&
    "iat" in payload &&
    "exp" in payload &&
    "jti" in payload
  );
}

/**
 * Verify and decode JWT from cookie
 * @param token - JWT token to verify
 * @param secret - JWT signing secret
 * @throws Error if token is invalid, expired, or missing claims
 */
export async function verifyJWT(
  token: string,
  secret: string,
): Promise<JWTPayload> {
  const secretKey = new TextEncoder().encode(secret);

  try {
    const { payload } = await deps.jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    // Validate required claims
    if (!isJWTPayload(payload)) {
      throw new Error("Invalid JWT payload");
    }

    return payload;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
    throw new Error("JWT verification failed");
  }
}
