/**
 * Tests for install-v2/handler.ts
 *
 * @see design-docs/supabase-testing.md - Testing patterns
 */

import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import { deps, handleInstallV2 } from "../../functions/install-v2/handler.ts";
import { restoreEnvState, saveEnvState } from "../test-utils.ts";

Deno.test("handleInstallV2 - should return OAuth redirect URL", async () => {
  const savedEnv = saveEnvState([
    "GITHUB_CLIENT_ID",
    "GITHUB_OAUTH_CALLBACK_URL_V2",
  ]);

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubClientId: "test_client_id",
    githubCallbackUrlV2: "http://localhost:5173/v2/callback",
  }));

  try {
    const response = handleInstallV2();
    assertEquals(response.status, 200);

    const body = await response.text();
    const data = JSON.parse(body);
    assertEquals(data.success, true);
    assertEquals(
      data.redirectUrl.includes("github.com/login/oauth/authorize"),
      true,
    );
    assertEquals(data.redirectUrl.includes("state=v2_install"), true);
  } finally {
    getConfigStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handleInstallV2 - should include client_id in URL", async () => {
  const getConfigStub = stub(deps, "getConfig", () => ({
    githubClientId: "test_client_id",
    githubCallbackUrlV2: "http://localhost:5173/v2/callback",
  }));

  try {
    const response = handleInstallV2();
    const body = await response.text();
    const data = JSON.parse(body);

    assertEquals(data.redirectUrl.includes("client_id=test_client_id"), true);
  } finally {
    getConfigStub.restore();
  }
});
