/**
 * Tests for github-app.ts
 */

import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  checkInstallationPermissions,
  createGitHubApp,
  deps,
  generateAppJWT,
  getInstallation,
  getInstallationRepos,
  getInstallationToken,
  validateInstallationPermissions,
} from "../../functions/_shared/github-app.ts";
import { createMockApp, createMockOctokit } from "../test-utils.ts";
import type { GitHubInstallation } from "../../functions/_shared/types.ts";

Deno.test("createGitHubApp - should create App instance with correct config", () => {
  const mockApp = createMockApp();
  const appStub = stub(deps, "App", () => mockApp);

  try {
    const app = createGitHubApp({
      appId: "12345",
      privateKey: "test-key",
    });

    assertEquals(app, mockApp);
  } finally {
    appStub.restore();
  }
});

Deno.test("createGitHubApp - should include OAuth config when provided", () => {
  const mockApp = createMockApp();
  let capturedConfig: unknown = null;
  const appStub = stub(deps, "App", (config: unknown) => {
    capturedConfig = config;
    return mockApp;
  });

  try {
    createGitHubApp({
      appId: "12345",
      privateKey: "test-key",
      clientId: "client-id",
      clientSecret: "client-secret",
    });

    assertEquals(
      (capturedConfig as { oauth?: { clientId: string; clientSecret: string } })
        ?.oauth?.clientId,
      "client-id",
    );
    assertEquals(
      (capturedConfig as { oauth?: { clientId: string; clientSecret: string } })
        ?.oauth?.clientSecret,
      "client-secret",
    );
  } finally {
    appStub.restore();
  }
});

Deno.test("createGitHubApp - should exclude OAuth config when not provided", () => {
  const mockApp = createMockApp();
  let capturedConfig: unknown = null;
  const appStub = stub(deps, "App", (config: unknown) => {
    capturedConfig = config;
    return mockApp;
  });

  try {
    createGitHubApp({
      appId: "12345",
      privateKey: "test-key",
    });

    assertEquals(
      (capturedConfig as { oauth?: unknown })?.oauth,
      undefined,
    );
  } finally {
    appStub.restore();
  }
});

Deno.test("generateAppJWT - should generate valid JWT with correct payload", () => {
  const jwtStub = stub(deps, "sign", (
    _payload: unknown,
    _privateKey: string,
    _options?: unknown,
  ) => {
    return "mock.jwt.token";
  });

  try {
    const token = generateAppJWT("12345", "test-key");

    assertEquals(token, "mock.jwt.token");
  } finally {
    jwtStub.restore();
  }
});

Deno.test("generateAppJWT - should use RS256 algorithm", () => {
  let capturedOptions: unknown = null;
  const jwtStub = stub(deps, "sign", (
    _payload: unknown,
    _privateKey: string,
    options?: { algorithm?: string },
  ) => {
    capturedOptions = options;
    return "mock.jwt.token";
  });

  try {
    generateAppJWT("12345", "test-key");

    assertEquals(
      (capturedOptions as { algorithm?: string })?.algorithm,
      "RS256",
    );
  } finally {
    jwtStub.restore();
  }
});

Deno.test("generateAppJWT - should set expiration to 10 minutes", () => {
  let capturedPayload: unknown = null;
  const jwtStub = stub(deps, "sign", (
    payload: unknown,
    _privateKey: string,
    _options?: unknown,
  ) => {
    capturedPayload = payload;
    return "mock.jwt.token";
  });

  try {
    generateAppJWT("12345", "test-key");

    const payload = capturedPayload as {
      iat: number;
      exp: number;
      iss: string;
    };
    assertEquals(payload.exp - payload.iat, 600); // 10 minutes
  } finally {
    jwtStub.restore();
  }
});

Deno.test("generateAppJWT - should use appId as issuer", () => {
  let capturedPayload: unknown = null;
  const jwtStub = stub(deps, "sign", (
    payload: unknown,
    _privateKey: string,
    _options?: unknown,
  ) => {
    capturedPayload = payload;
    return "mock.jwt.token";
  });

  try {
    generateAppJWT("12345", "test-key");

    const payload = capturedPayload as { iss: string };
    assertEquals(payload.iss, "12345");
  } finally {
    jwtStub.restore();
  }
});

