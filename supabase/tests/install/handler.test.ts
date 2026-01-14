/**
 * Tests for install/handler.ts
 */

import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  deps,
  handleInstall,
  handler,
} from "../../functions/install/handler.ts";
import { restoreEnvState, saveEnvState } from "../test-utils.ts";

Deno.test("handleInstall - should return redirect URL to GitHub installation page", async () => {
  const savedEnv = saveEnvState(["GITHUB_INSTALLATION_URL"]);

  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
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
  }));

  try {
    const response = handleInstall();

    assertEquals(response.headers.get("Content-Type"), "application/json");
  } finally {
    getConfigStub.restore();
  }
});

Deno.test("handler - should handle GET request", async () => {
  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
  }));

  try {
    const request = new Request(
      "https://example.com/functions/v1/install",
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

Deno.test("handler - should return 405 for POST requests", async () => {
  const getConfigStub = stub(deps, "getConfig", () => ({
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
  }));

  try {
    const request = new Request("https://example.com/functions/v1/install", {
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
    githubInstallationUrl: "https://github.com/apps/test/installations/new",
  }));

  try {
    const request = new Request("https://example.com/functions/v1/install", {
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
