/**
 * Tests for auth-status-v2/handler.ts
 *
 * @see design-docs/supabase-testing.md - Testing patterns
 */

import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  deps,
  handleAuthStatus,
} from "../../functions/auth-status-v2/handler.ts";
import { signJWT } from "../../functions/_shared/jwt-utils.ts";

Deno.test("handleAuthStatus - should return user info for valid cookie", async () => {
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

  const getConfigStub = stub(deps, "getConfig", () => ({
    jwtSecret: secret,
  }));

  try {
    const response = await handleAuthStatus(request);
    assertEquals(response.status, 200);

    const data = await response.json();
    assertEquals(data.userLogin, payload.gh_user_login);
    assertEquals(data.avatarUrl, payload.gh_avatar_url);
    assertEquals(data.repoName, payload.gh_repo_name);
  } finally {
    getConfigStub.restore();
  }
});

Deno.test("handleAuthStatus - should return 401 for missing cookie", async () => {
  const request = new Request("https://example.com", {
    headers: {},
  });

  const getConfigStub = stub(deps, "getConfig", () => ({
    jwtSecret: "test_secret_key_at_least_256_bits_long",
  }));

  try {
    const response = await handleAuthStatus(request);
    assertEquals(response.status, 401);

    const data = await response.json();
    assertEquals(data.error, "Unauthorized");
  } finally {
    getConfigStub.restore();
  }
});
