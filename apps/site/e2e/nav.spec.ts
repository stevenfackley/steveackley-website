import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/blog"); // Use blog — nav name is always visible here
  });

  test("desktop nav links are present with correct hrefs", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const nav = page.locator("nav").first();
    await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    await expect(nav.getByRole("link", { name: "Resume" })).toHaveAttribute("href", "/resume");
    await expect(nav.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/blog");
    await expect(nav.getByRole("link", { name: "Contact" }).first()).toHaveAttribute(
      "href",
      /^mailto:/
    );
  });

  test("public nav does not expose a Sign In link", async ({ page }) => {
    // The top nav stays auth-free for logged-out visitors. A discreet Sign In link
    // lives in the footer (not the nav) so admins can reach /login — assert on the
    // nav specifically, mirroring the mobile-menu test below.
    await page.setViewportSize({ width: 1024, height: 768 });
    const nav = page.locator("nav").first();
    await expect(nav.getByRole("link", { name: /sign in/i })).toHaveCount(0);
  });

  test("nav name logo links to homepage", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const logo = page.locator("#nav-name");
    await expect(logo).toHaveAttribute("href", "/");
    await expect(logo).toContainText("Steve Ackley");
  });

  test("clicking nav home link navigates to homepage", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.getByRole("link", { name: "Home" }).first().click();
    await expect(page).toHaveURL("/");
  });

  test("clicking nav blog link navigates to blog", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.getByRole("link", { name: "Blog" }).first().click();
    await expect(page).toHaveURL("/blog");
  });

  test("dark mode toggle button is present", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(page.locator("#theme-toggle")).toBeVisible();
  });

  test("dark mode toggle adds/removes dark class", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    const html = page.locator("html");

    const wasDark = (await html.getAttribute("class") ?? "").includes("dark");
    await page.locator("#theme-toggle").click();
    const isDark = (await html.getAttribute("class") ?? "").includes("dark");
    expect(isDark).toBe(!wasDark);

    // Toggle back
    await page.locator("#theme-toggle").click();
    const isBack = (await html.getAttribute("class") ?? "").includes("dark");
    expect(isBack).toBe(wasDark);
  });

  test("dark mode preference persists via localStorage", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.locator("#theme-toggle").click();
    const theme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(["dark", "light"]).toContain(theme);
  });

  test.describe("Mobile menu", () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
    });

    test("mobile menu button is visible on small screens", async ({ page }) => {
      await expect(page.locator("#mobile-menu-btn")).toBeVisible();
    });

    test("mobile menu is hidden by default", async ({ page }) => {
      await expect(page.locator("#mobile-menu")).toBeHidden();
    });

    test("mobile menu opens when button is clicked", async ({ page }) => {
      await page.locator("#mobile-menu-btn").click();
      await expect(page.locator("#mobile-menu")).toBeVisible();
    });

    test("mobile menu closes on second click", async ({ page }) => {
      await page.locator("#mobile-menu-btn").click();
      await expect(page.locator("#mobile-menu")).toBeVisible();
      await page.locator("#mobile-menu-btn").click();
      await expect(page.locator("#mobile-menu")).toBeHidden();
    });

    test("mobile menu contains all nav links", async ({ page }) => {
      await page.locator("#mobile-menu-btn").click();
      const menu = page.locator("#mobile-menu");
      await expect(menu.getByRole("link", { name: "Home" })).toBeVisible();
      await expect(menu.getByRole("link", { name: "Resume" })).toBeVisible();
      await expect(menu.getByRole("link", { name: "Blog" })).toBeVisible();
      await expect(menu.getByRole("link", { name: "Contact" })).toHaveAttribute(
        "href",
        /^mailto:/
      );
    });

    test("mobile menu does not expose a Sign In link to logged-out visitors", async ({ page }) => {
      await page.locator("#mobile-menu-btn").click();
      const menu = page.locator("#mobile-menu");
      await expect(menu.getByRole("link", { name: /sign in/i })).toHaveCount(0);
    });
  });
});
