/**
 * Unit tests for src/lib/auth.config.ts
 *
 * Tests the JWT and session callback logic in isolation.
 * No Prisma or bcrypt — just the pure callback function behaviour.
 */
import { describe, it, expect } from "vitest";
import { authConfig } from "@/lib/auth.config";

// Extract callback functions for direct testing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jwtCallback = authConfig.callbacks!.jwt as (args: any) => Promise<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sessionCallback = authConfig.callbacks!.session as (args: any) => Promise<any>;

// ---------------------------------------------------------------------------
// Top-level config
// ---------------------------------------------------------------------------
describe("authConfig", () => {
  it("defines the sign-in page as /admin/login", () => {
    expect(authConfig.pages?.signIn).toBe("/admin/login");
  });

  it("uses JWT as the session strategy", () => {
    expect(authConfig.session?.strategy).toBe("jwt");
  });

  it("sets session maxAge to 24 hours (86400 seconds)", () => {
    expect(authConfig.session?.maxAge).toBe(24 * 60 * 60);
  });

  it("has an empty providers array (credentials are added in auth.ts)", () => {
    expect(Array.isArray(authConfig.providers)).toBe(true);
    expect(authConfig.providers).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// jwt callback
// ---------------------------------------------------------------------------
describe("jwt callback", () => {
  it("adds user id and role to the token on sign-in", async () => {
    const token = { name: "Steve", email: "test@example.com" };
    const user = { id: "user-123", role: "ADMIN" as const };

    const result = await jwtCallback({ token, user });

    expect(result.id).toBe("user-123");
    expect(result.role).toBe("ADMIN");
  });

  it("adds CLIENT role when user has the CLIENT role", async () => {
    const token = {};
    const user = { id: "user-456", role: "CLIENT" as const };

    const result = await jwtCallback({ token, user });

    expect(result.id).toBe("user-456");
    expect(result.role).toBe("CLIENT");
  });

  it("passes undefined role through when user has no role property", async () => {
    const token = {};
    const user = { id: "user-789" }; // no role

    const result = await jwtCallback({ token, user });

    expect(result.id).toBe("user-789");
    expect(result.role).toBeUndefined();
  });

  it("returns the token unchanged when no user is provided (session refresh)", async () => {
    const token = { id: "existing-id", role: "ADMIN", name: "Steve" };

    const result = await jwtCallback({ token, user: undefined });

    expect(result).toEqual(token);
    expect(result.id).toBe("existing-id");
    expect(result.role).toBe("ADMIN");
  });

  it("returns the token unchanged when user is null", async () => {
    const token = { id: "existing-id", name: "Steve" };

    const result = await jwtCallback({ token, user: null });

    expect(result).toEqual(token);
  });

  it("preserves existing token properties alongside new id/role", async () => {
    const token = { name: "Steve", sub: "sub-123" };
    const user = { id: "user-abc", role: "ADMIN" as const };

    const result = await jwtCallback({ token, user });

    expect(result.name).toBe("Steve");
    expect(result.sub).toBe("sub-123");
    expect(result.id).toBe("user-abc");
    expect(result.role).toBe("ADMIN");
  });
});

// ---------------------------------------------------------------------------
// session callback
// ---------------------------------------------------------------------------
describe("session callback", () => {
  it("adds user id and role from token to the session user", async () => {
    const token = { id: "token-123", role: "ADMIN" as const };
    const session = { user: { name: "Steve", email: "steve@example.com" }, expires: "" };

    const result = await sessionCallback({ session, token });

    expect(result.user.id).toBe("token-123");
    expect(result.user.role).toBe("ADMIN");
  });

  it("defaults role to CLIENT when token has no role", async () => {
    const token = { id: "token-456" }; // no role
    const session = { user: { name: "Steve", email: "steve@example.com" }, expires: "" };

    const result = await sessionCallback({ session, token });

    expect(result.user.id).toBe("token-456");
    expect(result.user.role).toBe("CLIENT");
  });

  it("returns session unchanged when token has no id", async () => {
    const token = {}; // no id
    const session = { user: { name: "Steve", email: "steve@example.com" }, expires: "" };

    const result = await sessionCallback({ session, token });

    // id should not be assigned
    expect(result.user).not.toHaveProperty("id");
    expect(result.user).not.toHaveProperty("role");
  });

  it("returns session unchanged when session.user is falsy", async () => {
    const token = { id: "token-789", role: "ADMIN" };
    const session = { user: null, expires: "" };

    const result = await sessionCallback({ session, token });

    // user is null — no modification should happen
    expect(result.user).toBeNull();
  });

  it("preserves existing session properties", async () => {
    const token = { id: "token-abc", role: "CLIENT" as const };
    const session = {
      user: { name: "Alice", email: "alice@example.com" },
      expires: "2026-12-31",
    };

    const result = await sessionCallback({ session, token });

    expect(result.expires).toBe("2026-12-31");
    expect(result.user.name).toBe("Alice");
    expect(result.user.email).toBe("alice@example.com");
  });
});
