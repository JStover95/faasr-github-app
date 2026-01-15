/**
 * Tests for workflows/handler.ts
 */

import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  deps,
  getUserSession,
  handler,
  handleStatus,
  handleUpload,
  parseFormData,
} from "../../functions/workflows/handler.ts";
import { createMockOctokit, createMockSupabaseClient } from "../test-utils.ts";

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
    const request = new Request("https://example.com", {
      headers: { Authorization: mockJWT },
    });
    const session = await getUserSession(request);

    assertEquals(session?.installationId, "123");
    assertEquals(session?.userLogin, "test-user");
    assertEquals(session?.userId, 456);
    assertEquals(session?.repoName, "test-repo");
    assertEquals(capturedRequest, request);
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
    const request = new Request("https://example.com", {
      headers: { Authorization: mockJWT },
    });
    const session = await getUserSession(request);

    assertEquals(session, null);
    assertEquals(capturedRequest, request);
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
    const request = new Request("https://example.com", {
      headers: { Authorization: mockJWT },
    });
    const session = await getUserSession(request);

    assertEquals(session, null);
    assertEquals(capturedRequest, request);
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
    const request = new Request("https://example.com", {
      headers: { Authorization: mockJWT },
    });
    const session = await getUserSession(request);

    assertEquals(session, null);
    assertEquals(capturedRequest, request);
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

Deno.test("parseFormData - should parse custom_containers=true", async () => {
  const formData = new FormData();
  const file = new File(['{"name": "test"}'], "test-workflow.json", {
    type: "application/json",
  });
  formData.append("file", file);
  formData.append("custom_containers", "true");

  const request = new Request("https://example.com/upload", {
    method: "POST",
    body: formData,
  });

  const result = await parseFormData(request);

  assertEquals(result.file !== null, true);
  assertEquals(result.fileName, "test-workflow.json");
  assertEquals(result.customContainers, true);
});

Deno.test("parseFormData - should parse custom_containers=false", async () => {
  const formData = new FormData();
  const file = new File(['{"name": "test"}'], "test-workflow.json", {
    type: "application/json",
  });
  formData.append("file", file);
  formData.append("custom_containers", "false");

  const request = new Request("https://example.com/upload", {
    method: "POST",
    body: formData,
  });

  const result = await parseFormData(request);

  assertEquals(result.file !== null, true);
  assertEquals(result.fileName, "test-workflow.json");
  assertEquals(result.customContainers, false);
});

Deno.test("parseFormData - should return null when custom_containers excluded", async () => {
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
  assertEquals(result.customContainers, null);
});

Deno.test("handleUpload - should upload workflow file successfully", async () => {
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
    getAuthenticatedOctokit: async () => await Promise.resolve(mockOctokit),
  };
  let capturedCustomContainers: boolean | undefined;
  const mockUploadService = {
    uploadWorkflow: async () =>
      await Promise.resolve({
        fileName: "test-workflow.json",
        commitSha: "abc123",
      }),
    triggerRegistration: async (
      _session: unknown,
      _fileName: string,
      customContainers?: boolean,
    ) => {
      capturedCustomContainers = customContainers;
      return await Promise.resolve({
        workflowRunId: 123,
        workflowRunUrl: "https://github.com/test/repo/actions/runs/123",
      });
    },
  };

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));

  let capturedRequest: Request | null = null;

  const createSupabaseStub = stub(
    deps,
    "createSupabaseClient",
    (req: Request) => {
      capturedRequest = req;
      return mockSupabase;
    },
  );
  const githubClientStub = stub(
    deps,
    "GitHubClientService",
    () => mockGithubClient,
  );
  const uploadServiceStub = stub(
    deps,
    "WorkflowUploadService",
    () => mockUploadService,
  );

  try {
    const formData = new FormData();
    const file = new File(['{"name": "test"}'], "test-workflow.json", {
      type: "application/json",
    });
    formData.append("file", file);
    formData.append("custom_containers", "true");

    const mockJWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
    const request = new Request("https://example.com/workflows/upload", {
      method: "POST",
      headers: { Authorization: mockJWT },
      body: formData,
    });

    const response = await handleUpload(request);
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.success, true);
    assertEquals(body.fileName, "test-workflow.json");
    assertEquals(body.commitSha, "abc123");
    assertEquals(capturedRequest, request);
    assertEquals(capturedCustomContainers, true);
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
    githubClientStub.restore();
    uploadServiceStub.restore();
  }
});

Deno.test("handleUpload - should return 401 when not authenticated", async () => {
  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: null },
    error: new Error("Not authenticated"),
  });

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));
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
    const request = new Request("https://example.com/workflows/upload", {
      method: "POST",
      headers: { Authorization: mockJWT },
    });

    const response = await handleUpload(request);
    const body = await response.json();

    assertEquals(response.status, 401);
    assertEquals(body.success, false);
    assertEquals(body.error, "Authentication required");
    assertEquals(capturedRequest, request);
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
  }
});

