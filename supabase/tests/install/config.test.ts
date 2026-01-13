/**
 * Tests for install/config.ts
 */

import { assertEquals, assertRejects } from "@std/assert";
import { clearCache, getConfig } from "../../functions/install/config.ts";
import { restoreEnvState, saveEnvState } from "../test-utils.ts";

Deno.test("getConfig - should return valid config with all env vars set", () => {
  const savedEnv = saveEnvState([
    "GITHUB_INSTALLATION_URL",
    "GITHUB_CLIENT_ID",
    "FRONTEND_URL",
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
  ]);

  try {
    clearCache();
    Deno.env.set(
      "GITHUB_INSTALLATION_URL",
      "https://github.com/apps/test/installations/new",
    );
    Deno.env.set("GITHUB_CLIENT_ID", "test-client-id");
    Deno.env.set("FRONTEND_URL", "https://frontend.example.com");
    Deno.env.set("GITHUB_APP_ID", "12345");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-private-key");

    const config = getConfig();

    assertEquals(
      config.githubInstallationUrl,
      "https://github.com/apps/test/installations/new",
    );
    assertEquals(config.githubClientId, "test-client-id");
    assertEquals(config.frontendUrl, "https://frontend.example.com");
    assertEquals(config.githubAppId, "12345");
    assertEquals(config.githubPrivateKey, "test-private-key");
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("getConfig - should cache config on subsequent calls", () => {
  const savedEnv = saveEnvState([
    "GITHUB_INSTALLATION_URL",
    "GITHUB_CLIENT_ID",
    "FRONTEND_URL",
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
  ]);

  try {
    clearCache();
    Deno.env.set(
      "GITHUB_INSTALLATION_URL",
      "https://github.com/apps/test/installations/new",
    );
    Deno.env.set("GITHUB_CLIENT_ID", "test-client-id");
    Deno.env.set("FRONTEND_URL", "https://frontend.example.com");
    Deno.env.set("GITHUB_APP_ID", "12345");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-private-key");

    const config1 = getConfig();
    // Change env var
    Deno.env.set("GITHUB_APP_ID", "99999");
    const config2 = getConfig();

    // Should return cached config, not new value
    assertEquals(config1.githubAppId, config2.githubAppId);
    assertEquals(config1.githubAppId, "12345");
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("getConfig - should throw error when GITHUB_INSTALLATION_URL missing", () => {
  const savedEnv = saveEnvState([
    "GITHUB_INSTALLATION_URL",
    "GITHUB_CLIENT_ID",
    "FRONTEND_URL",
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
  ]);

  try {
    clearCache();
    Deno.env.delete("GITHUB_INSTALLATION_URL");
    Deno.env.set("GITHUB_CLIENT_ID", "test-client-id");
    Deno.env.set("FRONTEND_URL", "https://frontend.example.com");
    Deno.env.set("GITHUB_APP_ID", "12345");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-private-key");

    assertRejects(
      async () => {
        await Promise.resolve(getConfig());
      },
      Error,
      "Missing environment variables",
    );
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("getConfig - should throw error when GITHUB_CLIENT_ID missing", () => {
  const savedEnv = saveEnvState([
    "GITHUB_INSTALLATION_URL",
    "GITHUB_CLIENT_ID",
    "FRONTEND_URL",
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
  ]);

  try {
    clearCache();
    Deno.env.set(
      "GITHUB_INSTALLATION_URL",
      "https://github.com/apps/test/installations/new",
    );
    Deno.env.delete("GITHUB_CLIENT_ID");
    Deno.env.set("FRONTEND_URL", "https://frontend.example.com");
    Deno.env.set("GITHUB_APP_ID", "12345");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-private-key");

    assertRejects(
      async () => {
        await Promise.resolve(getConfig());
      },
      Error,
      "Missing environment variables",
    );
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("getConfig - should throw error when FRONTEND_URL missing", () => {
  const savedEnv = saveEnvState([
    "GITHUB_INSTALLATION_URL",
    "GITHUB_CLIENT_ID",
    "FRONTEND_URL",
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
  ]);

  try {
    clearCache();
    Deno.env.set(
      "GITHUB_INSTALLATION_URL",
      "https://github.com/apps/test/installations/new",
    );
    Deno.env.set("GITHUB_CLIENT_ID", "test-client-id");
    Deno.env.delete("FRONTEND_URL");
    Deno.env.set("GITHUB_APP_ID", "12345");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-private-key");

    assertRejects(
      async () => {
        await Promise.resolve(getConfig());
      },
      Error,
      "Missing environment variables",
    );
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("getConfig - should throw error when GITHUB_APP_ID missing", () => {
  const savedEnv = saveEnvState([
    "GITHUB_INSTALLATION_URL",
    "GITHUB_CLIENT_ID",
    "FRONTEND_URL",
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
  ]);

  try {
    clearCache();
    Deno.env.set(
      "GITHUB_INSTALLATION_URL",
      "https://github.com/apps/test/installations/new",
    );
    Deno.env.set("GITHUB_CLIENT_ID", "test-client-id");
    Deno.env.set("FRONTEND_URL", "https://frontend.example.com");
    Deno.env.delete("GITHUB_APP_ID");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-private-key");

    assertRejects(
      async () => {
        await Promise.resolve(getConfig());
      },
      Error,
      "Missing environment variables",
    );
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("getConfig - should throw error when GITHUB_PRIVATE_KEY missing", () => {
  const savedEnv = saveEnvState([
    "GITHUB_INSTALLATION_URL",
    "GITHUB_CLIENT_ID",
    "FRONTEND_URL",
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
  ]);

  try {
    clearCache();
    Deno.env.set(
      "GITHUB_INSTALLATION_URL",
      "https://github.com/apps/test/installations/new",
    );
    Deno.env.set("GITHUB_CLIENT_ID", "test-client-id");
    Deno.env.set("FRONTEND_URL", "https://frontend.example.com");
    Deno.env.set("GITHUB_APP_ID", "12345");
    Deno.env.delete("GITHUB_PRIVATE_KEY");

    assertRejects(
      async () => {
        await Promise.resolve(getConfig());
      },
      Error,
      "Missing environment variables",
    );
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("getConfig - should list all missing env vars in error", () => {
  const savedEnv = saveEnvState([
    "GITHUB_INSTALLATION_URL",
    "GITHUB_CLIENT_ID",
    "FRONTEND_URL",
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
  ]);

  try {
    clearCache();
    Deno.env.delete("GITHUB_INSTALLATION_URL");
    Deno.env.delete("GITHUB_CLIENT_ID");
    Deno.env.set("FRONTEND_URL", "https://frontend.example.com");
    Deno.env.set("GITHUB_APP_ID", "12345");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-private-key");

    try {
      getConfig();
      assertEquals(false, true, "Should have thrown error");
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      assertEquals(errorMessage.includes("GITHUB_INSTALLATION_URL"), true);
      assertEquals(errorMessage.includes("GITHUB_CLIENT_ID"), true);
    }
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("clearCache - should clear cached config", () => {
  const savedEnv = saveEnvState([
    "GITHUB_INSTALLATION_URL",
    "GITHUB_CLIENT_ID",
    "FRONTEND_URL",
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
  ]);

  try {
    clearCache();
    Deno.env.set(
      "GITHUB_INSTALLATION_URL",
      "https://github.com/apps/test/installations/new",
    );
    Deno.env.set("GITHUB_CLIENT_ID", "test-client-id");
    Deno.env.set("FRONTEND_URL", "https://frontend.example.com");
    Deno.env.set("GITHUB_APP_ID", "12345");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-private-key");

    clearCache();
    Deno.env.set("GITHUB_APP_ID", "99999");
    const config2 = getConfig();

    // Should read new value after clearing cache
    assertEquals(config2.githubAppId, "99999");
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("clearCache - should allow next call to read env vars again", () => {
  const savedEnv = saveEnvState([
    "GITHUB_INSTALLATION_URL",
    "GITHUB_CLIENT_ID",
    "FRONTEND_URL",
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
  ]);

  try {
    clearCache();
    Deno.env.set(
      "GITHUB_INSTALLATION_URL",
      "https://github.com/apps/test/installations/new",
    );
    Deno.env.set("GITHUB_CLIENT_ID", "test-client-id");
    Deno.env.set("FRONTEND_URL", "https://frontend.example.com");
    Deno.env.set("GITHUB_APP_ID", "12345");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-private-key");

    getConfig();
    clearCache();
    Deno.env.set("GITHUB_APP_ID", "88888");
    const config = getConfig();

    assertEquals(config.githubAppId, "88888");
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});
