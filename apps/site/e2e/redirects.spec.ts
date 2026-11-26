import { test, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer, type AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";

/**
 * The middleware redirects unauthenticated /admin/* and /client/* requests
 * to /login (see src/middleware.ts). We verify the redirect response itself
 * rather than following it, since no session is seeded for these requests.
 */

async function assertRedirectsToLogin(
  page: import("@playwright/test").Page,
  path: string
) {
  const response = await page.request.get(path, {
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  // Must issue a redirect (3xx)
  expect([301, 302, 307, 308]).toContain(response.status());
  // Location must point to /login or /admin/login (which redirects to /login)
  const location = response.headers()["location"] ?? "";
  expect(location).toMatch(/\/login/);
}

test.describe("Admin / client route redirects", () => {
  const protectedPaths = [
    "/admin",
    "/admin/dashboard",
    "/admin/posts",
    "/admin/settings",
    "/client",
    "/client/dashboard",
  ];

  for (const path of protectedPaths) {
    test(`GET ${path} redirects to login when unauthenticated`, async ({ page }) => {
      await assertRedirectsToLogin(page, path);
    });
  }
});

test.describe("Auth link destinations", () => {
  test("/login route is reachable directly", async ({ page }) => {
    // The public nav no longer surfaces "Sign In" (PR #111). Admins still reach
    // the login page by typing the URL or via the post-sign-out redirect.
    const response = await page.goto("/login");
    expect(response?.ok()).toBe(true);
  });
});

test.describe("Security headers", () => {
  test("responses include Content-Security-Policy header", async ({ page }) => {
    const res = await page.goto("/");
    const csp = res?.headers()["content-security-policy"];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src");
    expect(csp).toContain("frame-ancestors");
  });

  test("CSP is present on blog page", async ({ page }) => {
    const res = await page.goto("/blog");
    const csp = res?.headers()["content-security-policy"];
    expect(csp).toBeTruthy();
  });

  // The browser reports a refused asset only in the console, so listen there. A production
  // build can turn a small file into a data: URI that the policy does not allow; `astro dev`
  // never inlines, so this can only fail against a built site, which is how CI runs it.
  for (const path of ["/", "/blog", "/resume"]) {
    test(`the policy refuses nothing that ${path} loads`, async ({ page }) => {
      const refused: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error" && msg.text().includes("Content Security Policy")) {
          refused.push(msg.text().slice(0, 160));
        }
      });
      await page.goto(path, { waitUntil: "load" });
      expect(refused).toEqual([]);
    });
  }

  test("a redirect carries the headers too", async ({ request }) => {
    const res = await request.get("/admin", { maxRedirects: 0, failOnStatusCode: false });
    expect(res.status()).toBe(302);
    expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers()["strict-transport-security"]).toBeTruthy();
  });

  // The middleware answers a failed page with an empty 500 and relies on Astro to keep that
  // response's headers. Only a real failure in a built server shows whether it still does, so
  // start a second copy of the site whose database cannot be reached and ask it for a page
  // that reads from the database.
  test("a page that fails still carries the headers", async ({ request }, testInfo) => {
    const entry = fileURLToPath(new URL("../dist/server/entry.mjs", import.meta.url));
    // CI always has a build, so there a missing one fails the test instead of skipping it.
    test.skip(
      !process.env.CI && !existsSync(entry),
      "needs a production build; `astro dev` shows its error overlay instead",
    );

    const port = await freePort();
    const origin = `http://127.0.0.1:${port}`;
    const server = spawn(process.execPath, [entry], {
      env: {
        BETTER_AUTH_SECRET: "e2e-secret-not-for-production-0000000000",
        ...process.env,
        // Nothing listens on port 1, so every query is refused at once.
        DATABASE_URL: "postgres://127.0.0.1:1/unreachable",
        BETTER_AUTH_URL: origin,
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: String(port),
      },
    });
    let output = "";
    server.stdout.on("data", (chunk) => (output += chunk));
    server.stderr.on("data", (chunk) => (output += chunk));

    try {
      await expect
        .poll(() => request.get(`${origin}/api/health`).then((r) => r.status(), () => 0), {
          message: "the second server never answered",
          timeout: 20_000,
        })
        .toBeGreaterThan(0);

      const res = await request.get(`${origin}/blog`, { failOnStatusCode: false });
      expect(res.status()).toBe(500);
      expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
      expect(res.headers()["strict-transport-security"]).toBeTruthy();
      expect(res.headers()["x-request-id"]).toBeTruthy();
      expect(res.headers()["cache-control"]).toBe("no-store");
    } finally {
      server.kill();
      await testInfo.attach("second server output", { body: output, contentType: "text/plain" });
    }
  });
});

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as AddressInfo;
      probe.close(() => resolve(port));
    });
  });
}
