/**
 * E2E: Blog listing & post pages
 *
 * These tests run against the public blog pages. The database may be empty
 * (CI with a fresh schema), so the tests are resilient to "no posts" states.
 */
import { test, expect } from "@playwright/test";

test.describe("Blog listing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/blog");
  });

  test("returns HTTP 200", async ({ page }) => {
    const response = await page.goto("/blog");
    expect(response?.status()).toBe(200);
  });

  test("has a page title", async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("renders a heading for the blog section", async ({ page }) => {
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
  });

  test("renders post cards OR an empty-state message", async ({ page }) => {
    // Either there are post cards, or the page shows an empty state message
    const postCards = page.locator("article, [data-testid='post-card']");
    const emptyState = page.getByText(/no posts|nothing here|coming soon/i);

    const hasCards = (await postCards.count()) > 0;
    const hasEmpty = await emptyState.isVisible().catch(() => false);

    expect(hasCards || hasEmpty).toBe(true);
  });

  test("pagination is hidden when there are no posts", async ({ page }) => {
    const postCards = page.locator("article, [data-testid='post-card']");
    const count = await postCards.count();

    if (count === 0) {
      // No pagination when no posts
      const pagination = page.locator("[aria-label='Pagination']");
      const visible = await pagination.isVisible().catch(() => false);
      expect(visible).toBe(false);
    }
  });

  test("each post card links to its slug URL", async ({ page }) => {
    const postLinks = page.locator("a[href^='/blog/']");
    const count = await postLinks.count();

    if (count > 0) {
      // Verify the first post link has a valid href
      const href = await postLinks.first().getAttribute("href");
      expect(href).toMatch(/^\/blog\/.+/);
    }
  });
});

test.describe("Blog post page (404 behaviour)", () => {
  test("returns 404 for a non-existent slug", async ({ page }) => {
    const response = await page.goto("/blog/this-post-definitely-does-not-exist-12345");
    // Next.js returns 404 for missing dynamic segments
    expect(response?.status()).toBe(404);
  });
});
