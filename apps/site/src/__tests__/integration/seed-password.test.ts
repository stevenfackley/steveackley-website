/**
 * Verifies that the admin-seed password hasher (docker/password.cjs) produces a
 * hash that Better Auth itself accepts. This is the load-bearing guarantee: the
 * container seed must provision a credential Better Auth can actually verify,
 * otherwise admin login silently breaks on every deploy.
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { hashPassword as baHashPassword, verifyPassword as baVerifyPassword } from "better-auth/crypto";

const require = createRequire(import.meta.url);
// docker/password.cjs lives at the repo root, outside this package.
const { hashPassword, isScryptHash } = require("../../../../../docker/password.cjs");

describe("admin-seed password hashing", () => {
  it("produces a hash Better Auth can verify", async () => {
    const password = "S0me-Str0ng-Passw0rd!";
    const hash = await hashPassword(password);
    await expect(baVerifyPassword({ hash, password })).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(baVerifyPassword({ hash, password: "wrong" })).resolves.toBe(false);
  });

  it("emits the salt:key hex format Better Auth expects", async () => {
    const hash = await hashPassword("whatever");
    // 16-byte salt (32 hex chars) ':' 64-byte key (128 hex chars)
    expect(hash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
  });

  it("can verify a hash produced by Better Auth (params match both ways)", async () => {
    const password = "round-trip-check";
    const baHash = await baHashPassword(password);
    expect(isScryptHash(baHash)).toBe(true);
  });

  it("detects scrypt-format strings and rejects bcrypt", () => {
    expect(isScryptHash("a".repeat(32) + ":" + "b".repeat(128))).toBe(true);
    expect(isScryptHash("$2b$10$abcdefghijklmnopqrstuv")).toBe(false);
    expect(isScryptHash("")).toBe(false);
  });
});