Deno.test("handleUpload - should return 400 when file missing", async () => {
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
  }));
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
    const formData = new FormData();
    const request = new Request("https://example.com/workflows/upload", {
      method: "POST",
      headers: { Authorization: mockJWT },
      body: formData,
    });

    const response = await handleUpload(request);
    const body = await response.json();

    assertEquals(response.status, 400);
    assertEquals(body.success, false);
    assertEquals(body.error, "File is required");
    assertEquals(capturedRequest, request);
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
  }
});

Deno.test("handleUpload - should pass custom_containers=false to triggerRegistration", async () => {
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
    getAuthenticatedOctokit: async () => await Promise.resolve(mockOctokit),
  };
  let capturedCustomContainers: boolean | undefined;
  const mockUploadService = {
    uploadWorkflow: async () =>
      await Promise.resolve({
        fileName: "test-workflow.json",
        commitSha: "abc123",
      }),
    triggerRegistration: async (
      _session: unknown,
      _fileName: string,
      customContainers?: boolean,
    ) => {
      capturedCustomContainers = customContainers;
      return await Promise.resolve({
        workflowRunId: 123,
        workflowRunUrl: "https://github.com/test/repo/actions/runs/123",
      });
    },
  };

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));
  let capturedRequest: Request | null = null;
  const createSupabaseStub = stub(
    deps,
    "createSupabaseClient",
    (req: Request) => {
      capturedRequest = req;
      return mockSupabase;
    },
  );
  const githubClientStub = stub(
    deps,
    "GitHubClientService",
    () => mockGithubClient,
  );
  const uploadServiceStub = stub(
    deps,
    "WorkflowUploadService",
    () => mockUploadService,
  );

  try {
    const formData = new FormData();
    const file = new File(['{"name": "test"}'], "test-workflow.json", {
      type: "application/json",
    });
    formData.append("file", file);
    formData.append("custom_containers", "false");

    const mockJWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
    const request = new Request("https://example.com/workflows/upload", {
      method: "POST",
      headers: { Authorization: mockJWT },
      body: formData,
    });

    const response = await handleUpload(request);
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.success, true);
    assertEquals(body.fileName, "test-workflow.json");
    assertEquals(capturedRequest, request);
    assertEquals(capturedCustomContainers, false);
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
    githubClientStub.restore();
    uploadServiceStub.restore();
  }
});

Deno.test("handleUpload - should default to undefined when custom_containers excluded", async () => {
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
    getAuthenticatedOctokit: async () => await Promise.resolve(mockOctokit),
  };
  let capturedCustomContainers: boolean | undefined;
  const mockUploadService = {
    uploadWorkflow: async () =>
      await Promise.resolve({
        fileName: "test-workflow.json",
        commitSha: "abc123",
      }),
    triggerRegistration: async (
      _session: unknown,
      _fileName: string,
      customContainers?: boolean,
    ) => {
      capturedCustomContainers = customContainers;
      return await Promise.resolve({
        workflowRunId: 123,
        workflowRunUrl: "https://github.com/test/repo/actions/runs/123",
      });
    },
  };

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));
  let capturedRequest: Request | null = null;
  const createSupabaseStub = stub(
    deps,
    "createSupabaseClient",
    (req: Request) => {
      capturedRequest = req;
      return mockSupabase;
    },
  );
  const githubClientStub = stub(
    deps,
    "GitHubClientService",
    () => mockGithubClient,
  );
  const uploadServiceStub = stub(
    deps,
    "WorkflowUploadService",
    () => mockUploadService,
  );

  try {
    const formData = new FormData();
    const file = new File(['{"name": "test"}'], "test-workflow.json", {
      type: "application/json",
    });
    formData.append("file", file);
    // custom_containers not included

    const mockJWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
    const request = new Request("https://example.com/workflows/upload", {
      method: "POST",
      headers: { Authorization: mockJWT },
      body: formData,
    });

    const response = await handleUpload(request);
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.success, true);
    assertEquals(body.fileName, "test-workflow.json");
    assertEquals(capturedRequest, request);
    assertEquals(capturedCustomContainers, undefined);
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
    githubClientStub.restore();
    uploadServiceStub.restore();
  }
});

Deno.test("handleStatus - should return workflow status", async () => {
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
    getAuthenticatedOctokit: async () => await Promise.resolve(mockOctokit),
  };
  const mockStatusService = {
    getWorkflowStatus: async () =>
      await Promise.resolve({
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
  }));
  let capturedRequest: Request | null = null;
  const createSupabaseStub = stub(
    deps,
    "createSupabaseClient",
    (req: Request) => {
      capturedRequest = req;
      return mockSupabase;
    },
  );
  const githubClientStub = stub(
    deps,
    "GitHubClientService",
    () => mockGithubClient,
  );
  const statusServiceStub = stub(
    deps,
    "WorkflowStatusService",
    () => mockStatusService,
  );

  try {
    const mockJWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
    const request = new Request(
      "https://example.com/workflows?filename=test-workflow.json",
      {
        method: "GET",
        headers: { Authorization: mockJWT },
      },
    );
    const response = await handleStatus(request);
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.fileName, "test-workflow.json");
    assertEquals(body.status, "success");
    assertEquals(body.workflowRunId, 123);
    assertEquals(capturedRequest, request);
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
    githubClientStub.restore();
    statusServiceStub.restore();
  }
});

