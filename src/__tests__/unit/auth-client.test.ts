/**
 * Unit tests for src/lib/auth-client.ts
 *
 * Tests the Better-Auth client configuration.
 * No real authentication occurs in these tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("auth-client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("creates an auth client without baseURL", async () => {
    const { authClient } = await import("@/lib/auth-client");
    expect(authClient).toBeDefined();
    expect(authClient).toBeTruthy();
  });

  it("auth client is callable as a function", async () => {
    const { authClient } = await import("@/lib/auth-client");
    expect(typeof authClient).toBe("function");
  });
});
