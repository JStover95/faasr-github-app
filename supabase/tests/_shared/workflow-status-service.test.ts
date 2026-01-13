/**
 * Tests for workflow-status-service.ts
 */

import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import { WorkflowStatusService, deps } from "../../functions/_shared/workflow-status-service.ts";
import { GitHubClientService } from "../../functions/_shared/github-client.ts";
import { createMockOctokit } from "../test-utils.ts";
import type { UserSession } from "../../functions/_shared/types.ts";

Deno.test("getWorkflowStatus - should return workflow status for file", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowStatusService(mockGithubClient);

  const sanitizeStub = stub(deps, "sanitizeFileName", (name: string) => name);
  const getRunStub = stub(deps, "getWorkflowRunById", async () => ({
    id: 123,
    status: "success" as const,
    conclusion: "success",
    htmlUrl: "https://github.com/test/repo/actions/runs/123",
    createdAt: new Date("2024-01-01T00:00:00Z"),
  }));

  mockOctokit.withRestResponse("actions.listWorkflowRuns", () => ({
    data: {
      workflow_runs: [
        {
          id: 123,
          html_url: "https://github.com/test/repo/actions/runs/123",
        },
      ],
    },
  }));

  try {
    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      repoName: "test-repo",
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    const result = await service.getWorkflowStatus(session, "test-workflow.json");

    assertEquals(result.fileName, "test-workflow.json");
    assertEquals(result.status, "success");
    assertEquals(result.workflowRunId, 123);
  } finally {
    sanitizeStub.restore();
    getRunStub.restore();
  }
});

Deno.test("getWorkflowStatus - should sanitize file name", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowStatusService(mockGithubClient);

  let sanitizeCalled = false;
  const sanitizeStub = stub(deps, "sanitizeFileName", (name: string) => {
    sanitizeCalled = true;
    return "sanitized-workflow.json";
  });
  const getRunStub = stub(deps, "getWorkflowRunById", async () => ({
    id: 123,
    status: "success" as const,
    conclusion: "success",
    htmlUrl: "https://github.com/test/repo/actions/runs/123",
    createdAt: new Date("2024-01-01T00:00:00Z"),
  }));

  mockOctokit.withRestResponse("actions.listWorkflowRuns", () => ({
    data: {
      workflow_runs: [
        {
          id: 123,
          html_url: "https://github.com/test/repo/actions/runs/123",
        },
      ],
    },
  }));

  try {
    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      repoName: "test-repo",
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    await service.getWorkflowStatus(session, "../test-workflow.json");

    assertEquals(sanitizeCalled, true);
  } finally {
    sanitizeStub.restore();
    getRunStub.restore();
  }
});

Deno.test("getWorkflowStatus - should get most recent workflow run", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowStatusService(mockGithubClient);

  let capturedRunId: number | null = null;
  const sanitizeStub = stub(deps, "sanitizeFileName", (name: string) => name);
  const getRunStub = stub(deps, "getWorkflowRunById", async (octokit: unknown, owner: string, repo: string, runId: number) => {
    capturedRunId = runId;
    return {
      id: runId,
      status: "success" as const,
      conclusion: "success",
      htmlUrl: "https://github.com/test/repo/actions/runs/123",
      createdAt: new Date("2024-01-01T00:00:00Z"),
    };
  });

  mockOctokit.withRestResponse("actions.listWorkflowRuns", () => ({
    data: {
      workflow_runs: [
        {
          id: 123,
          html_url: "https://github.com/test/repo/actions/runs/123",
        },
      ],
    },
  }));

  try {
    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      repoName: "test-repo",
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    await service.getWorkflowStatus(session, "test-workflow.json");

    assertEquals(capturedRunId, 123);
  } finally {
    sanitizeStub.restore();
    getRunStub.restore();
  }
});

Deno.test("getWorkflowStatus - should return formatted status result", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowStatusService(mockGithubClient);

  const sanitizeStub = stub(deps, "sanitizeFileName", (name: string) => name);
  const createdAt = new Date("2024-01-01T00:00:00Z");
  const getRunStub = stub(deps, "getWorkflowRunById", async () => ({
    id: 123,
    status: "success" as const,
    conclusion: "success",
    htmlUrl: "https://github.com/test/repo/actions/runs/123",
    createdAt,
  }));

  mockOctokit.withRestResponse("actions.listWorkflowRuns", () => ({
    data: {
      workflow_runs: [
        {
          id: 123,
          html_url: "https://github.com/test/repo/actions/runs/123",
        },
      ],
    },
  }));

  try {
    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      repoName: "test-repo",
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    const result = await service.getWorkflowStatus(session, "test-workflow.json");

    assertEquals(result.fileName, "test-workflow.json");
    assertEquals(result.status, "success");
    assertEquals(result.workflowRunId, 123);
    assertEquals(result.workflowRunUrl, "https://github.com/test/repo/actions/runs/123");
    assertEquals(result.triggeredAt, createdAt.toISOString());
    assertEquals(result.completedAt !== null, true);
  } finally {
    sanitizeStub.restore();
    getRunStub.restore();
  }
});

Deno.test("getWorkflowStatus - should include error message for failed status", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowStatusService(mockGithubClient);

  const sanitizeStub = stub(deps, "sanitizeFileName", (name: string) => name);
  const getRunStub = stub(deps, "getWorkflowRunById", async () => ({
    id: 123,
    status: "failed" as const,
    conclusion: "failure",
    htmlUrl: "https://github.com/test/repo/actions/runs/123",
    createdAt: new Date("2024-01-01T00:00:00Z"),
  }));

  mockOctokit.withRestResponse("actions.listWorkflowRuns", () => ({
    data: {
      workflow_runs: [
        {
          id: 123,
          html_url: "https://github.com/test/repo/actions/runs/123",
        },
      ],
    },
  }));

  try {
    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      repoName: "test-repo",
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    const result = await service.getWorkflowStatus(session, "test-workflow.json");

    assertEquals(result.status, "failed");
    assertEquals(result.errorMessage !== null, true);
  } finally {
    sanitizeStub.restore();
    getRunStub.restore();
  }
});

Deno.test("getWorkflowStatus - should throw error when repo name missing", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowStatusService(mockGithubClient);

  try {
    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      // repoName missing
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    await assertRejects(
      async () => {
        await service.getWorkflowStatus(session, "test-workflow.json");
      },
      Error,
      "Repository name not found",
    );
  } finally {
    // No stubs to restore
  }
});

Deno.test("getWorkflowStatus - should throw error when no workflow runs found", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowStatusService(mockGithubClient);

  const sanitizeStub = stub(deps, "sanitizeFileName", (name: string) => name);

  mockOctokit.withRestResponse("actions.listWorkflowRuns", () => ({
    data: {
      workflow_runs: [],
    },
  }));

  try {
    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      repoName: "test-repo",
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    await assertRejects(
      async () => {
        await service.getWorkflowStatus(session, "test-workflow.json");
      },
      Error,
      "Workflow run not found",
    );
  } finally {
    sanitizeStub.restore();
  }
});