Deno.test("handleStatus - should return 400 when filename missing", async () => {
  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));

  try {
    const mockJWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
    const request = new Request("https://example.com/workflows", {
      method: "GET",
      headers: { Authorization: mockJWT },
    });
    const response = await handleStatus(request);
    const body = await response.json();

    assertEquals(response.status, 400);
    assertEquals(body.success, false);
    assertEquals(body.error, "filename parameter is required");
  } finally {
    getConfigStub.restore();
  }
});

Deno.test("handleStatus - should return 401 when not authenticated", async () => {
  const mockSupabase = createMockSupabaseClient();
  mockSupabase.withAuthResponse({
    data: { user: null },
    error: new Error("Not authenticated"),
  });

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));
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
    const request = new Request(
      "https://example.com/workflows?filename=test-workflow.json",
      {
        method: "GET",
      },
    );
    const response = await handleStatus(request);
    const body = await response.json();

    assertEquals(response.status, 401);
    assertEquals(body.success, false);
    assertEquals(body.error, "Authentication required");
    assertEquals(capturedRequest, request);
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
  }
});

Deno.test("handler - should route to handleUpload for POST", async () => {
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
    getAuthenticatedOctokit: async () => await Promise.resolve(mockOctokit),
  };
  const mockUploadService = {
    uploadWorkflow: async () =>
      await Promise.resolve({
        fileName: "test-workflow.json",
        commitSha: "abc123",
      }),
    triggerRegistration: async () =>
      await Promise.resolve({
        workflowRunId: 123,
        workflowRunUrl: "https://github.com/test/repo/actions/runs/123",
      }),
  };

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));
  let capturedRequest: Request | null = null;
  const createSupabaseStub = stub(
    deps,
    "createSupabaseClient",
    (req: Request) => {
      capturedRequest = req;
      return mockSupabase;
    },
  );
  const githubClientStub = stub(
    deps,
    "GitHubClientService",
    () => mockGithubClient,
  );
  const uploadServiceStub = stub(
    deps,
    "WorkflowUploadService",
    () => mockUploadService,
  );

  try {
    const formData = new FormData();
    const file = new File(['{"name": "test"}'], "test-workflow.json", {
      type: "application/json",
    });
    formData.append("file", file);

    const mockJWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
    const request = new Request(
      "https://example.com/functions/v1/workflows",
      {
        method: "POST",
        headers: { Authorization: mockJWT },
        body: formData,
      },
    );

    const response = await handler(request);
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.success, true);
    assertEquals(capturedRequest, request);
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
    githubClientStub.restore();
    uploadServiceStub.restore();
  }
});

Deno.test("handler - should route to handleStatus for GET", async () => {
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
    getAuthenticatedOctokit: async () => await Promise.resolve(mockOctokit),
  };
  const mockStatusService = {
    getWorkflowStatus: async () =>
      await Promise.resolve({
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
  }));
  let capturedRequest: Request | null = null;
  const createSupabaseStub = stub(
    deps,
    "createSupabaseClient",
    (req: Request) => {
      capturedRequest = req;
      return mockSupabase;
    },
  );
  const githubClientStub = stub(
    deps,
    "GitHubClientService",
    () => mockGithubClient,
  );
  const statusServiceStub = stub(
    deps,
    "WorkflowStatusService",
    () => mockStatusService,
  );

  try {
    const mockJWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
    const request = new Request(
      "https://example.com/functions/v1/workflows?filename=test-workflow.json",
      {
        method: "GET",
        headers: { Authorization: mockJWT },
      },
    );

    const response = await handler(request);
    const body = await response.json();

    assertEquals(response.status, 200);
    assertEquals(body.fileName, "test-workflow.json");
    assertEquals(capturedRequest, request);
  } finally {
    getConfigStub.restore();
    createSupabaseStub.restore();
    githubClientStub.restore();
    statusServiceStub.restore();
  }
});

Deno.test("handler - should return 405 for DELETE requests", async () => {
  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));

  try {
    const request = new Request("https://example.com/functions/v1/workflows", {
      method: "DELETE",
    });

    const response = await handler(request);
    const body = await response.json();

    assertEquals(response.status, 405);
    assertEquals(body.success, false);
    assertEquals(body.error, "Method not allowed");
  } finally {
    getConfigStub.restore();
  }
});

Deno.test("handler - should return 405 for PUT requests", async () => {
  const getConfigStub = stub(deps, "getConfig", () => ({
    githubAppId: "12345",
    githubPrivateKey: "test-key",
  }));

  try {
    const request = new Request("https://example.com/functions/v1/workflows", {
      method: "PUT",
    });

    const response = await handler(request);
    const body = await response.json();

    assertEquals(response.status, 405);
    assertEquals(body.success, false);
    assertEquals(body.error, "Method not allowed");
  } finally {
    getConfigStub.restore();
  }
});
