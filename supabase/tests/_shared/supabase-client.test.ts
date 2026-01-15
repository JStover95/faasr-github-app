/**
 * Tests for supabase-client.ts
 */

import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  createSupabaseClient,
  deps,
} from "../../functions/_shared/supabase-client.ts";
import { restoreEnvState, saveEnvState } from "../test-utils.ts";

Deno.test("createSupabaseClient - should create client with ANON_KEY and user JWT", () => {
  const savedEnv = saveEnvState([
    "SUPABASE_URL",
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
    Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
    Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

    const mockJWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test";
    const request = new Request("https://example.com", {
      headers: { Authorization: mockJWT },
    });

    const client = createSupabaseClient(request);

    // deno-lint-ignore no-explicit-any
    assertEquals(client, mockClient as any);
    assertEquals(capturedUrl, "https://test.supabase.co");
    assertEquals(capturedKey, "test-anon-key");
    assertEquals(
      (capturedOptions as { global?: { headers?: { Authorization?: string } } })
        ?.global?.headers?.Authorization,
      mockJWT,
    );
  } finally {
    createClientStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("createSupabaseClient - should use SUPABASE_URL from env", () => {
  const savedEnv = saveEnvState([
    "SUPABASE_URL",
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
    Deno.env.set("SUPABASE_URL", "https://custom.supabase.co");
    Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

    const request = new Request("https://example.com", {
      headers: { Authorization: "Bearer test-token" },
    });

    createSupabaseClient(request);

    assertEquals(capturedUrl, "https://custom.supabase.co");
  } finally {
    createClientStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("createSupabaseClient - should use SUPABASE_ANON_KEY from env", () => {
  const savedEnv = saveEnvState([
    "SUPABASE_URL",
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
    Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
    Deno.env.set("SUPABASE_ANON_KEY", "custom-anon-key");

    const request = new Request("https://example.com", {
      headers: { Authorization: "Bearer test-token" },
    });

    createSupabaseClient(request);

    assertEquals(capturedKey, "custom-anon-key");
  } finally {
    createClientStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("createSupabaseClient - should pass user JWT from Authorization header", () => {
  const savedEnv = saveEnvState([
    "SUPABASE_URL",
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
    Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
    Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

    const userJWT =
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMTIzIn0.test";
    const request = new Request("https://example.com", {
      headers: { Authorization: userJWT },
    });

    createSupabaseClient(request);

    assertEquals(
      (capturedOptions as { global?: { headers?: { Authorization?: string } } })
        ?.global?.headers?.Authorization,
      userJWT,
    );
  } finally {
    createClientStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("createSupabaseClient - should handle missing Authorization header", () => {
  const savedEnv = saveEnvState([
    "SUPABASE_URL",
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
    Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
    Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

    const request = new Request("https://example.com");

    createSupabaseClient(request);

    assertEquals(
      (capturedOptions as { global?: { headers?: { Authorization?: string } } })
        ?.global?.headers?.Authorization,
      "",
    );
  } finally {
    createClientStub.restore();
    restoreEnvState(savedEnv);
  }
});

Deno.test("createSupabaseClient - should create new client for each request", () => {
  const savedEnv = saveEnvState([
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
  ]);

  let callCount = 0;

  const createClientStub = stub(deps, "createClient", () => {
    callCount++;
    // deno-lint-ignore no-explicit-any
    return { id: callCount } as any;
  });

  try {
    Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
    Deno.env.set("SUPABASE_ANON_KEY", "test-anon-key");

    const request1 = new Request("https://example.com", {
      headers: { Authorization: "Bearer token1" },
    });
    const request2 = new Request("https://example.com", {
      headers: { Authorization: "Bearer token2" },
    });

    const client1 = createSupabaseClient(request1);
    const client2 = createSupabaseClient(request2);

    // Should create a new client for each request (no caching)
    assertEquals(callCount, 2);
    // Clients should be different instances
    assertEquals(client1 !== client2, true);
  } finally {
    createClientStub.restore();
    restoreEnvState(savedEnv);
  }
});
