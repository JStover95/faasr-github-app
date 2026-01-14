/**
 * Tests for install/config.ts
 */

import { assertEquals, assertThrows } from "@std/assert";
import { clearCache, getConfig } from "../../functions/install/config.ts";
import { restoreEnvState, saveEnvState } from "../test-utils.ts";

Deno.test("getConfig - should return valid config with GITHUB_INSTALLATION_URL set", () => {
  const savedEnv = saveEnvState(["GITHUB_INSTALLATION_URL"]);

  try {
    clearCache();
    Deno.env.set(
      "GITHUB_INSTALLATION_URL",
      "https://github.com/apps/test/installations/new",
    );

    const config = getConfig();

    assertEquals(
      config.githubInstallationUrl,
      "https://github.com/apps/test/installations/new",
    );
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("getConfig - should cache config on subsequent calls", () => {
  const savedEnv = saveEnvState(["GITHUB_INSTALLATION_URL"]);

  try {
    clearCache();
    Deno.env.set(
      "GITHUB_INSTALLATION_URL",
      "https://github.com/apps/test/installations/new",
    );

    const config1 = getConfig();
    // Change env var
    Deno.env.set(
      "GITHUB_INSTALLATION_URL",
      "https://github.com/apps/other/installations/new",
    );
    const config2 = getConfig();

    // Should return cached config, not new value
    assertEquals(
      config1.githubInstallationUrl,
      config2.githubInstallationUrl,
    );
    assertEquals(
      config1.githubInstallationUrl,
      "https://github.com/apps/test/installations/new",
    );
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("getConfig - should throw error when GITHUB_INSTALLATION_URL missing", () => {
  const savedEnv = saveEnvState(["GITHUB_INSTALLATION_URL"]);

  try {
    clearCache();
    Deno.env.delete("GITHUB_INSTALLATION_URL");

    assertThrows(
      () => getConfig(),
      Error,
      "Missing environment variable: GITHUB_INSTALLATION_URL",
    );
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("clearCache - should clear cached config", () => {
  const savedEnv = saveEnvState(["GITHUB_INSTALLATION_URL"]);

  try {
    clearCache();
    Deno.env.set(
      "GITHUB_INSTALLATION_URL",
      "https://github.com/apps/test/installations/new",
    );

    getConfig();
    clearCache();
    Deno.env.set(
      "GITHUB_INSTALLATION_URL",
      "https://github.com/apps/other/installations/new",
    );
    const config2 = getConfig();

    // Should read new value after clearing cache
    assertEquals(
      config2.githubInstallationUrl,
      "https://github.com/apps/other/installations/new",
    );
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("clearCache - should allow next call to read env vars again", () => {
  const savedEnv = saveEnvState(["GITHUB_INSTALLATION_URL"]);

  try {
    clearCache();
    Deno.env.set(
      "GITHUB_INSTALLATION_URL",
      "https://github.com/apps/test/installations/new",
    );

    getConfig();
    clearCache();
    Deno.env.set(
      "GITHUB_INSTALLATION_URL",
      "https://github.com/apps/final/installations/new",
    );
    const config = getConfig();

    assertEquals(
      config.githubInstallationUrl,
      "https://github.com/apps/final/installations/new",
    );
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});
