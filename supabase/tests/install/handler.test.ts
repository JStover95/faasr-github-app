/**
 * Tests for install/handler.ts
 */

import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  deps,
  handleCallback,
  handleInstall,
  handler,
} from "../../functions/install/handler.ts";
import {
  createMockOctokit,
  createMockSupabaseClient,
  restoreEnvState,
  saveEnvState,
} from "../test-utils.ts";
import type { GitHubInstallation } from "../../functions/_shared/types.ts";

Deno.test("handleInstall - should return redirect URL to GitHub installation page", async () => {
  const savedEnv = saveEnvState(["GITHUB_INSTALLATION_URL"]);

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
    githubClientId: "test-client-id",
    frontendUrl: "https://frontend.example.com",
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));

  try {
    const response = handleInstall();
    const body = JSON.parse(await response.text());

    assertEquals(response.status, 200);
    assertEquals(body.success, true);
    assertEquals(
      body.redirectUrl.includes(
        "https://github.com/apps/test/installations/new",
      ),
      true,
    );
    assertEquals(body.redirectUrl.includes("state=install"), true);
  } finally {
    getConfigStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handleInstall - should include state parameter", async () => {
  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
    githubClientId: "test-client-id",
    frontendUrl: "https://frontend.example.com",
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));

  try {
    const response = handleInstall();
    const body = JSON.parse(await response.text());

    assertEquals(body.redirectUrl.includes("state=install"), true);
  } finally {
    getConfigStub.restore();
  }
});

Deno.test("handleInstall - should return 200 status", () => {
  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
    githubClientId: "test-client-id",
    frontendUrl: "https://frontend.example.com",
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));

  try {
    const response = handleInstall();

    assertEquals(response.status, 200);
  } finally {
    getConfigStub.restore();
  }
});

Deno.test("handleInstall - should return JSON response", () => {
  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
    githubClientId: "test-client-id",
    frontendUrl: "https://frontend.example.com",
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));

  try {
    const response = handleInstall();

    assertEquals(response.headers.get("Content-Type"), "application/json");
  } finally {
    getConfigStub.restore();
  }
});

