import { describe, it, expect } from "vitest";
import { isDefaultAdminEmail, DEFAULT_ADMIN_EMAIL } from "@/lib/admin";

describe("isDefaultAdminEmail", () => {
  it("returns true for the exact default admin email", () => {
    expect(isDefaultAdminEmail(DEFAULT_ADMIN_EMAIL)).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isDefaultAdminEmail(DEFAULT_ADMIN_EMAIL.toUpperCase())).toBe(true);
  });

  it("trims leading and trailing whitespace", () => {
    expect(isDefaultAdminEmail(`  ${DEFAULT_ADMIN_EMAIL}  `)).toBe(true);
  });

  it("returns false for a different email", () => {
    expect(isDefaultAdminEmail("someone@example.com")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isDefaultAdminEmail("")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isDefaultAdminEmail(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isDefaultAdminEmail(undefined)).toBe(false);
  });

  it("returns false for a partial match", () => {
    const partial = DEFAULT_ADMIN_EMAIL.split("@")[0];
    expect(isDefaultAdminEmail(partial)).toBe(false);
  });
});
