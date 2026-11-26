import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Pins that every response the middleware returns carries the security headers, not only a
// page that rendered: a redirect, a rate-limit refusal and, above all, a request that threw.

const { mockGetSession, logError } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  logError: vi.fn(),
}));

// astro:middleware is a virtual module that only exists inside an Astro build.
vi.mock("astro:middleware", () => ({
  defineMiddleware: (fn: unknown) => fn,
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("@shared/lib/logger", () => ({
  withRequestId: () => ({ info: vi.fn(), warn: vi.fn(), error: logError }),
}));

import { onRequest } from "@/middleware";

const rendered = async () => new Response("ok", { status: 200 });

async function run(
  pathname: string,
  next: () => Promise<Response> = rendered,
  headers: Record<string, string> = {},
) {
  const context = {
    request: new Request(`https://steveackley.org${pathname}`, { headers }),
    locals: {} as Record<string, unknown>,
    redirect: (path: string, status = 302) =>
      new Response(null, { status, headers: { Location: path } }),
  };
  return (await (onRequest as any)(context, next)) as Response;
}

function expectSecurityHeaders(response: Response) {
  expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  expect(response.headers.get("Strict-Transport-Security")).toBe(
    "max-age=31536000; includeSubDomains",
  );
  expect(response.headers.get("X-Request-Id")).toBeTruthy();
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockGetSession.mockResolvedValue(null);
  logError.mockReset();
  // Vitest runs as a dev build; the site is served from a production build.
  vi.stubEnv("DEV", false);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("middleware security headers", () => {
  it("are on a page that rendered", async () => {
    const response = await run("/blog");
    expect(response.status).toBe(200);
    expectSecurityHeaders(response);
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=300");
  });

  it("are on the 500 for a page that threw", async () => {
    const failure = new Error("connect ECONNREFUSED 127.0.0.1:5432");
    const response = await run("/blog", async () => {
      throw failure;
    });
    expect(response.status).toBe(500);
    expectSecurityHeaders(response);
    // An error must not sit in a browser or CDN cache for five minutes.
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    // No body: Astro keeps the headers of an empty 500 and renders its error page into it.
    expect(response.body).toBeNull();
    expect(logError).toHaveBeenCalledWith("request failed", failure, {
      method: "GET",
      path: "/blog",
    });
  });

  // Astro renders the 500 page through the middleware as well. That response is an error
  // too, whatever path it is on, and must not be cached.
  it("come with no-store on any server error a page returns", async () => {
    const response = await run("/blog", async () => new Response("failed", { status: 500 }));
    expect(response.status).toBe(500);
    expectSecurityHeaders(response);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("are on the 500 when the session lookup threw", async () => {
    mockGetSession.mockRejectedValue(new Error("database is down"));
    const next = vi.fn(rendered);
    const response = await run("/blog", next);
    expect(next).not.toHaveBeenCalled();
    expect(response.status).toBe(500);
    expectSecurityHeaders(response);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("are on the redirect to the login page", async () => {
    const response = await run("/admin");
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/login");
    expectSecurityHeaders(response);
  });

  it("are on the redirect to the canonical URL", async () => {
    const response = await run("/blog/");
    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("https://steveackley.org/blog");
    expectSecurityHeaders(response);
  });

  it("are on a rate-limit refusal", async () => {
    const from = { "x-forwarded-for": "203.0.113.7" };
    for (let i = 0; i < 10; i++) {
      expect((await run("/api/upload", rendered, from)).status).toBe(200);
    }
    const response = await run("/api/upload", rendered, from);
    expect(response.status).toBe(429);
    expectSecurityHeaders(response);
  });

  it("leaves the error to the dev server, which shows it in its overlay", async () => {
    vi.stubEnv("DEV", true);
    await expect(
      run("/blog", async () => {
        throw new Error("typo in a page");
      }),
    ).rejects.toThrow("typo in a page");
  });
});
