import { describe, it, expect, vi, beforeEach } from "vitest";

// Pins the portal protection in middleware.ts: which roles reach /admin and
// /client, and that everyone else is sent to /login.

const { mockGetSession } = vi.hoisted(() => ({ mockGetSession: vi.fn() }));

// astro:middleware is a virtual module that only exists inside an Astro build.
vi.mock("astro:middleware", () => ({
  defineMiddleware: (fn: unknown) => fn,
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@shared/lib/logger", () => ({
  withRequestId: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { onRequest } from "@/middleware";

type TestUser = { role: string } | null;

const users: Array<[string, TestUser]> = [
  ["signed out", null],
  ["ADMIN", { role: "ADMIN" }],
  ["CLIENT", { role: "CLIENT" }],
  ["lowercase admin", { role: "admin" }],
  ["empty role", { role: "" }],
  ["unknown role", { role: "EDITOR" }],
];

async function run(pathname: string, user: TestUser) {
  mockGetSession.mockResolvedValue(user ? { user, session: { id: "s1" } } : null);
  const redirect = vi.fn(
    (path: string, status = 302) => new Response(null, { status, headers: { Location: path } }),
  );
  const next = vi.fn(async () => new Response("ok", { status: 200 }));
  const context = {
    request: new Request(`https://steveackley.org${pathname}`),
    locals: {} as Record<string, unknown>,
    redirect,
  };
  const response = (await (onRequest as any)(context, next)) as Response;
  return { response, redirect, next, locals: context.locals };
}

beforeEach(() => {
  mockGetSession.mockReset();
});

describe("middleware portal protection", () => {
  const cases: Array<[string, Set<string> | "all"]> = [
    ["/admin", new Set(["ADMIN"])],
    ["/admin/posts", new Set(["ADMIN"])],
    ["/client", new Set(["ADMIN", "CLIENT"])],
    ["/client/messages", new Set(["ADMIN", "CLIENT"])],
    // Look-alike paths are not portal paths.
    ["/administrator", "all"],
    ["/clients", "all"],
    ["/blog", "all"],
  ];

  for (const [pathname, allowed] of cases) {
    describe(pathname, () => {
      it.each(users)("%s", async (_label, user) => {
        const { response, redirect, next, locals } = await run(pathname, user);
        expect(locals.user).toEqual(user);
        const passes = allowed === "all" || (user !== null && allowed.has(user.role));
        if (passes) {
          expect(redirect).not.toHaveBeenCalled();
          expect(next).toHaveBeenCalledTimes(1);
          expect(response.status).toBe(200);
        } else {
          expect(redirect).toHaveBeenCalledWith("/login");
          expect(next).not.toHaveBeenCalled();
          expect(response.headers.get("Location")).toBe("/login");
        }
      });
    });
  }
});
