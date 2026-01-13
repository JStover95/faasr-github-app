/**
 * Tests for repository.ts
 */

import { assertEquals, assertRejects } from "@std/assert";
import { isFork } from "../../functions/_shared/repository.ts";
import { createMockOctokit } from "../test-utils.ts";

Deno.test("isFork - should return true when repo is fork of FaaSr/FaaSr-workflow", async () => {
  const mockOctokit = createMockOctokit();
  mockOctokit.withRestResponse("repos.get", () => ({
    data: {
      fork: true,
      parent: {
        owner: {
          login: "FaaSr",
        },
        name: "FaaSr-workflow",
      },
    },
  }));

  const result = await isFork(mockOctokit, "test-user", "test-repo");

  assertEquals(result, true);
});

Deno.test("isFork - should return false when repo is not a fork", async () => {
  const mockOctokit = createMockOctokit();
  mockOctokit.withRestResponse("repos.get", () => ({
    data: {
      fork: false,
    },
  }));

  const result = await isFork(mockOctokit, "test-user", "test-repo");

  assertEquals(result, false);
});

Deno.test("isFork - should return false when repo is fork of different repo", async () => {
  const mockOctokit = createMockOctokit();
  mockOctokit.withRestResponse("repos.get", () => ({
    data: {
      fork: true,
      parent: {
        owner: {
          login: "OtherOrg",
        },
        name: "OtherRepo",
      },
    },
  }));

  const result = await isFork(mockOctokit, "test-user", "test-repo");

  assertEquals(result, false);
});

Deno.test("isFork - should return false when repo doesn't exist (404)", async () => {
  const mockOctokit = createMockOctokit();
  const error = new Error("Not found");
  // deno-lint-ignore no-explicit-any
  (error as any).status = 404;

  mockOctokit.withRestResponse("repos.get", () => {
    throw error;
  });

  const result = await isFork(mockOctokit, "test-user", "test-repo");

  assertEquals(result, false);
});

Deno.test("isFork - should throw error for non-404 API errors", async () => {
  const mockOctokit = createMockOctokit();
  const error = new Error("Internal server error");
  // deno-lint-ignore no-explicit-any
  (error as any).status = 500;

  mockOctokit.withRestResponse("repos.get", () => {
    throw error;
  });

  await assertRejects(
    async () => {
      await isFork(mockOctokit, "test-user", "test-repo");
    },
    Error,
    "Internal server error",
  );
});
