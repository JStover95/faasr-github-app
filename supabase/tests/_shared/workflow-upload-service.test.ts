/**
 * Tests for workflow-upload-service.ts
 */

import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import { WorkflowUploadService, deps } from "../../functions/_shared/workflow-upload-service.ts";
import { GitHubClientService } from "../../functions/_shared/github-client.ts";
import { createMockOctokit } from "../test-utils.ts";
import type { UserSession } from "../../functions/_shared/types.ts";

Deno.test("validateFile - should return valid for correct file", () => {
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => createMockOctokit(),
  } as any;

  const service = new WorkflowUploadService(mockGithubClient);

  const result = service.validateFile(
    "test-workflow.json",
    '{"name": "test"}',
    100,
  );

  assertEquals(result.valid, true);
  assertEquals(result.sanitizedFileName, "test-workflow.json");
  assertEquals(result.errors.length, 0);
});

Deno.test("validateFile - should return sanitized file name", () => {
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => createMockOctokit(),
  } as any;

  const service = new WorkflowUploadService(mockGithubClient);

  const result = service.validateFile(
    "../test-workflow.json",
    '{"name": "test"}',
    100,
  );

  assertEquals(result.sanitizedFileName, "test-workflow.json");
});

Deno.test("validateFile - should return errors for invalid file", () => {
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => createMockOctokit(),
  } as any;

  const service = new WorkflowUploadService(mockGithubClient);

  const result = service.validateFile(
    "test-workflow.txt",
    "{invalid json}",
    1024 * 1024 + 1,
  );

  assertEquals(result.valid, false);
  assertEquals(result.errors.length > 0, true);
});

Deno.test("uploadWorkflow - should upload valid workflow file", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowUploadService(mockGithubClient);

  const validateStub = stub(deps, "validateWorkflowFile", () => ({
    valid: true,
    errors: [],
  }));
  const sanitizeStub = stub(deps, "sanitizeFileName", (name: string) => name);
  const commitStub = stub(deps, "commitFileToRepository", async () => "abc123");

  try {
    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      repoName: "test-repo",
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    const file = new File(['{"name": "test"}'], "test-workflow.json", {
      type: "application/json",
    });

    const result = await service.uploadWorkflow(session, file, "test-workflow.json");

    assertEquals(result.fileName, "test-workflow.json");
    assertEquals(result.commitSha, "abc123");
  } finally {
    validateStub.restore();
    sanitizeStub.restore();
    commitStub.restore();
  }
});

Deno.test("uploadWorkflow - should return commit SHA and sanitized file name", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowUploadService(mockGithubClient);

  const validateStub = stub(deps, "validateWorkflowFile", () => ({
    valid: true,
    errors: [],
  }));
  const sanitizeStub = stub(deps, "sanitizeFileName", () => "sanitized-workflow.json");
  const commitStub = stub(deps, "commitFileToRepository", async () => "def456");

  try {
    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      repoName: "test-repo",
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    const file = new File(['{"name": "test"}'], "test-workflow.json", {
      type: "application/json",
    });

    const result = await service.uploadWorkflow(session, file, "test-workflow.json");

    assertEquals(result.fileName, "sanitized-workflow.json");
    assertEquals(result.commitSha, "def456");
  } finally {
    validateStub.restore();
    sanitizeStub.restore();
    commitStub.restore();
  }
});

Deno.test("uploadWorkflow - should throw error for invalid file", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowUploadService(mockGithubClient);

  const validateStub = stub(deps, "validateWorkflowFile", () => ({
    valid: false,
    errors: ["Invalid JSON"],
  }));
  const sanitizeStub = stub(deps, "sanitizeFileName", (name: string) => name);

  try {
    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      repoName: "test-repo",
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    const file = new File(['{"name": "test"}'], "test-workflow.json", {
      type: "application/json",
    });

    await assertRejects(
      async () => {
        await service.uploadWorkflow(session, file, "test-workflow.json");
      },
      Error,
      "Invalid file",
    );
  } finally {
    validateStub.restore();
    sanitizeStub.restore();
  }
});

Deno.test("uploadWorkflow - should throw error when repo name missing", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowUploadService(mockGithubClient);

  try {
    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      // repoName missing
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    const file = new File(['{"name": "test"}'], "test-workflow.json", {
      type: "application/json",
    });

    await assertRejects(
      async () => {
        await service.uploadWorkflow(session, file, "test-workflow.json");
      },
      Error,
      "Repository name not found",
    );
  } finally {
    // No stubs to restore
  }
});

