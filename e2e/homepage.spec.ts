/**
 * E2E: Homepage (public — no auth required)
 *
 * Tests that the bento/portfolio homepage renders its key sections and that
 * basic navigation links are present and reachable.
 */
import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("returns HTTP 200", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
  });

  test("has a meaningful page title", async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("renders the hero / name section", async ({ page }) => {
    // The hero card should have the owner's name somewhere prominent
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
  });

  test("contains a navigation bar", async ({ page }) => {
    // Use first() — the homepage renders multiple nav elements (main nav + tab nav)
    const nav = page.getByRole("navigation").first();
    await expect(nav).toBeVisible();
  });

  test("navigation has a link to the blog", async ({ page }) => {
    const blogLink = page.getByRole("link", { name: /blog/i });
    await expect(blogLink.first()).toBeVisible();
  });

  test("navigation has a link to the resume", async ({ page }) => {
    const resumeLink = page.getByRole("link", { name: /resume/i });
    await expect(resumeLink.first()).toBeVisible();
  });

  test("clicking the blog nav link navigates to /blog", async ({ page }) => {
    await page.getByRole("link", { name: /blog/i }).first().click();
    await expect(page).toHaveURL(/\/blog/);
  });

  test("page has no broken images (all <img> elements load)", async ({
    page,
  }) => {
    const failedImages = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("img"))
        .filter((img) => !img.naturalWidth && img.complete)
        .map((img) => img.src);
    });
    expect(failedImages).toHaveLength(0);
  });
});