Deno.test("getInstallationToken - should return installation token and expiration", async () => {
  const mockApp = createMockApp();
  const mockOctokit = createMockOctokit();
  mockOctokit.withAuthResponse(() => ({
    token: "test-token",
    expiresAt: "2024-01-01T00:00:00Z",
  }));

  mockApp.withInstallationOctokit(123, mockOctokit);

  const appStub = stub(deps, "App", () => mockApp);

  try {
    const result = await getInstallationToken("12345", "test-key", "123");

    assertEquals(result.token, "test-token");
    assertEquals(result.expiresAt, "2024-01-01T00:00:00Z");
  } finally {
    appStub.restore();
  }
});

Deno.test("getInstallationToken - should call getInstallationOctokit with correct ID", async () => {
  const mockOctokit = createMockOctokit();
  let capturedInstallationId: number | null = null;

  const mockAppWithCapture = {
    getInstallationOctokit: async (installationId: number) => {
      capturedInstallationId = installationId;
      return await Promise.resolve(mockOctokit);
    },
  };

  // Configure auth response for the mock Octokit
  mockOctokit.withAuthResponse(() => ({
    token: "test-token",
    expiresAt: "2024-01-01T00:00:00Z",
  }));

  // deno-lint-ignore no-explicit-any
  const appStub = stub(deps, "App", () => mockAppWithCapture as any);

  try {
    const result = await getInstallationToken("12345", "test-key", "123");

    assertEquals(capturedInstallationId, 123);
    assertEquals(result.token, "test-token");
    assertEquals(result.expiresAt, "2024-01-01T00:00:00Z");
  } finally {
    appStub.restore();
  }
});

Deno.test("getInstallationToken - should throw error if response is invalid", async () => {
  const mockApp = createMockApp();
  const mockOctokit = createMockOctokit();
  mockOctokit.withAuthResponse(() => ({
    // Missing token field
    expiresAt: "2024-01-01T00:00:00Z",
    // deno-lint-ignore no-explicit-any
  } as any));

  mockApp.withInstallationOctokit(123, mockOctokit);

  const appStub = stub(deps, "App", () => mockApp);

  try {
    await assertRejects(
      async () => {
        await getInstallationToken("12345", "test-key", "123");
      },
      Error,
      "Invalid installation token response",
    );
  } finally {
    appStub.restore();
  }
});

Deno.test("getInstallation - should return installation information", async () => {
  const mockApp = createMockApp();
  const mockOctokit = createMockOctokit();
  const installationData: GitHubInstallation = {
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

  mockOctokit.withRequestResponse(() => ({
    data: installationData,
  }));

  mockApp.withInstallationOctokit(123, mockOctokit);

  const appStub = stub(deps, "App", () => mockApp);

  try {
    const result = await getInstallation("12345", "test-key", "123");

    assertEquals(result.id, 123);
    assertEquals(result.account.login, "test-user");
  } finally {
    appStub.restore();
  }
});

Deno.test("getInstallation - should throw error if response is invalid", async () => {
  const mockApp = createMockApp();
  const mockOctokit = createMockOctokit();
  mockOctokit.withRequestResponse(() => ({
    data: {
      // Missing required fields
      id: 123,
    },
  }));

  mockApp.withInstallationOctokit(123, mockOctokit);

  const appStub = stub(deps, "App", () => mockApp);

  try {
    await assertRejects(
      async () => {
        await getInstallation("12345", "test-key", "123");
      },
      Error,
      "Invalid installation data response",
    );
  } finally {
    appStub.restore();
  }
});

Deno.test("validateInstallationPermissions - should return valid when all permissions present", () => {
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

  const result = validateInstallationPermissions(installation);

  assertEquals(result.valid, true);
  assertEquals(result.missingPermissions.length, 0);
});

Deno.test("validateInstallationPermissions - should return invalid with missing contents:write", () => {
  const installation: GitHubInstallation = {
    id: 123,
    account: {
      login: "test-user",
      id: 456,
      avatar_url: "https://example.com/avatar.png",
    },
    permissions: {
      contents: "read", // Wrong permission level
      actions: "write",
      metadata: "read",
    },
  };

  const result = validateInstallationPermissions(installation);

  assertEquals(result.valid, false);
  assertEquals(result.missingPermissions.includes("contents:write"), true);
});

Deno.test("validateInstallationPermissions - should return invalid with missing actions:write", () => {
  const installation: GitHubInstallation = {
    id: 123,
    account: {
      login: "test-user",
      id: 456,
      avatar_url: "https://example.com/avatar.png",
    },
    permissions: {
      contents: "write",
      actions: "read", // Wrong permission level
      metadata: "read",
    },
  };

  const result = validateInstallationPermissions(installation);

  assertEquals(result.valid, false);
  assertEquals(result.missingPermissions.includes("actions:write"), true);
});

Deno.test("validateInstallationPermissions - should return invalid with missing metadata:read", () => {
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
      // metadata missing
    },
  };

  const result = validateInstallationPermissions(installation);

  assertEquals(result.valid, false);
  assertEquals(result.missingPermissions.includes("metadata:read"), true);
});

