/**
 * Tests for workflows/handler.ts
 */

import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  getUserSession,
  parseFormData,
  handleUpload,
  handleStatus,
  handler,
  deps,
} from "../../functions/workflows/handler.ts";
import {
  createMockSupabaseClient,
  createMockOctokit,
  saveEnvState,
  restoreEnvState,
} from "../test-utils.ts";
import type { UserSession } from "../../functions/_shared/types.ts";

Deno.test("getUserSession - should return user session from Supabase", async () => {
  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: { id: "user-123" } },
    error: null,
  });
  mockSupabase.withRpcResponse("get_gh_installation", () => ({
    data: [
      {
        gh_installation_id: "123",
        gh_user_login: "test-user",
        gh_user_id: 456,
        gh_avatar_url: "https://example.com/avatar.png",
        gh_repo_name: "test-repo",
      },
    ],
    error: null,
  }));

  const createSupabaseStub = stub(deps, "createSupabaseClient", () => mockSupabase);
  (mockSupabase as any).rpc = async (fn: string, args: unknown) => {
    return mockSupabase.rpc(fn, args);
  };

  try {
    const session = await getUserSession();

    assertEquals(session?.installationId, "123");
    assertEquals(session?.userLogin, "test-user");
    assertEquals(session?.userId, 456);
    assertEquals(session?.repoName, "test-repo");
  } finally {
    createSupabaseStub.restore();
  }
});

Deno.test("getUserSession - should return null when user not authenticated", async () => {
  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: null },
    error: new Error("Not authenticated"),
  });

  const createSupabaseStub = stub(deps, "createSupabaseClient", () => mockSupabase);

  try {
    const session = await getUserSession();

    assertEquals(session, null);
  } finally {
    createSupabaseStub.restore();
  }
});

Deno.test("getUserSession - should return null when installation not found", async () => {
  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: { id: "user-123" } },
    error: null,
  });
  mockSupabase.withRpcResponse("get_gh_installation", () => ({
    data: null,
    error: new Error("Not found"),
  }));

  const createSupabaseStub = stub(deps, "createSupabaseClient", () => mockSupabase);
  (mockSupabase as any).rpc = async (fn: string, args: unknown) => {
    return mockSupabase.rpc(fn, args);
  };

  try {
    const session = await getUserSession();

    assertEquals(session, null);
  } finally {
    createSupabaseStub.restore();
  }
});

Deno.test("getUserSession - should return null when installation data incomplete", async () => {
  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: { id: "user-123" } },
    error: null,
  });
  mockSupabase.withRpcResponse("get_gh_installation", () => ({
    data: [
      {
        // Missing required fields
        gh_user_id: 456,
      },
    ],
    error: null,
  }));

  const createSupabaseStub = stub(deps, "createSupabaseClient", () => mockSupabase);
  (mockSupabase as any).rpc = async (fn: string, args: unknown) => {
    return mockSupabase.rpc(fn, args);
  };

  try {
    const session = await getUserSession();

    assertEquals(session, null);
  } finally {
    createSupabaseStub.restore();
  }
});

Deno.test("parseFormData - should parse file from FormData", async () => {
  const formData = new FormData();
  const file = new File(['{"name": "test"}'], "test-workflow.json", {
    type: "application/json",
  });
  formData.append("file", file);

  const request = new Request("https://example.com/upload", {
    method: "POST",
    body: formData,
  });

  const result = await parseFormData(request);

  assertEquals(result.file !== null, true);
  assertEquals(result.fileName, "test-workflow.json");
});

Deno.test("parseFormData - should extract file name", async () => {
  const formData = new FormData();
  const file = new File(['{"name": "test"}'], "my-workflow.json", {
    type: "application/json",
  });
  formData.append("file", file);

  const request = new Request("https://example.com/upload", {
    method: "POST",
    body: formData,
  });

  const result = await parseFormData(request);

  assertEquals(result.fileName, "my-workflow.json");
});

Deno.test("parseFormData - should return null when file missing", async () => {
  const formData = new FormData();

  const request = new Request("https://example.com/upload", {
    method: "POST",
    body: formData,
  });

  const result = await parseFormData(request);

  assertEquals(result.file, null);
  assertEquals(result.fileName, null);
});