Deno.test("uploadWorkflow - should validate file before upload", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowUploadService(mockGithubClient);

  let validateCalled = false;
  const validateStub = stub(deps, "validateWorkflowFile", () => {
    validateCalled = true;
    return {
      valid: true,
      errors: [],
    };
  });
  const sanitizeStub = stub(deps, "sanitizeFileName", (name: string) => name);
  const commitStub = stub(deps, "commitFileToRepository", async () => "abc123");

  try {
    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      repoName: "test-repo",
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    const file = new File(['{"name": "test"}'], "test-workflow.json", {
      type: "application/json",
    });

    await service.uploadWorkflow(session, file, "test-workflow.json");

    assertEquals(validateCalled, true);
  } finally {
    validateStub.restore();
    sanitizeStub.restore();
    commitStub.restore();
  }
});

Deno.test("uploadWorkflow - should commit to correct repository", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowUploadService(mockGithubClient);

  let capturedOwner: string | null = null;
  let capturedRepo: string | null = null;

  const validateStub = stub(deps, "validateWorkflowFile", () => ({
    valid: true,
    errors: [],
  }));
  const sanitizeStub = stub(deps, "sanitizeFileName", (name: string) => name);
  const commitStub = stub(
    deps,
    "commitFileToRepository",
    async (octokit: unknown, owner: string, repo: string) => {
      capturedOwner = owner;
      capturedRepo = repo;
      return "abc123";
    },
  );

  try {
    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      repoName: "test-repo",
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    const file = new File(['{"name": "test"}'], "test-workflow.json", {
      type: "application/json",
    });

    await service.uploadWorkflow(session, file, "test-workflow.json");

    assertEquals(capturedOwner, "test-user");
    assertEquals(capturedRepo, "test-repo");
  } finally {
    validateStub.restore();
    sanitizeStub.restore();
    commitStub.restore();
  }
});

Deno.test("triggerRegistration - should trigger workflow dispatch", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowUploadService(mockGithubClient);

  let dispatchCalled = false;
  const dispatchStub = stub(deps, "triggerWorkflowDispatch", async () => {
    dispatchCalled = true;
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

    await service.triggerRegistration(session, "test-workflow.json");

    assertEquals(dispatchCalled, true);
  } finally {
    dispatchStub.restore();
  }
});

Deno.test("triggerRegistration - should return workflow run ID when available", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowUploadService(mockGithubClient);

  const dispatchStub = stub(deps, "triggerWorkflowDispatch", async () => {});

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

    const result = await service.triggerRegistration(session, "test-workflow.json");

    assertEquals(result.workflowRunId, 123);
    assertEquals(result.workflowRunUrl, "https://github.com/test/repo/actions/runs/123");
  } finally {
    dispatchStub.restore();
  }
});

Deno.test("triggerRegistration - should return undefined when run ID not available", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowUploadService(mockGithubClient);

  const dispatchStub = stub(deps, "triggerWorkflowDispatch", async () => {});

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

    const result = await service.triggerRegistration(session, "test-workflow.json");

    assertEquals(result.workflowRunId, undefined);
    assertEquals(result.workflowRunUrl, undefined);
  } finally {
    dispatchStub.restore();
  }
});

Deno.test("triggerRegistration - should log error but succeed when dispatch fails", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowUploadService(mockGithubClient);

  const dispatchStub = stub(deps, "triggerWorkflowDispatch", async () => {
    throw new Error("Dispatch failed");
  });

  try {
    const session: UserSession = {
      installationId: "123",
      userLogin: "test-user",
      userId: 456,
      repoName: "test-repo",
      createdAt: new Date(),
      expiresAt: new Date(),
    };

    // Should not throw, but return undefined
    const result = await service.triggerRegistration(session, "test-workflow.json");

    assertEquals(result.workflowRunId, undefined);
    assertEquals(result.workflowRunUrl, undefined);
  } finally {
    dispatchStub.restore();
  }
});

Deno.test("triggerRegistration - should throw error when repo name missing", async () => {
  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  } as any;

  const service = new WorkflowUploadService(mockGithubClient);

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
        await service.triggerRegistration(session, "test-workflow.json");
      },
      Error,
      "Repository name not found",
    );
  } finally {
    // No stubs to restore
  }
});
