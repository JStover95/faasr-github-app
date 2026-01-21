/**
 * Tests for cookie-utils.ts
 *
 * @see design-docs/supabase-testing.md - Testing patterns
 */

import { assertEquals } from "@std/assert";
import {
  clearAuthCookie,
  getAuthCookie,
  setAuthCookie,
} from "../../functions/_shared/cookie-utils.ts";

Deno.test("setAuthCookie - should set cookie with correct attributes", () => {
  const response = new Response();
  const token = "test_jwt_token";

  setAuthCookie(response, token);

  const cookieHeader = response.headers.get("Set-Cookie");
  assertEquals(cookieHeader !== null, true);
  assertEquals(cookieHeader?.includes("faasr_session_v2=test_jwt_token"), true);
  assertEquals(cookieHeader?.includes("HttpOnly"), true);
  assertEquals(cookieHeader?.includes("SameSite=Lax"), true);
  assertEquals(cookieHeader?.includes("Path=/"), true);
});

Deno.test("getAuthCookie - should extract token from cookie header", () => {
  const request = new Request("https://example.com", {
    headers: {
      Cookie: "faasr_session_v2=test_jwt_token; other_cookie=value",
    },
  });

  const token = getAuthCookie(request);

  assertEquals(token, "test_jwt_token");
});

Deno.test("getAuthCookie - should return null when cookie not present", () => {
  const request = new Request("https://example.com", {
    headers: {},
  });

  const token = getAuthCookie(request);

  assertEquals(token, null);
});

Deno.test("clearAuthCookie - should set expired cookie", () => {
  const response = new Response();

  clearAuthCookie(response);

  const cookieHeader = response.headers.get("Set-Cookie");
  assertEquals(cookieHeader !== null, true);
  assertEquals(cookieHeader?.includes("faasr_session_v2="), true);
  assertEquals(cookieHeader?.includes("Max-Age=0"), true);
});
