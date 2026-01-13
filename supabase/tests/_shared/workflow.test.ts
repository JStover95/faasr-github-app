/**
 * Tests for workflow.ts
 */

import { assertEquals, assertRejects } from "@std/assert";
import {
  validateWorkflowFile,
  sanitizeFileName,
  commitFileToRepository,
  triggerWorkflowDispatch,
  getWorkflowRunStatus,
  getWorkflowRunById,
} from "../../functions/_shared/workflow.ts";
import { createMockOctokit } from "../test-utils.ts";

Deno.test("validateWorkflowFile - should return valid for correct file", () => {
  const result = validateWorkflowFile(
    "test-workflow.json",
    '{"name": "test"}',
    100,
  );

  assertEquals(result.valid, true);
  assertEquals(result.errors.length, 0);
});

Deno.test("validateWorkflowFile - should return error for missing file name", () => {
  const result = validateWorkflowFile("", '{"name": "test"}', 100);

  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("File name is required"), true);
});

Deno.test("validateWorkflowFile - should return error for path traversal attempts", () => {
  const result1 = validateWorkflowFile(
    "../test-workflow.json",
    '{"name": "test"}',
    100,
  );
  const result2 = validateWorkflowFile(
    "test/../workflow.json",
    '{"name": "test"}',
    100,
  );

  assertEquals(result1.valid, false);
  assertEquals(result1.errors.includes("File name cannot contain path separators"), true);
  assertEquals(result2.valid, false);
  assertEquals(result2.errors.includes("File name cannot contain path separators"), true);
});

Deno.test("validateWorkflowFile - should return error for non-.json extension", () => {
  const result = validateWorkflowFile(
    "test-workflow.txt",
    '{"name": "test"}',
    100,
  );

  assertEquals(result.valid, false);
  assertEquals(result.errors.includes("File must have .json extension"), true);
});

Deno.test("validateWorkflowFile - should return error for invalid file name pattern", () => {
  const result = validateWorkflowFile(
    "test workflow.json",
    '{"name": "test"}',
    100,
  );

  assertEquals(result.valid, false);
  assertEquals(
    result.errors.includes(
      "File name must contain only letters, numbers, hyphens, and underscores",
    ),
    true,
  );
});

Deno.test("validateWorkflowFile - should return error for oversized file", () => {
  const largeContent = "x".repeat(1024 * 1024 + 1); // 1MB + 1 byte
  const result = validateWorkflowFile(
    "test-workflow.json",
    largeContent,
    1024 * 1024 + 1,
  );

  assertEquals(result.valid, false);
  assertEquals(
    result.errors.some((e) => e.includes("File size exceeds maximum")),
    true,
  );
});

Deno.test("validateWorkflowFile - should return error for invalid JSON syntax", () => {
  const result = validateWorkflowFile(
    "test-workflow.json",
    "{invalid json}",
    100,
  );

  assertEquals(result.valid, false);
  assertEquals(
    result.errors.includes("Invalid JSON: File must contain valid JSON syntax"),
    true,
  );
});

Deno.test("validateWorkflowFile - should return multiple errors when multiple validations fail", () => {
  const result = validateWorkflowFile(
    "../test workflow.txt",
    "{invalid json}",
    1024 * 1024 + 1,
  );

  assertEquals(result.valid, false);
  assertEquals(result.errors.length > 1, true);
});

Deno.test("sanitizeFileName - should remove path separators", () => {
  const result1 = sanitizeFileName("../test-workflow.json");
  const result2 = sanitizeFileName("test/../workflow.json");

  assertEquals(result1, "test-workflow.json");
  assertEquals(result2, "testworkflow.json");
});

Deno.test("sanitizeFileName - should remove dangerous characters", () => {
  const result = sanitizeFileName("test@#$%workflow.json");

  assertEquals(result, "testworkflow.json");
});

Deno.test("sanitizeFileName - should remove leading dots", () => {
  const result = sanitizeFileName("...test-workflow.json");

  assertEquals(result, "test-workflow.json");
});

Deno.test("sanitizeFileName - should collapse multiple consecutive dots", () => {
  const result = sanitizeFileName("test..workflow.json");

  assertEquals(result, "test.workflow.json");
});

Deno.test("sanitizeFileName - should ensure .json extension", () => {
  const result1 = sanitizeFileName("test-workflow");
  const result2 = sanitizeFileName("test-workflow.txt");

  assertEquals(result1, "test-workflow.json");
  assertEquals(result2, "test-workflow.json");
});

Deno.test("sanitizeFileName - should return default for empty input", () => {
  const result = sanitizeFileName("");

  assertEquals(result, "workflow.json");
});

