/**
 * Tests for callback/handler.ts
 */

import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  deps,
  handleCallback,
  handler,
} from "../../functions/callback/handler.ts";
import { createMockOctokit, createMockSupabaseClient } from "../test-utils.ts";
import type { GitHubInstallation } from "../../functions/_shared/types.ts";

Deno.test("handleCallback - should return success on valid installation", async () => {
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
  let capturedRequest: Request | null = null;
  const createSupabaseStub = stub(
    deps,
    "createSupabaseClient",
    (req: Request) => {
      capturedRequest = req;
      return mockSupabase;
    },
  );

  try {
    const mockJWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
    const request = new Request(
      "https://example.com/callback?installation_id=123",
      {
        headers: { Authorization: mockJWT },
      },
    );
    const response = await handleCallback(request);

    assertEquals(response.status, 200);
    const body = await response.json();
    assertEquals(body.success, true);
    assertEquals(body.login, "test-user");
    assertEquals(capturedRequest, request);
  } finally {
    getConfigStub.restore();
    getInstallationStub.restore();
    checkPermissionsStub.restore();
    getTokenStub.restore();
    getReposStub.restore();
    isForkStub.restore();
    octokitStub.restore();
    createSupabaseStub.restore();
  }
});

Deno.test("handleCallback - should return error when getUser returns error", async () => {
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
  let capturedRequest: Request | null = null;
  const createSupabaseStub = stub(
    deps,
    "createSupabaseClient",
    (req: Request) => {
      capturedRequest = req;
      return mockSupabase;
    },
  );

  try {
    const mockJWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
    const request = new Request(
      "https://example.com/callback?installation_id=123",
      {
        headers: { Authorization: mockJWT },
      },
    );
    const response = await handleCallback(request);

    assertEquals(response.status, 401);
    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(body.error, "failed_to_get_user");
    assertEquals(body.message, "Failed to get user. Please try again.");
    assertEquals(capturedRequest, request);
  } finally {
    getConfigStub.restore();
    getInstallationStub.restore();
    checkPermissionsStub.restore();
    getTokenStub.restore();
    getReposStub.restore();
    isForkStub.restore();
    octokitStub.restore();
    createSupabaseStub.restore();
  }
});

Deno.test("handleCallback - should return error when getUser returns null user", async () => {
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
  let capturedRequest: Request | null = null;
  const createSupabaseStub = stub(
    deps,
    "createSupabaseClient",
    (req: Request) => {
      capturedRequest = req;
      return mockSupabase;
    },
  );

  try {
    const mockJWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
    const request = new Request(
      "https://example.com/callback?installation_id=123",
      {
        headers: { Authorization: mockJWT },
      },
    );
    const response = await handleCallback(request);

    assertEquals(response.status, 401);
    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(body.error, "failed_to_get_user");
    assertEquals(body.message, "Failed to get user. Please try again.");
    assertEquals(capturedRequest, request);
  } finally {
    getConfigStub.restore();
    getInstallationStub.restore();
    checkPermissionsStub.restore();
    getTokenStub.restore();
    getReposStub.restore();
    isForkStub.restore();
    octokitStub.restore();
    createSupabaseStub.restore();
  }
});

Deno.test("handleCallback - should return error when installation_id missing", async () => {
  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));

  try {
    const request = new Request("https://example.com/callback");
    const response = await handleCallback(request);

    assertEquals(response.status, 400);
    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(body.error, "missing_installation_id");
    assertEquals(
      body.message,
      "Missing installation ID. Please try installing again.",
    );
  } finally {
    getConfigStub.restore();
  }
});

Deno.test("handleCallback - should return error when permissions missing", async () => {
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
      "https://example.com/callback?installation_id=123",
    );
    const response = await handleCallback(request);

    assertEquals(response.status, 400);
    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(body.error, "missing_permissions");
    assertEquals(
      body.message,
      "The app needs additional permissions. Please reinstall with the required permissions.",
    );
  } finally {
    getConfigStub.restore();
    getInstallationStub.restore();
    checkPermissionsStub.restore();
  }
});

Deno.test("handleCallback - should return error when fork not found", async () => {
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
      "https://example.com/callback?installation_id=123",
    );
    const response = await handleCallback(request);

    assertEquals(response.status, 400);
    const body = await response.json();
    assertEquals(body.success, false);
    assertEquals(body.error, "no_fork_found");
    assertEquals(
      body.message,
      "No fork of the source repository found. Please fork the repository and try again.",
    );
  } finally {
    getConfigStub.restore();
    getInstallationStub.restore();
    checkPermissionsStub.restore();
    getTokenStub.restore();
    getReposStub.restore();
    isForkStub.restore();
    octokitStub.restore();
  }
});

Deno.test("handler - should handle GET request", async () => {
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
  let capturedRequest: Request | null = null;
  const createSupabaseStub = stub(
    deps,
    "createSupabaseClient",
    (req: Request) => {
      capturedRequest = req;
      return mockSupabase;
    },
  );

  try {
    const mockJWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
    const request = new Request(
      "https://example.com/functions/v1/callback?installation_id=123",
      {
        method: "GET",
        headers: { Authorization: mockJWT },
      },
    );
    const response = await handler(request);

    assertEquals(response.status, 200);
    const body = await response.json();
    assertEquals(body.success, true);
    assertEquals(body.login, "test-user");
    assertEquals(capturedRequest, request);
  } finally {
    getConfigStub.restore();
    getInstallationStub.restore();
    checkPermissionsStub.restore();
    getTokenStub.restore();
    getReposStub.restore();
    isForkStub.restore();
    octokitStub.restore();
    createSupabaseStub.restore();
  }
});

Deno.test("handler - should return 405 for POST requests", async () => {
  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));

  try {
    const request = new Request("https://example.com/functions/v1/callback", {
      method: "POST",
    });
    const response = await handler(request);

    assertEquals(response.status, 405);
    const body = JSON.parse(await response.text());
    assertEquals(body.success, false);
    assertEquals(body.error, "Method not allowed");
  } finally {
    getConfigStub.restore();
  }
});

Deno.test("handler - should return 405 for DELETE requests", async () => {
  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));

  try {
    const request = new Request("https://example.com/functions/v1/callback", {
      method: "DELETE",
    });
    const response = await handler(request);

    assertEquals(response.status, 405);
    const body = JSON.parse(await response.text());
    assertEquals(body.success, false);
    assertEquals(body.error, "Method not allowed");
  } finally {
    getConfigStub.restore();
  }
});
