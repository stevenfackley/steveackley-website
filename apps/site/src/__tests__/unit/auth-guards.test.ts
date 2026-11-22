import { describe, it, expect, vi } from "vitest";

// astro:actions is a virtual module that only exists inside an Astro build;
// stand in a minimal ActionError so the guards can be imported here.
vi.mock("astro:actions", () => ({
  ActionError: class ActionError extends Error {
    code: string;
    constructor({ code, message }: { code: string; message: string }) {
      super(message);
      this.code = code;
    }
  },
}));

import {
  requireAdminPage,
  requireClientPage,
  requireAdminAction,
} from "@/lib/auth-guards";

type TestUser = { role: string } | null;

const users: Array<[string, TestUser]> = [
  ["signed out", null],
  ["ADMIN", { role: "ADMIN" }],
  ["CLIENT", { role: "CLIENT" }],
  ["lowercase admin", { role: "admin" }],
  ["lowercase client", { role: "client" }],
  ["empty role", { role: "" }],
  ["unknown role", { role: "EDITOR" }],
];

const adminAllowed = new Set(["ADMIN"]);
const clientAllowed = new Set(["ADMIN", "CLIENT"]);

function makeAstro(user: TestUser) {
  const redirect = vi.fn((path: string) => new Response(null, { status: 302, headers: { Location: path } }));
  return { astro: { locals: { user }, redirect } as any, redirect };
}

describe("requireAdminPage", () => {
  it.each(users)("%s", (_label, user) => {
    const { astro, redirect } = makeAstro(user);
    const result = requireAdminPage(astro);
    if (user && adminAllowed.has(user.role)) {
      expect(result).toBeNull();
      expect(redirect).not.toHaveBeenCalled();
    } else {
      expect(redirect).toHaveBeenCalledWith("/login");
      expect(result?.headers.get("Location")).toBe("/login");
    }
  });
});

describe("requireClientPage", () => {
  it.each(users)("%s", (_label, user) => {
    const { astro, redirect } = makeAstro(user);
    const result = requireClientPage(astro);
    if (user && clientAllowed.has(user.role)) {
      expect(result).toBeNull();
      expect(redirect).not.toHaveBeenCalled();
    } else {
      expect(redirect).toHaveBeenCalledWith("/login");
      expect(result?.headers.get("Location")).toBe("/login");
    }
  });
});

describe("requireAdminAction", () => {
  it.each(users)("%s", (_label, user) => {
    const context = { locals: { user } } as any;
    if (user && adminAllowed.has(user.role)) {
      expect(() => requireAdminAction(context)).not.toThrow();
    } else {
      expect(() => requireAdminAction(context)).toThrow(
        expect.objectContaining({ code: "UNAUTHORIZED", message: "Unauthorized" }),
      );
    }
  });
});
