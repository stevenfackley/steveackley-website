import { test, expect } from "@playwright/test";

// The TabsDashboard is client:only="react" — wait for it to hydrate
const waitForDashboard = async (page: import("@playwright/test").Page) => {
  await page.waitForSelector('nav[aria-label="Dashboard sections"]');
};

test.describe("Homepage / BentoDashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);
  });

  test.describe("Tab bar", () => {
    test("all 6 tabs are visible", async ({ page }) => {
      const tabs = ["Overview", "About", "Skills", "Projects", "Blog", "Connect"];
      for (const label of tabs) {
        await expect(page.getByRole("button", { name: label })).toBeVisible();
      }
    });

    test("Overview is the default active tab", async ({ page }) => {
      // Overview panel: hero name is visible
      await expect(page.getByRole("heading", { name: "Steve Ackley" })).toBeVisible();
    });

    test("switching to About tab shows about content", async ({ page }) => {
      await page.getByRole("button", { name: "About" }).click();
      // About panel has "About" section label
      await expect(page.getByText(/about/i).first()).toBeVisible();
    });

    test("switching to Skills tab shows skills content", async ({ page }) => {
      await page.getByRole("button", { name: "Skills" }).click();
      await expect(page.getByText(/skills/i).first()).toBeVisible();
    });

    test("switching to Projects tab shows projects content", async ({ page }) => {
      await page.getByRole("button", { name: "Projects" }).click();
      await expect(page.getByText(/projects/i).first()).toBeVisible();
    });

    test("switching to Blog tab shows blog content", async ({ page }) => {
      await page.getByRole("button", { name: "Blog" }).click();
      await expect(page.getByText(/blog/i).first()).toBeVisible();
    });

    test("switching to Connect tab shows connect content", async ({ page }) => {
      await page.getByRole("button", { name: "Connect" }).click();
      await expect(page.getByText(/connect/i).first()).toBeVisible();
    });

    test("switching tabs only shows one panel at a time", async ({ page }) => {
      // Click About — Overview hero heading should disappear
      await page.getByRole("button", { name: "About" }).click();
      await expect(page.getByRole("heading", { name: "Steve Ackley" })).not.toBeVisible();
      // Back to Overview
      await page.getByRole("button", { name: "Overview" }).click();
      await expect(page.getByRole("heading", { name: "Steve Ackley" })).toBeVisible();
    });
  });

  test.describe("Overview panel content", () => {
    test("shows hero name and title", async ({ page }) => {
      await expect(page.getByRole("heading", { name: "Steve Ackley" })).toBeVisible();
      await expect(page.getByText("Software Engineer · .NET · Azure · Full-Stack")).toBeVisible();
    });

    test("shows location badge", async ({ page }) => {
      await expect(page.getByText(/United States/)).toBeVisible();
    });

    test("shows availability label", async ({ page }) => {
      await expect(page.getByText(/Available for opportunities/)).toBeVisible();
    });

    test("shows skills overview section", async ({ page }) => {
      await expect(page.getByText(/Skills & Stack/)).toBeVisible();
      await expect(page.getByText("C# / .NET")).toBeVisible();
    });

    test("shows about section with interests", async ({ page }) => {
      await expect(page.getByText(/Tinkering & Tech/)).toBeVisible();
    });
  });
});