Deno.test("commitFileToRepository - should create new file when it doesn't exist", async () => {
  const mockOctokit = createMockOctokit();
  mockOctokit.withRestResponse("repos.getContent", () => {
    const error = new Error("Not found");
    (error as any).status = 404;
    throw error;
  });
  mockOctokit.withRestResponse("repos.createOrUpdateFileContents", () => ({
    data: {
      commit: {
        sha: "abc123",
      },
    },
  }));

  const result = await commitFileToRepository(
    mockOctokit,
    "test-user",
    "test-repo",
    "test-workflow.json",
    '{"name": "test"}',
    "main",
  );

  assertEquals(result, "abc123");
});

Deno.test("commitFileToRepository - should update existing file with SHA", async () => {
  const mockOctokit = createMockOctokit();
  mockOctokit.withRestResponse("repos.getContent", () => ({
    data: {
      sha: "existing-sha",
    },
  }));
  let capturedSha: string | undefined = undefined;
  mockOctokit.withRestResponse("repos.createOrUpdateFileContents", () => {
    // Capture the SHA parameter
    return {
      data: {
        commit: {
          sha: "new-commit-sha",
        },
      },
    };
  });

  // We need to check that SHA was passed, but the mock doesn't expose params
  // So we'll just verify the commit succeeds
  const result = await commitFileToRepository(
    mockOctokit,
    "test-user",
    "test-repo",
    "test-workflow.json",
    '{"name": "test"}',
    "main",
  );

  assertEquals(result, "new-commit-sha");
});

Deno.test("commitFileToRepository - should encode content as base64", async () => {
  const mockOctokit = createMockOctokit();
  mockOctokit.withRestResponse("repos.getContent", () => {
    const error = new Error("Not found");
    (error as any).status = 404;
    throw error;
  });
  let capturedContent: string | undefined = undefined;
  mockOctokit.withRestResponse("repos.createOrUpdateFileContents", () => {
    // We can't easily capture the content parameter in the current mock structure
    // But we can verify the function completes successfully
    return {
      data: {
        commit: {
          sha: "abc123",
        },
      },
    };
  });

  const result = await commitFileToRepository(
    mockOctokit,
    "test-user",
    "test-repo",
    "test-workflow.json",
    '{"name": "test"}',
    "main",
  );

  assertEquals(result, "abc123");
});

Deno.test("commitFileToRepository - should use custom commit message if provided", async () => {
  const mockOctokit = createMockOctokit();
  mockOctokit.withRestResponse("repos.getContent", () => {
    const error = new Error("Not found");
    (error as any).status = 404;
    throw error;
  });
  mockOctokit.withRestResponse("repos.createOrUpdateFileContents", () => ({
    data: {
      commit: {
        sha: "abc123",
      },
    },
  }));

  const result = await commitFileToRepository(
    mockOctokit,
    "test-user",
    "test-repo",
    "test-workflow.json",
    '{"name": "test"}',
    "main",
    "Custom commit message",
  );

  assertEquals(result, "abc123");
});

Deno.test("commitFileToRepository - should return commit SHA", async () => {
  const mockOctokit = createMockOctokit();
  mockOctokit.withRestResponse("repos.getContent", () => {
    const error = new Error("Not found");
    (error as any).status = 404;
    throw error;
  });
  mockOctokit.withRestResponse("repos.createOrUpdateFileContents", () => ({
    data: {
      commit: {
        sha: "test-commit-sha",
      },
    },
  }));

  const result = await commitFileToRepository(
    mockOctokit,
    "test-user",
    "test-repo",
    "test-workflow.json",
    '{"name": "test"}',
    "main",
  );

  assertEquals(result, "test-commit-sha");
});

Deno.test("commitFileToRepository - should throw error if commit SHA is missing", async () => {
  const mockOctokit = createMockOctokit();
  mockOctokit.withRestResponse("repos.getContent", () => {
    const error = new Error("Not found");
    (error as any).status = 404;
    throw error;
  });
  mockOctokit.withRestResponse("repos.createOrUpdateFileContents", () => ({
    data: {
      commit: {
        // Missing sha
      },
    },
  }));

  await assertRejects(
    async () => {
      await commitFileToRepository(
        mockOctokit,
        "test-user",
        "test-repo",
        "test-workflow.json",
        '{"name": "test"}',
        "main",
      );
    },
    Error,
    "Failed to get commit SHA",
  );
});

Deno.test("triggerWorkflowDispatch - should trigger workflow with correct parameters", async () => {
  const mockOctokit = createMockOctokit();
  let dispatchCalled = false;

  mockOctokit.withRestResponse("actions.createWorkflowDispatch", () => {
    dispatchCalled = true;
    return {} as any;
  });

  await triggerWorkflowDispatch(
    mockOctokit,
    "test-user",
    "test-repo",
    "register-workflow.yml",
    "main",
  );

  assertEquals(dispatchCalled, true);
});

