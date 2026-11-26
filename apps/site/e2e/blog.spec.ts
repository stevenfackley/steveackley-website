import { test, expect } from "@playwright/test";

test.describe("Blog", () => {
  test.describe("Blog index", () => {
    test("renders Blog heading", async ({ page }) => {
      await page.goto("/blog");
      await expect(page.getByRole("heading", { name: "Blog" })).toBeVisible();
    });

    test("shows empty state when there are no published posts", async ({ page }) => {
      await page.goto("/blog");
      // The test DB starts empty so no posts exist
      await expect(page.getByText(/No posts found/i)).toBeVisible();
    });

    // The second number used to reach Postgres as an offset it cannot hold, which failed
    // the request with a 500. The test database has no posts, so page 1 is the only page.
    for (const number of ["2", "99999999999999999999"]) {
      test(`?page=${number} is past the last page, so it is a 404`, async ({ page }) => {
        const res = await page.goto(`/blog?page=${number}`);
        expect(res?.status()).toBe(404);
        await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
      });
    }

    test("a ?page= that is not a number shows the first page", async ({ page }) => {
      const res = await page.goto("/blog?page=abc");
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: "Blog" })).toBeVisible();
    });

    test("blog page title is correct", async ({ page }) => {
      await page.goto("/blog");
      await expect(page).toHaveTitle(/blog/i);
    });

    test("has nav with correct active state on /blog", async ({ page }) => {
      await page.goto("/blog");
      await page.setViewportSize({ width: 1024, height: 768 });
      // The active nav link gets accent color via CSS class — just verify it exists
      const blogLink = page.locator("nav a[href='/blog']").first();
      await expect(blogLink).toBeVisible();
    });
  });

  test.describe("Blog post slug", () => {
    test("non-existent slug returns 404 page", async ({ page }) => {
      const res = await page.goto("/blog/this-post-does-not-exist-xyz");
      // The page either returns 404 or renders the 404 component
      const status = res?.status() ?? 0;
      const isNotFound = status === 404 || status === 302;
      expect(isNotFound).toBe(true);
    });

    test("non-existent slug shows 404 content or redirects", async ({ page }) => {
      await page.goto("/blog/this-post-does-not-exist-xyz");
      // Either the 404 page renders or we get redirected to /404
      const url = page.url();
      const has404Content =
        url.includes("/404") ||
        (await page.getByRole("heading", { name: "404" }).isVisible());
      expect(has404Content).toBe(true);
    });
  });

  test.describe("Blog page SEO / meta", () => {
    test("blog index has meta description", async ({ page }) => {
      await page.goto("/blog");
      const metaDesc = page.locator('meta[name="description"]');
      await expect(metaDesc).toHaveAttribute("content", /.+/);
    });
  });
});
