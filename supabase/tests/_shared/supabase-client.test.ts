/**
 * Tests for supabase-client.ts
 */

import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  clearCachedClient,
  createSupabaseClient,
  deps,
} from "../../functions/_shared/supabase-client.ts";
import { restoreEnvState, saveEnvState } from "../test-utils.ts";

Deno.test("createSupabaseClient - should create client with env vars", () => {
  const savedEnv = saveEnvState([
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);

  const mockClient = { test: "client" };
  let capturedUrl: string | null = null;
  let capturedKey: string | null = null;
  let capturedOptions: unknown = null;

  const createClientStub = stub(
    deps,
    "createClient",
    (url: string, key: string, options?: unknown) => {
      capturedUrl = url;
      capturedKey = key;
      capturedOptions = options;
      // deno-lint-ignore no-explicit-any
      return mockClient as any;
    },
  );

  try {
    clearCachedClient();
    Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
    Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

    const client = createSupabaseClient();

    // deno-lint-ignore no-explicit-any
    assertEquals(client, mockClient as any);
    assertEquals(capturedUrl, "https://test.supabase.co");
    assertEquals(capturedKey, "test-service-key");
    assertEquals(
      (capturedOptions as { global?: { headers?: { Authorization?: string } } })
        ?.global?.headers?.Authorization,
      "test-anon-key",
    );
  } finally {
    createClientStub.restore();
    clearCachedClient();
    restoreEnvState(savedEnv);
  }
});

Deno.test("createSupabaseClient - should return cached client on subsequent calls", () => {
  const savedEnv = saveEnvState([
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);

  const mockClient = { test: "client" };
  let callCount = 0;

  const createClientStub = stub(deps, "createClient", () => {
    callCount++;
    // deno-lint-ignore no-explicit-any
    return mockClient as any;
  });

  try {
    clearCachedClient();
    Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
    Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

    const client1 = createSupabaseClient();
    const client2 = createSupabaseClient();

    assertEquals(client1, client2);
    assertEquals(callCount, 1); // Should only be called once
  } finally {
    createClientStub.restore();
    clearCachedClient();
    restoreEnvState(savedEnv);
  }
});

Deno.test("createSupabaseClient - should use SUPABASE_URL from env", () => {
  const savedEnv = saveEnvState([
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);

  let capturedUrl: string | null = null;

  const createClientStub = stub(
    deps,
    "createClient",
    (url: string) => {
      capturedUrl = url;
      // deno-lint-ignore no-explicit-any
      return {} as any;
    },
  );

  try {
    clearCachedClient();
    Deno.env.set("SUPABASE_URL", "https://custom.supabase.co");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
    Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

    createSupabaseClient();

    assertEquals(capturedUrl, "https://custom.supabase.co");
  } finally {
    createClientStub.restore();
    clearCachedClient();
    restoreEnvState(savedEnv);
  }
});

Deno.test("createSupabaseClient - should use SUPABASE_SERVICE_ROLE_KEY from env", () => {
  const savedEnv = saveEnvState([
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);

  let capturedKey: string | null = null;

  const createClientStub = stub(
    deps,
    "createClient",
    (_url: string, key: string) => {
      capturedKey = key;
      // deno-lint-ignore no-explicit-any
      return {} as any;
    },
  );

  try {
    clearCachedClient();
    Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "custom-service-key");
    Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

    createSupabaseClient();

    assertEquals(capturedKey, "custom-service-key");
  } finally {
    createClientStub.restore();
    clearCachedClient();
    restoreEnvState(savedEnv);
  }
});

Deno.test("createSupabaseClient - should set Authorization header with SUPABASE_ANON_KEY", () => {
  const savedEnv = saveEnvState([
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);

  let capturedOptions: unknown = null;

  const createClientStub = stub(
    deps,
    "createClient",
    (_url: string, _key: string, options?: unknown) => {
      capturedOptions = options;
      // deno-lint-ignore no-explicit-any
      return {} as any;
    },
  );

  try {
    clearCachedClient();
    Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
    Deno.env.set("SUPABASE_ANON_KEY", "custom-anon-key");

    createSupabaseClient();

    assertEquals(
      (capturedOptions as { global?: { headers?: { Authorization?: string } } })
        ?.global?.headers?.Authorization,
      "custom-anon-key",
    );
  } finally {
    createClientStub.restore();
    clearCachedClient();
    restoreEnvState(savedEnv);
  }
});

Deno.test("clearCachedClient - should clear cached client", () => {
  const savedEnv = saveEnvState([
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);

  let callCount = 0;

  const createClientStub = stub(deps, "createClient", () => {
    callCount++;
    // deno-lint-ignore no-explicit-any
    return {} as any;
  });

  try {
    clearCachedClient();
    Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
    Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

    createSupabaseClient();
    assertEquals(callCount, 1);

    clearCachedClient();
    createSupabaseClient();
    assertEquals(callCount, 2); // Should be called again after clearing
  } finally {
    createClientStub.restore();
    clearCachedClient();
    restoreEnvState(savedEnv);
  }
});

Deno.test("clearCachedClient - should allow next call to create new client", () => {
  const savedEnv = saveEnvState([
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_ANON_KEY",
  ]);

  const mockClient1 = { id: 1 };
  const mockClient2 = { id: 2 };
  let clientIndex = 0;

  const createClientStub = stub(deps, "createClient", () => {
    // deno-lint-ignore no-explicit-any
    return (clientIndex++ === 0 ? mockClient1 : mockClient2) as any;
  });

  try {
    clearCachedClient();
    Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
    Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
    Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

    const client1 = createSupabaseClient();
    clearCachedClient();
    const client2 = createSupabaseClient();

    // deno-lint-ignore no-explicit-any
    assertEquals(client1, mockClient1 as any);
    // deno-lint-ignore no-explicit-any
    assertEquals(client2, mockClient2 as any);
    assertEquals(client1 !== client2, true);
  } finally {
    createClientStub.restore();
    clearCachedClient();
    restoreEnvState(savedEnv);
  }
});