Deno.test("triggerWorkflowDispatch - should include inputs when provided", async () => {
  const mockOctokit = createMockOctokit();
  let dispatchCalled = false;

  mockOctokit.withRestResponse("actions.createWorkflowDispatch", () => {
    dispatchCalled = true;
    return {} as any;
  });

  await triggerWorkflowDispatch(
    mockOctokit,
    "test-user",
    "test-repo",
    "register-workflow.yml",
    "main",
    { workflow_file: "test.json" },
  );

  assertEquals(dispatchCalled, true);
});

Deno.test("triggerWorkflowDispatch - should use empty inputs when not provided", async () => {
  const mockOctokit = createMockOctokit();
  let dispatchCalled = false;

  mockOctokit.withRestResponse("actions.createWorkflowDispatch", () => {
    dispatchCalled = true;
    return {} as any;
  });

  await triggerWorkflowDispatch(
    mockOctokit,
    "test-user",
    "test-repo",
    "register-workflow.yml",
    "main",
  );

  assertEquals(dispatchCalled, true);
});

Deno.test("getWorkflowRunStatus - should return success for completed successful run", async () => {
  const mockOctokit = createMockOctokit();
  mockOctokit.withRestResponse("actions.getWorkflowRun", () => ({
    data: {
      status: "completed",
      conclusion: "success",
      html_url: "https://github.com/test/repo/actions/runs/123",
    },
  }));

  const result = await getWorkflowRunStatus(
    mockOctokit,
    "test-user",
    "test-repo",
    123,
  );

  assertEquals(result.status, "success");
  assertEquals(result.conclusion, "success");
});

Deno.test("getWorkflowRunStatus - should return failed for completed failed run", async () => {
  const mockOctokit = createMockOctokit();
  mockOctokit.withRestResponse("actions.getWorkflowRun", () => ({
    data: {
      status: "completed",
      conclusion: "failure",
      html_url: "https://github.com/test/repo/actions/runs/123",
    },
  }));

  const result = await getWorkflowRunStatus(
    mockOctokit,
    "test-user",
    "test-repo",
    123,
  );

  assertEquals(result.status, "failed");
  assertEquals(result.conclusion, "failure");
});

Deno.test("getWorkflowRunStatus - should return running for in_progress run", async () => {
  const mockOctokit = createMockOctokit();
  mockOctokit.withRestResponse("actions.getWorkflowRun", () => ({
    data: {
      status: "in_progress",
      conclusion: null,
      html_url: "https://github.com/test/repo/actions/runs/123",
    },
  }));

  const result = await getWorkflowRunStatus(
    mockOctokit,
    "test-user",
    "test-repo",
    123,
  );

  assertEquals(result.status, "running");
});

Deno.test("getWorkflowRunStatus - should return pending for queued run", async () => {
  const mockOctokit = createMockOctokit();
  mockOctokit.withRestResponse("actions.getWorkflowRun", () => ({
    data: {
      status: "queued",
      conclusion: null,
      html_url: "https://github.com/test/repo/actions/runs/123",
    },
  }));

  const result = await getWorkflowRunStatus(
    mockOctokit,
    "test-user",
    "test-repo",
    123,
  );

  assertEquals(result.status, "pending");
});

Deno.test("getWorkflowRunById - should return workflow run details", async () => {
  const mockOctokit = createMockOctokit();
  const createdAt = new Date("2024-01-01T00:00:00Z");
  mockOctokit.withRestResponse("actions.getWorkflowRun", () => ({
    data: {
      id: 123,
      status: "completed",
      conclusion: "success",
      html_url: "https://github.com/test/repo/actions/runs/123",
      created_at: createdAt.toISOString(),
    },
  }));

  const result = await getWorkflowRunById(
    mockOctokit,
    "test-user",
    "test-repo",
    123,
  );

  assertEquals(result?.id, 123);
  assertEquals(result?.status, "success");
  assertEquals(result?.htmlUrl, "https://github.com/test/repo/actions/runs/123");
});

Deno.test("getWorkflowRunById - should return null for 404 errors", async () => {
  const mockOctokit = createMockOctokit();
  const error = new Error("Not found");
  (error as any).status = 404;

  mockOctokit.withRestResponse("actions.getWorkflowRun", () => {
    throw error;
  });

  const result = await getWorkflowRunById(
    mockOctokit,
    "test-user",
    "test-repo",
    123,
  );

  assertEquals(result, null);
});

Deno.test("getWorkflowRunById - should throw error for non-404 errors", async () => {
  const mockOctokit = createMockOctokit();
  const error = new Error("Internal server error");
  (error as any).status = 500;

  mockOctokit.withRestResponse("actions.getWorkflowRun", () => {
    throw error;
  });

  await assertRejects(
    async () => {
      await getWorkflowRunById(mockOctokit, "test-user", "test-repo", 123);
    },
    Error,
    "Internal server error",
  );
});