Deno.test("handleCallback - should redirect to frontend with success on valid installation", async () => {
  const savedEnv = saveEnvState(["FRONTEND_URL"]);

  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: { id: "user-123" } },
    error: null,
  });
  mockSupabase.withRpcResponse("insert_gh_installation", () => ({
    data: null,
    error: null,
  }));

  const mockOctokit = createMockOctokit();
  const installation: GitHubInstallation = {
    id: 123,
    account: {
      login: "test-user",
      id: 456,
      avatar_url: "https://example.com/avatar.png",
    },
    permissions: {
      contents: "write",
      actions: "write",
      metadata: "read",
    },
  };

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
    githubClientId: "test-client-id",
    frontendUrl: "https://frontend.example.com",
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));
  const getInstallationStub = stub(
    deps,
    "getInstallation",
    async () => await Promise.resolve(installation),
  );
  const checkPermissionsStub = stub(
    deps,
    "checkInstallationPermissions",
    async () =>
      await Promise.resolve({
        valid: true,
        missingPermissions: [],
      }),
  );
  const getTokenStub = stub(
    deps,
    "getInstallationToken",
    async () =>
      await Promise.resolve({
        token: "test-token",
        expiresAt: "2024-01-01T00:00:00Z",
      }),
  );
  const getReposStub = stub(
    deps,
    "getInstallationRepos",
    async () =>
      await Promise.resolve([
        {
          id: 1,
          name: "FaaSr-workflow",
          full_name: "test-user/FaaSr-workflow",
          owner: {
            login: "test-user",
            id: 456,
          },
        },
      ]),
  );
  const isForkStub = stub(
    deps,
    "isFork",
    async () => await Promise.resolve(true),
  );
  const octokitStub = stub(deps, "Octokit", () => mockOctokit);
  const createSupabaseStub = stub(
    deps,
    "createSupabaseClient",
    () => mockSupabase,
  );

  try {
    const request = new Request(
      "https://example.com/auth/callback?installation_id=123",
    );
    const response = await handleCallback(request);

    assertEquals(response.status, 302);
    const location = response.headers.get("Location");
    assertEquals(location?.includes("/install"), true);
    assertEquals(location?.includes("success=true"), true);
    assertEquals(location?.includes("login=test-user"), true);
  } finally {
    getConfigStub.restore();
    getInstallationStub.restore();
    checkPermissionsStub.restore();
    getTokenStub.restore();
    getReposStub.restore();
    isForkStub.restore();
    octokitStub.restore();
    createSupabaseStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handleCallback - should redirect with error when getUser returns error", async () => {
  const savedEnv = saveEnvState(["FRONTEND_URL"]);

  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: null },
    error: new Error("Authentication failed"),
  });

  const installation: GitHubInstallation = {
    id: 123,
    account: {
      login: "test-user",
      id: 456,
      avatar_url: "https://example.com/avatar.png",
    },
    permissions: {
      contents: "write",
      actions: "write",
      metadata: "read",
    },
  };

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
    githubClientId: "test-client-id",
    frontendUrl: "https://frontend.example.com",
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));
  const getInstallationStub = stub(
    deps,
    "getInstallation",
    async () => await Promise.resolve(installation),
  );
  const checkPermissionsStub = stub(
    deps,
    "checkInstallationPermissions",
    async () =>
      await Promise.resolve({
        valid: true,
        missingPermissions: [],
      }),
  );
  const getTokenStub = stub(
    deps,
    "getInstallationToken",
    async () =>
      await Promise.resolve({
        token: "test-token",
        expiresAt: "2024-01-01T00:00:00Z",
      }),
  );
  const getReposStub = stub(
    deps,
    "getInstallationRepos",
    async () =>
      await Promise.resolve([
        {
          id: 1,
          name: "FaaSr-workflow",
          full_name: "test-user/FaaSr-workflow",
          owner: {
            login: "test-user",
            id: 456,
          },
        },
      ]),
  );
  const isForkStub = stub(
    deps,
    "isFork",
    async () => await Promise.resolve(true),
  );
  const octokitStub = stub(deps, "Octokit", () => createMockOctokit());
  const createSupabaseStub = stub(
    deps,
    "createSupabaseClient",
    () => mockSupabase,
  );

  try {
    const request = new Request(
      "https://example.com/auth/callback?installation_id=123",
    );
    const response = await handleCallback(request);

    assertEquals(response.status, 302);
    const location = response.headers.get("Location");
    assertEquals(location?.includes("/install"), true);
    assertEquals(location?.includes("error=failed_to_get_user"), true);
    assertEquals(
      location?.includes("message=Failed+to+get+user.+Please+try+again."),
      true,
    );
  } finally {
    getConfigStub.restore();
    getInstallationStub.restore();
    checkPermissionsStub.restore();
    getTokenStub.restore();
    getReposStub.restore();
    isForkStub.restore();
    octokitStub.restore();
    createSupabaseStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handleCallback - should redirect with error when getUser returns null user", async () => {
  const savedEnv = saveEnvState(["FRONTEND_URL"]);

  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: null },
    error: null,
  });

  const installation: GitHubInstallation = {
    id: 123,
    account: {
      login: "test-user",
      id: 456,
      avatar_url: "https://example.com/avatar.png",
    },
    permissions: {
      contents: "write",
      actions: "write",
      metadata: "read",
    },
  };

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
    githubClientId: "test-client-id",
    frontendUrl: "https://frontend.example.com",
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));
  const getInstallationStub = stub(
    deps,
    "getInstallation",
    async () => await Promise.resolve(installation),
  );
  const checkPermissionsStub = stub(
    deps,
    "checkInstallationPermissions",
    async () =>
      await Promise.resolve({
        valid: true,
        missingPermissions: [],
      }),
  );
  const getTokenStub = stub(
    deps,
    "getInstallationToken",
    async () =>
      await Promise.resolve({
        token: "test-token",
        expiresAt: "2024-01-01T00:00:00Z",
      }),
  );
  const getReposStub = stub(
    deps,
    "getInstallationRepos",
    async () =>
      await Promise.resolve([
        {
          id: 1,
          name: "FaaSr-workflow",
          full_name: "test-user/FaaSr-workflow",
          owner: {
            login: "test-user",
            id: 456,
          },
        },
      ]),
  );
  const isForkStub = stub(
    deps,
    "isFork",
    async () => await Promise.resolve(true),
  );
  const octokitStub = stub(deps, "Octokit", () => createMockOctokit());
  const createSupabaseStub = stub(
    deps,
    "createSupabaseClient",
    () => mockSupabase,
  );

  try {
    const request = new Request(
      "https://example.com/auth/callback?installation_id=123",
    );
    const response = await handleCallback(request);

    assertEquals(response.status, 302);
    const location = response.headers.get("Location");
    assertEquals(location?.includes("/install"), true);
    assertEquals(location?.includes("error=failed_to_get_user"), true);
    assertEquals(
      location?.includes("message=Failed+to+get+user.+Please+try+again."),
      true,
    );
  } finally {
    getConfigStub.restore();
    getInstallationStub.restore();
    checkPermissionsStub.restore();
    getTokenStub.restore();
    getReposStub.restore();
    isForkStub.restore();
    octokitStub.restore();
    createSupabaseStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handleCallback - should redirect with error when installation_id missing", async () => {
  const savedEnv = saveEnvState(["FRONTEND_URL"]);

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
    githubClientId: "test-client-id",
    frontendUrl: "https://frontend.example.com",
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));

  try {
    const request = new Request("https://example.com/auth/callback");
    const response = await handleCallback(request);

    assertEquals(response.status, 302);
    const location = response.headers.get("Location");
    assertEquals(location?.includes("/install"), true);
    assertEquals(location?.includes("error=missing_installation_id"), true);
  } finally {
    getConfigStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handleCallback - should redirect with error when permissions missing", async () => {
  const savedEnv = saveEnvState(["FRONTEND_URL"]);

  const installation: GitHubInstallation = {
    id: 123,
    account: {
      login: "test-user",
      id: 456,
      avatar_url: "https://example.com/avatar.png",
    },
    permissions: {
      contents: "write",
      actions: "write",
      metadata: "read",
    },
  };

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
    githubClientId: "test-client-id",
    frontendUrl: "https://frontend.example.com",
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));
  const getInstallationStub = stub(
    deps,
    "getInstallation",
    async () => await Promise.resolve(installation),
  );
  const checkPermissionsStub = stub(
    deps,
    "checkInstallationPermissions",
    async () =>
      await Promise.resolve({
        valid: false,
        missingPermissions: ["contents:write"],
      }),
  );

  try {
    const request = new Request(
      "https://example.com/auth/callback?installation_id=123",
    );
    const response = await handleCallback(request);

    assertEquals(response.status, 302);
    const location = response.headers.get("Location");
    assertEquals(location?.includes("/install"), true);
    assertEquals(location?.includes("error=missing_permissions"), true);
  } finally {
    getConfigStub.restore();
    getInstallationStub.restore();
    checkPermissionsStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handleCallback - should redirect with error when fork not found", async () => {
  const savedEnv = saveEnvState(["FRONTEND_URL"]);

  const installation: GitHubInstallation = {
    id: 123,
    account: {
      login: "test-user",
      id: 456,
      avatar_url: "https://example.com/avatar.png",
    },
    permissions: {
      contents: "write",
      actions: "write",
      metadata: "read",
    },
  };

  const mockOctokit = createMockOctokit();

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
    githubClientId: "test-client-id",
    frontendUrl: "https://frontend.example.com",
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));
  const getInstallationStub = stub(
    deps,
    "getInstallation",
    async () => await Promise.resolve(installation),
  );
  const checkPermissionsStub = stub(
    deps,
    "checkInstallationPermissions",
    async () =>
      await Promise.resolve({
        valid: true,
        missingPermissions: [],
      }),
  );
  const getTokenStub = stub(
    deps,
    "getInstallationToken",
    async () =>
      await Promise.resolve({
        token: "test-token",
        expiresAt: "2024-01-01T00:00:00Z",
      }),
  );
  const getReposStub = stub(
    deps,
    "getInstallationRepos",
    async () =>
      await Promise.resolve([
        {
          id: 1,
          name: "some-repo",
          full_name: "test-user/some-repo",
          owner: {
            login: "test-user",
            id: 456,
          },
        },
      ]),
  );
  const isForkStub = stub(
    deps,
    "isFork",
    async () => await Promise.resolve(false),
  );
  const octokitStub = stub(deps, "Octokit", () => mockOctokit);

  try {
    const request = new Request(
      "https://example.com/auth/callback?installation_id=123",
    );
    const response = await handleCallback(request);

    assertEquals(response.status, 302);
    const location = response.headers.get("Location");
    assertEquals(location?.includes("/install"), true);
    assertEquals(location?.includes("error=no_fork_found"), true);
  } finally {
    getConfigStub.restore();
    getInstallationStub.restore();
    checkPermissionsStub.restore();
    getTokenStub.restore();
    getReposStub.restore();
    isForkStub.restore();
    octokitStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handler - should route to handleInstall for /auth/install", async () => {
  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
    githubClientId: "test-client-id",
    frontendUrl: "https://frontend.example.com",
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));

  try {
    const request = new Request(
      "https://example.com/functions/v1/auth/install",
      {
        method: "GET",
      },
    );
    const response = await handler(request);

    assertEquals(response.status, 200);
    const body = JSON.parse(await response.text());
    assertEquals(body.success, true);
  } finally {
    getConfigStub.restore();
  }
});

