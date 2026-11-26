import { test, expect } from "@playwright/test";

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
});
