/**
 * Tests for github-client.ts
 */

import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  deps,
  GitHubClientService,
} from "../../functions/_shared/github-client.ts";
import { createMockOctokit } from "../test-utils.ts";
import type { UserSession } from "../../functions/_shared/types.ts";

Deno.test("getAuthenticatedOctokit - should return authenticated Octokit instance", async () => {
  const mockOctokit = createMockOctokit();
  const getInstallationTokenStub = stub(
    deps,
    "getInstallationToken",
    async () => (await Promise.resolve({
      token: "test-token",
      expiresAt: "2024-01-01T00:00:00Z",
    })),
  );
  const octokitStub = stub(deps, "Octokit", () => mockOctokit);

  try {
    const service = new GitHubClientService({
      appId: "12345",
      privateKey: "test-key",
    });

    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    const result = await service.getAuthenticatedOctokit(session);

    assertEquals(result, mockOctokit);
  } finally {
    getInstallationTokenStub.restore();
    octokitStub.restore();
  }
});

Deno.test("getAuthenticatedOctokit - should call getInstallationToken with correct credentials", async () => {
  const mockOctokit = createMockOctokit();
  let capturedAppId: string | null = null;
  let capturedPrivateKey: string | null = null;
  let capturedInstallationId: string | null = null;

  const getInstallationTokenStub = stub(
    deps,
    "getInstallationToken",
    async (appId: string, privateKey: string, installationId: string) => {
      capturedAppId = appId;
      capturedPrivateKey = privateKey;
      capturedInstallationId = installationId;
      return await Promise.resolve({
        token: "test-token",
        expiresAt: "2024-01-01T00:00:00Z",
      });
    },
  );
  const octokitStub = stub(deps, "Octokit", () => mockOctokit);

  try {
    const service = new GitHubClientService({
      appId: "12345",
      privateKey: "test-key",
    });

    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    await service.getAuthenticatedOctokit(session);

    assertEquals(capturedAppId, "12345");
    assertEquals(capturedPrivateKey, "test-key");
    assertEquals(capturedInstallationId, "123");
  } finally {
    getInstallationTokenStub.restore();
    octokitStub.restore();
  }
});

Deno.test("getAuthenticatedOctokit - should create Octokit with installation token", async () => {
  const mockOctokit = createMockOctokit();
  let capturedAuth: string | null = null;

  const getInstallationTokenStub = stub(
    deps,
    "getInstallationToken",
    async () => (await Promise.resolve({
      token: "test-token",
      expiresAt: "2024-01-01T00:00:00Z",
    })),
  );
  // deno-lint-ignore no-explicit-any
  const octokitStub = stub(deps, "Octokit", (config: any) => {
    capturedAuth = config.auth || null;
    return mockOctokit;
  });

  try {
    const service = new GitHubClientService({
      appId: "12345",
      privateKey: "test-key",
    });

    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    await service.getAuthenticatedOctokit(session);

    assertEquals(capturedAuth, "test-token");
  } finally {
    getInstallationTokenStub.restore();
    octokitStub.restore();
  }
});

Deno.test("getAuthenticatedOctokit - should throw error when authentication fails", async () => {
  const getInstallationTokenStub = stub(
    deps,
    "getInstallationToken",
    async () => {
      // deno-lint-ignore no-explicit-any
      return await Promise.reject(new Error("Authentication failed")) as any;
    },
  );

  try {
    const service = new GitHubClientService({
      appId: "12345",
      privateKey: "test-key",
    });

    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    await assertRejects(
      async () => {
        await service.getAuthenticatedOctokit(session);
      },
      Error,
      "Authentication failed",
    );
  } finally {
    getInstallationTokenStub.restore();
  }
});