Deno.test("handleUpload - should upload workflow file successfully", async () => {
  const savedEnv = saveEnvState(["FRONTEND_URL"]);

  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: { id: "user-123" } },
    error: null,
  });
  mockSupabase.withRpcResponse("get_gh_installation", () => ({
    data: [
      {
        gh_installation_id: "123",
        gh_user_login: "test-user",
        gh_user_id: 456,
        gh_repo_name: "test-repo",
      },
    ],
    error: null,
  }));

  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  };
  const mockUploadService = {
    uploadWorkflow: async () => ({
      fileName: "test-workflow.json",
      commitSha: "abc123",
    }),
    triggerRegistration: async () => ({
      workflowRunId: 123,
      workflowRunUrl: "https://github.com/test/repo/actions/runs/123",
    }),
  };

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
    frontendUrl: "https://frontend.example.com",
  }));
  const createSupabaseStub = stub(deps, "createSupabaseClient", () => mockSupabase);
  const githubClientStub = stub(deps, "GitHubClientService", () => mockGithubClient);
  const uploadServiceStub = stub(deps, "WorkflowUploadService", () => mockUploadService);
  (mockSupabase as any).rpc = async (fn: string, args: unknown) => {
    return mockSupabase.rpc(fn, args);
  };

  try {
    const formData = new FormData();
    const file = new File(['{"name": "test"}'], "test-workflow.json", {
      type: "application/json",
    });
    formData.append("file", file);

    const request = new Request("https://example.com/workflows/upload", {
      method: "POST",
      body: formData,
    });

    const response = await handleUpload(request);
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.success, true);
    assertEquals(body.fileName, "test-workflow.json");
    assertEquals(body.commitSha, "abc123");
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
    githubClientStub.restore();
    uploadServiceStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handleUpload - should return 401 when not authenticated", async () => {
  const savedEnv = saveEnvState(["FRONTEND_URL"]);

  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: null },
    error: new Error("Not authenticated"),
  });

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
    frontendUrl: "https://frontend.example.com",
  }));
  const createSupabaseStub = stub(deps, "createSupabaseClient", () => mockSupabase);

  try {
    const request = new Request("https://example.com/workflows/upload", {
      method: "POST",
    });

    const response = await handleUpload(request);
    const body = await response.json();

    assertEquals(response.status, 401);
    assertEquals(body.success, false);
    assertEquals(body.error, "Authentication required");
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handleUpload - should return 400 when file missing", async () => {
  const savedEnv = saveEnvState(["FRONTEND_URL"]);

  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: { id: "user-123" } },
    error: null,
  });
  mockSupabase.withRpcResponse("get_gh_installation", () => ({
    data: [
      {
        gh_installation_id: "123",
        gh_user_login: "test-user",
        gh_user_id: 456,
        gh_repo_name: "test-repo",
      },
    ],
    error: null,
  }));

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
    frontendUrl: "https://frontend.example.com",
  }));
  const createSupabaseStub = stub(deps, "createSupabaseClient", () => mockSupabase);
  (mockSupabase as any).rpc = async (fn: string, args: unknown) => {
    return mockSupabase.rpc(fn, args);
  };

  try {
    const formData = new FormData();
    const request = new Request("https://example.com/workflows/upload", {
      method: "POST",
      body: formData,
    });

    const response = await handleUpload(request);
    const body = await response.json();

    assertEquals(response.status, 400);
    assertEquals(body.success, false);
    assertEquals(body.error, "File is required");
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handleStatus - should return workflow status", async () => {
  const savedEnv = saveEnvState(["FRONTEND_URL"]);

  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: { id: "user-123" } },
    error: null,
  });
  mockSupabase.withRpcResponse("get_gh_installation", () => ({
    data: [
      {
        gh_installation_id: "123",
        gh_user_login: "test-user",
        gh_user_id: 456,
        gh_repo_name: "test-repo",
      },
    ],
    error: null,
  }));

  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  };
  const mockStatusService = {
    getWorkflowStatus: async () => ({
      fileName: "test-workflow.json",
      status: "success",
      workflowRunId: 123,
      workflowRunUrl: "https://github.com/test/repo/actions/runs/123",
      errorMessage: null,
      triggeredAt: "2024-01-01T00:00:00Z",
      completedAt: "2024-01-01T01:00:00Z",
    }),
  };

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
    frontendUrl: "https://frontend.example.com",
  }));
  const createSupabaseStub = stub(deps, "createSupabaseClient", () => mockSupabase);
  const githubClientStub = stub(deps, "GitHubClientService", () => mockGithubClient);
  const statusServiceStub = stub(deps, "WorkflowStatusService", () => mockStatusService);
  (mockSupabase as any).rpc = async (fn: string, args: unknown) => {
    return mockSupabase.rpc(fn, args);
  };

  try {
    const response = await handleStatus("test-workflow.json");
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.fileName, "test-workflow.json");
    assertEquals(body.status, "success");
    assertEquals(body.workflowRunId, 123);
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
    githubClientStub.restore();
    statusServiceStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handleStatus - should return 401 when not authenticated", async () => {
  const savedEnv = saveEnvState(["FRONTEND_URL"]);

  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: null },
    error: new Error("Not authenticated"),
  });

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
    frontendUrl: "https://frontend.example.com",
  }));
  const createSupabaseStub = stub(deps, "createSupabaseClient", () => mockSupabase);

  try {
    const response = await handleStatus("test-workflow.json");
    const body = await response.json();

    assertEquals(response.status, 401);
    assertEquals(body.success, false);
    assertEquals(body.error, "Authentication required");
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handler - should route to handleUpload for POST /workflows/upload", async () => {
  const savedEnv = saveEnvState(["FRONTEND_URL"]);

  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: { id: "user-123" } },
    error: null,
  });
  mockSupabase.withRpcResponse("get_gh_installation", () => ({
    data: [
      {
        gh_installation_id: "123",
        gh_user_login: "test-user",
        gh_user_id: 456,
        gh_repo_name: "test-repo",
      },
    ],
    error: null,
  }));

  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  };
  const mockUploadService = {
    uploadWorkflow: async () => ({
      fileName: "test-workflow.json",
      commitSha: "abc123",
    }),
    triggerRegistration: async () => ({
      workflowRunId: 123,
      workflowRunUrl: "https://github.com/test/repo/actions/runs/123",
    }),
  };

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
    frontendUrl: "https://frontend.example.com",
  }));
  const createSupabaseStub = stub(deps, "createSupabaseClient", () => mockSupabase);
  const githubClientStub = stub(deps, "GitHubClientService", () => mockGithubClient);
  const uploadServiceStub = stub(deps, "WorkflowUploadService", () => mockUploadService);
  (mockSupabase as any).rpc = async (fn: string, args: unknown) => {
    return mockSupabase.rpc(fn, args);
  };

  try {
    const formData = new FormData();
    const file = new File(['{"name": "test"}'], "test-workflow.json", {
      type: "application/json",
    });
    formData.append("file", file);

    const request = new Request("https://example.com/functions/v1/workflows/upload", {
      method: "POST",
      body: formData,
    });

    const response = await handler(request);
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.success, true);
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
    githubClientStub.restore();
    uploadServiceStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handler - should route to handleStatus for GET /workflows/status/{fileName}", async () => {
  const savedEnv = saveEnvState(["FRONTEND_URL"]);

  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: { id: "user-123" } },
    error: null,
  });
  mockSupabase.withRpcResponse("get_gh_installation", () => ({
    data: [
      {
        gh_installation_id: "123",
        gh_user_login: "test-user",
        gh_user_id: 456,
        gh_repo_name: "test-repo",
      },
    ],
    error: null,
  }));

  const mockOctokit = createMockOctokit();
  const mockGithubClient = {
    getAuthenticatedOctokit: async () => mockOctokit,
  };
  const mockStatusService = {
    getWorkflowStatus: async () => ({
      fileName: "test-workflow.json",
      status: "success",
      workflowRunId: 123,
      workflowRunUrl: "https://github.com/test/repo/actions/runs/123",
      errorMessage: null,
      triggeredAt: "2024-01-01T00:00:00Z",
      completedAt: "2024-01-01T01:00:00Z",
    }),
  };

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
    frontendUrl: "https://frontend.example.com",
  }));
  const createSupabaseStub = stub(deps, "createSupabaseClient", () => mockSupabase);
  const githubClientStub = stub(deps, "GitHubClientService", () => mockGithubClient);
  const statusServiceStub = stub(deps, "WorkflowStatusService", () => mockStatusService);
  (mockSupabase as any).rpc = async (fn: string, args: unknown) => {
    return mockSupabase.rpc(fn, args);
  };

  try {
    const request = new Request("https://example.com/functions/v1/workflows/status/test-workflow.json", {
      method: "GET",
    });

    const response = await handler(request);
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.fileName, "test-workflow.json");
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
    githubClientStub.restore();
    statusServiceStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("handler - should return 404 for unknown routes", async () => {
  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
    frontendUrl: "https://frontend.example.com",
  }));

  try {
    const request = new Request("https://example.com/functions/v1/unknown", {
      method: "GET",
    });

    const response = await handler(request);
    const body = await response.json();

    assertEquals(response.status, 404);
    assertEquals(body.success, false);
    assertEquals(body.error, "Not found");
  } finally {
    getConfigStub.restore();
  }
});