Deno.test("handler - should route to handleCallback for /auth/callback", async () => {
  const savedEnv = saveEnvState(["FRONTEND_URL"]);

  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: { id: "user-123" } },
    error: null,
  });
  mockSupabase.withRpcResponse("insert_gh_installation", () => ({
    data: null,
    error: null,
  }));

  const mockOctokit = createMockOctokit();
  const installation: GitHubInstallation = {
    id: 123,
    account: {
      login: "test-user",
      id: 456,
      avatar_url: "https://example.com/avatar.png",
    },
    permissions: {
      contents: "write",
      actions: "write",
      metadata: "read",
    },
  };

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
    githubClientId: "test-client-id",
    frontendUrl: "https://frontend.example.com",
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));
  const getInstallationStub = stub(
    deps,
    "getInstallation",
    async () => await Promise.resolve(installation),
  );
  const checkPermissionsStub = stub(
    deps,
    "checkInstallationPermissions",
    async () =>
      await Promise.resolve({
        valid: true,
        missingPermissions: [],
      }),
  );
  const getTokenStub = stub(
    deps,
    "getInstallationToken",
    async () =>
      await Promise.resolve({
        token: "test-token",
        expiresAt: "2024-01-01T00:00:00Z",
      }),
  );
  const getReposStub = stub(
    deps,
    "getInstallationRepos",
    async () =>
      await Promise.resolve([
        {
          id: 1,
          name: "FaaSr-workflow",
          full_name: "test-user/FaaSr-workflow",
          owner: {
            login: "test-user",
            id: 456,
          },
        },
      ]),
  );
  const isForkStub = stub(
    deps,
    "isFork",
    async () => await Promise.resolve(true),
  );
  const octokitStub = stub(deps, "Octokit", () => mockOctokit);
  const createSupabaseStub = stub(
    deps,
    "createSupabaseClient",
    () => mockSupabase,
  );

  try {
    const request = new Request(
      "https://example.com/functions/v1/auth/callback?installation_id=123",
      {
        method: "GET",
      },
    );
    const response = await handler(request);

    assertEquals(response.status, 302);
  } finally {
    getConfigStub.restore();
    getInstallationStub.restore();
    checkPermissionsStub.restore();
    getTokenStub.restore();
    getReposStub.restore();
    isForkStub.restore();
    octokitStub.restore();
    createSupabaseStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handler - should return 404 for unknown routes", async () => {
  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
    githubClientId: "test-client-id",
    frontendUrl: "https://frontend.example.com",
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));

  try {
    const request = new Request("https://example.com/functions/v1/unknown", {
      method: "GET",
    });
    const response = await handler(request);

    assertEquals(response.status, 404);
    const body = JSON.parse(await response.text());
    assertEquals(body.success, false);
    assertEquals(body.error, "Not found");
  } finally {
    getConfigStub.restore();
  }
});
