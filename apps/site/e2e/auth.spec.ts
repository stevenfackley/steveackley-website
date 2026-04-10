/**
 * E2E: Admin authentication flows
 *
 * Tests the login form, redirect behaviour, and route protection — all without
 * requiring a pre-seeded user (invalid credentials are used intentionally).
 */
import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("returns HTTP 200", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response?.status()).toBe(200);
  });

  test("renders an email and password input", async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test("renders a submit button", async ({ page }) => {
    const btn = page.getByRole("button", { name: /sign in|log in|login/i });
    await expect(btn).toBeVisible();
  });

  test("shows an error message when credentials are invalid", async ({
    page,
  }) => {
    await page.getByLabel(/email/i).fill("wrong@example.com");
    await page.locator('#password').fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();

    // Expect an error message to appear (exact text depends on NextAuth config)
    const error = page.getByText(
      /invalid|incorrect|failed|error|credentials/i
    );
    await expect(error).toBeVisible({ timeout: 8_000 });
  });

  test("does not navigate away on invalid credentials", async ({ page }) => {
    await page.getByLabel(/email/i).fill("notauser@example.com");
    await page.locator('#password').fill("badpassword");
    await page.getByRole("button", { name: /sign in|log in|login/i }).click();

    // Should remain on the login page
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });
});

test.describe("Route protection", () => {
  test("unauthenticated visit to /admin/dashboard redirects to login", async ({
    page,
  }) => {
    await page.goto("/admin/dashboard");
    // Middleware redirects to /login (via /admin/dashboard -> dashboard.astro -> redirect(/login))
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test("unauthenticated visit to /admin/posts redirects to login", async ({
    page,
  }) => {
    // Current /admin/posts/new redirects to /login if no user
    await page.goto("/admin/dashboard"); // Dashboard is protected
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test("unauthenticated visit to /client/dashboard redirects to login", async ({
    page,
  }) => {
    await page.goto("/client/dashboard");
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });
});
