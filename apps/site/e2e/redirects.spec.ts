import { test, expect } from "@playwright/test";

/**
 * The middleware redirects /admin/* and /client/* to the Portal app
 * (http://localhost:3001 by default).  In CI the Portal is not running,
 * so we verify the redirect response itself rather than following it to
 * a live destination.
 */

async function assertRedirectsToPortal(
  page: import("@playwright/test").Page,
  path: string
) {
  const response = await page.request.get(path, {
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  // Middleware must issue a redirect (3xx)
  expect([301, 302, 307, 308]).toContain(response.status());
  // Location must preserve the original path
  const location = response.headers()["location"] ?? "";
  expect(location).toContain(path);
}

test.describe("Admin / client route redirects", () => {
  const adminPaths = [
    "/admin",
    "/admin/login",
    "/admin/dashboard",
    "/admin/posts",
    "/admin/settings",
  ];

  for (const path of adminPaths) {
    test(`GET ${path} redirects to portal preserving path`, async ({ page }) => {
      await assertRedirectsToPortal(page, path);
    });
  }

  test("GET /client redirects to portal preserving path", async ({ page }) => {
    await assertRedirectsToPortal(page, "/client");
  });

  test("GET /client/dashboard redirects to portal preserving path", async ({ page }) => {
    await assertRedirectsToPortal(page, "/client/dashboard");
  });
});

test.describe("Auth link destinations", () => {
  test("sign in link in nav points to /admin/login", async ({ page }) => {
    await page.goto("/blog");
    await page.setViewportSize({ width: 1024, height: 768 });
    const signIn = page.getByRole("link", { name: /sign in/i }).first();
    await expect(signIn).toHaveAttribute("href", "/admin/login");
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
});
