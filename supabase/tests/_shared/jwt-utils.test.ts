/**
 * Tests for jwt-utils.ts
 *
 * @see design-docs/supabase-testing.md - Testing patterns
 */

import { assertEquals, assertRejects } from "@std/assert";
import {
  generateNonce,
  signJWT,
  verifyJWT,
} from "../../functions/_shared/jwt-utils.ts";

Deno.test("signJWT - should create valid JWT with all claims", async () => {
  const payload = {
    installation_id: "12345",
    gh_user_login: "testuser",
    gh_user_id: 67890,
    gh_repo_name: "test-repo",
    gh_avatar_url: "https://avatar.url",
  };
  const secret = "test_secret_key_at_least_256_bits_long_for_security";

  const token = await signJWT(payload, secret, 3600);
  const verified = await verifyJWT(token, secret);

  assertEquals(verified.installation_id, payload.installation_id);
  assertEquals(verified.gh_user_login, payload.gh_user_login);
  assertEquals(verified.gh_user_id, payload.gh_user_id);
  assertEquals(verified.gh_repo_name, payload.gh_repo_name);
  assertEquals(verified.jti !== undefined, true);
});

Deno.test("verifyJWT - should reject expired token", async () => {
  const payload = {
    installation_id: "12345",
    gh_user_login: "testuser",
    gh_user_id: 67890,
    gh_repo_name: "test-repo",
  };
  const secret = "test_secret_key_at_least_256_bits_long";

  // Create token with 0 second expiry (immediately expired)
  const token = await signJWT(payload, secret, -1);

  await assertRejects(
    async () => await verifyJWT(token, secret),
    Error,
    "JWT verification failed",
  );
});

Deno.test("verifyJWT - should reject tampered token", async () => {
  const payload = {
    installation_id: "12345",
    gh_user_login: "testuser",
    gh_user_id: 67890,
    gh_repo_name: "test-repo",
  };
  const secret = "test_secret_key_at_least_256_bits_long";

  const token = await signJWT(payload, secret);
  const tamperedToken = token.slice(0, -10) + "tampered00";

  await assertRejects(
    async () => await verifyJWT(tamperedToken, secret),
    Error,
    "JWT verification failed",
  );
});

Deno.test("generateNonce - should generate unique nonces", () => {
  const nonce1 = generateNonce();
  const nonce2 = generateNonce();

  assertEquals(nonce1.length > 0, true);
  assertEquals(nonce2.length > 0, true);
  assertEquals(nonce1 !== nonce2, true);
});
