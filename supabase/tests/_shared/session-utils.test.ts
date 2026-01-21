/**
 * Tests for session-utils.ts
 *
 * @see design-docs/supabase-testing.md - Testing patterns
 */

import { assertEquals, assertRejects } from "@std/assert";
import {
  getUserSessionFromCookie,
} from "../../functions/_shared/session-utils.ts";
import { signJWT } from "../../functions/_shared/jwt-utils.ts";

Deno.test("getUserSessionFromCookie - should return valid session", async () => {
  const secret = "test_secret_key_at_least_256_bits_long";
  const payload = {
    installation_id: "12345",
    gh_user_login: "testuser",
    gh_user_id: 67890,
    gh_repo_name: "test-repo",
    gh_avatar_url: "https://avatar.url",
  };

  const token = await signJWT(payload, secret);
  const request = new Request("https://example.com", {
    headers: {
      Cookie: `faasr_session_v2=${token}`,
    },
  });

  const session = await getUserSessionFromCookie(request, secret);

  assertEquals(session.installationId, payload.installation_id);
  assertEquals(session.userLogin, payload.gh_user_login);
  assertEquals(session.userId, payload.gh_user_id);
  assertEquals(session.repoName, payload.gh_repo_name);
});

Deno.test("getUserSessionFromCookie - should throw when cookie missing", async () => {
  const request = new Request("https://example.com", {
    headers: {},
  });
  const secret = "test_secret_key_at_least_256_bits_long";

  await assertRejects(
    async () => await getUserSessionFromCookie(request, secret),
    Error,
    "Missing authentication cookie",
  );
});

Deno.test("getUserSessionFromCookie - should throw when token invalid", async () => {
  const request = new Request("https://example.com", {
    headers: {
      Cookie: "faasr_session_v2=invalid_token",
    },
  });
  const secret = "test_secret_key_at_least_256_bits_long";

  await assertRejects(
    async () => await getUserSessionFromCookie(request, secret),
    Error,
    "Invalid session",
  );
});
