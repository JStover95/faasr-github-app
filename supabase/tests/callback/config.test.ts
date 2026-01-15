/**
 * Tests for callback/config.ts
 */

import { assertEquals, assertThrows } from "@std/assert";
import { clearCache, getConfig } from "../../functions/callback/config.ts";
import { restoreEnvState, saveEnvState } from "../test-utils.ts";

Deno.test("getConfig - should return a valid config", () => {
  const savedEnv = saveEnvState([
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
  ]);

  try {
    clearCache();
    Deno.env.set("GITHUB_APP_ID", "12345");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-key");

    const config = getConfig();

    assertEquals(config.githubAppId, "12345");
    assertEquals(config.githubPrivateKey, "test-key");
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("getConfig - should cache config", () => {
  const savedEnv = saveEnvState([
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
  ]);

  try {
    clearCache();
    Deno.env.set("GITHUB_APP_ID", "12345");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-key");

    const config1 = getConfig();
    const config2 = getConfig();

    assertEquals(config1, config2);
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("getConfig - should throw if GITHUB_APP_ID missing", () => {
  const savedEnv = saveEnvState([
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
  ]);

  try {
    clearCache();
    Deno.env.delete("GITHUB_APP_ID");
    Deno.env.set("GITHUB_PRIVATE_KEY", "test-key");

    assertThrows(
      () => getConfig(),
      Error,
      "GITHUB_APP_ID is not set",
    );
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});

Deno.test("getConfig - should throw if GITHUB_PRIVATE_KEY missing", () => {
  const savedEnv = saveEnvState([
    "GITHUB_APP_ID",
    "GITHUB_PRIVATE_KEY",
  ]);

  try {
    clearCache();
    Deno.env.set("GITHUB_APP_ID", "12345");
    Deno.env.delete("GITHUB_PRIVATE_KEY");

    assertThrows(
      () => getConfig(),
      Error,
      "GITHUB_PRIVATE_KEY is not set",
    );
  } finally {
    clearCache();
    restoreEnvState(savedEnv);
  }
});
