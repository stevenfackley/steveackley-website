import { test, expect } from "@playwright/test";

test.describe("Public pages smoke tests", () => {
  test("homepage loads", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/.+/);
  });

  test("blog index loads", async ({ page }) => {
    const res = await page.goto("/blog");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "Blog" })).toBeVisible();
  });

  test("resume loads", async ({ page }) => {
    const res = await page.goto("/resume");
    expect(res?.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/resume/i);
  });

  test("resume print variant loads", async ({ page }) => {
    const res = await page.goto("/resume/print");
    expect(res?.status()).toBeLessThan(400);
    await expect(page).toHaveTitle(/.+/);
  });

  test("404 page renders for unknown route", async ({ page }) => {
    const res = await page.goto("/this-page-does-not-exist-xyz");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByRole("link", { name: /return home/i })).toBeVisible();
  });

  test("404 return-home link goes to /", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-xyz");
    const link = page.getByRole("link", { name: /return home/i });
    await expect(link).toHaveAttribute("href", "/");
  });
});
