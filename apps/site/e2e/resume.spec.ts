import { test, expect } from "@playwright/test";

test.describe("Resume", () => {
  test.describe("/resume", () => {
    test("loads successfully", async ({ page }) => {
      const res = await page.goto("/resume");
      expect(res?.status()).toBeLessThan(400);
    });

    test("has resume in page title", async ({ page }) => {
      await page.goto("/resume");
      await expect(page).toHaveTitle(/resume/i);
    });

    test("has nav with resume link active", async ({ page }) => {
      await page.goto("/resume");
      await page.setViewportSize({ width: 1024, height: 768 });
      await expect(page.locator("nav a[href='/resume']").first()).toBeVisible();
    });

    test("renders hero name", async ({ page }) => {
      await page.goto("/resume");
      await expect(page.getByRole("heading", { name: "Steve Ackley" })).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("/resume/print", () => {
    test("loads successfully", async ({ page }) => {
      const res = await page.goto("/resume/print");
      expect(res?.status()).toBeLessThan(400);
    });

    test("print variant has a page title", async ({ page }) => {
      await page.goto("/resume/print");
      await expect(page).toHaveTitle(/.+/);
    });
  });
});