Deno.test("validateInstallationPermissions - should list all missing permissions", () => {
  const installation: GitHubInstallation = {
    id: 123,
    account: {
      login: "test-user",
      id: 456,
      avatar_url: "https://example.com/avatar.png",
    },
    permissions: {
      // All permissions missing
    },
  };

  const result = validateInstallationPermissions(installation);

  assertEquals(result.valid, false);
  assertEquals(result.missingPermissions.length, 3);
  assertEquals(result.missingPermissions.includes("contents:write"), true);
  assertEquals(result.missingPermissions.includes("actions:write"), true);
  assertEquals(result.missingPermissions.includes("metadata:read"), true);
});

Deno.test("checkInstallationPermissions - should return validation result for valid installation", async () => {
  const mockApp = createMockApp();
  const mockOctokit = createMockOctokit();
  const installationData: GitHubInstallation = {
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

  mockOctokit.withRequestResponse(() => ({
    data: installationData,
  }));

  mockApp.withInstallationOctokit(123, mockOctokit);

  const appStub = stub(deps, "App", () => mockApp);

  try {
    const result = await checkInstallationPermissions(
      "12345",
      "test-key",
      "123",
    );

    assertEquals(result.valid, true);
    assertEquals(result.missingPermissions.length, 0);
  } finally {
    appStub.restore();
  }
});

Deno.test("checkInstallationPermissions - should return invalid result when API call fails", async () => {
  const mockApp = createMockApp();
  const mockOctokit = createMockOctokit();

  mockOctokit.withRequestResponse(() => {
    throw new Error("API error");
  });

  mockApp.withInstallationOctokit(123, mockOctokit);

  const appStub = stub(deps, "App", () => mockApp);

  try {
    const result = await checkInstallationPermissions(
      "12345",
      "test-key",
      "123",
    );

    assertEquals(result.valid, false);
    assertEquals(result.missingPermissions.length, 3);
  } finally {
    appStub.restore();
  }
});

Deno.test("getInstallationRepos - should return list of repositories", async () => {
  const mockApp = createMockApp();
  const mockOctokit = createMockOctokit();
  const reposData = {
    total_count: 2,
    repositories: [
      {
        id: 1,
        name: "repo1",
        full_name: "user/repo1",
        owner: {
          login: "user",
          id: 123,
        },
      },
      {
        id: 2,
        name: "repo2",
        full_name: "user/repo2",
        owner: {
          login: "user",
          id: 123,
        },
      },
    ],
  };

  mockOctokit.withRequestResponse(() => ({
    data: reposData,
  }));

  mockApp.withInstallationOctokit(123, mockOctokit);

  const appStub = stub(deps, "App", () => mockApp);

  try {
    const result = await getInstallationRepos("12345", "test-key", "123");

    assertEquals(result.length, 2);
    assertEquals(result[0].name, "repo1");
  } finally {
    appStub.restore();
  }
});

Deno.test("getInstallationRepos - should throw error if response is invalid", async () => {
  const mockApp = createMockApp();
  const mockOctokit = createMockOctokit();
  mockOctokit.withRequestResponse(() => ({
    data: {
      // Missing total_count or repositories
      repositories: [],
    },
  }));

  mockApp.withInstallationOctokit(123, mockOctokit);

  const appStub = stub(deps, "App", () => mockApp);

  try {
    await assertRejects(
      async () => {
        await getInstallationRepos("12345", "test-key", "123");
      },
      Error,
      "Invalid installation repositories response",
    );
  } finally {
    appStub.restore();
  }
});
