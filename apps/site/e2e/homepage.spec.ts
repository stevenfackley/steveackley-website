import { test, expect } from "@playwright/test";

// The HomeDashboard island (client:load) renders a hero plus anchored sections
// with a sticky scrollspy nav (nav[aria-label="Page sections"]).
const waitForDashboard = async (page: import("@playwright/test").Page) => {
  await page.waitForSelector("#hero-name");
};

const sectionNav = (page: import("@playwright/test").Page) =>
  page.locator('nav[aria-label="Page sections"]');

test.describe("Homepage / HomeDashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForDashboard(page);
  });

  // Assertions on island-prop-derived text are scoped to <main>: the Astro dev
  // toolbar mirrors island props into a <code> element, which would otherwise
  // trip strict mode when running against `astro dev`.
  test.describe("Hero", () => {
    test("shows hero name and title", async ({ page }) => {
      const main = page.locator("main");
      await expect(main.getByRole("heading", { name: "Steve Ackley" })).toBeVisible();
      await expect(main.getByText("Software Engineer · .NET · AWS · Full-Stack")).toBeVisible();
    });

    test("shows location badge", async ({ page }) => {
      await expect(page.locator("main").getByText(/United States/)).toBeVisible();
    });

    test("shows availability label", async ({ page }) => {
      await expect(page.locator("main").getByText(/Available for opportunities/)).toBeVisible();
    });

    test("shows resume and contact CTAs", async ({ page }) => {
      await expect(page.getByRole("link", { name: "View Resume" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Get in Touch" })).toBeVisible();
    });
  });

  test.describe("Section anchor nav", () => {
    test("all 5 section links are visible", async ({ page }) => {
      const labels = ["About", "Skills", "Projects", "Blog", "Connect"];
      for (const label of labels) {
        await expect(sectionNav(page).getByRole("link", { name: label })).toBeVisible();
      }
    });

    test("clicking a section link navigates to its anchor", async ({ page }) => {
      await sectionNav(page).getByRole("link", { name: "Skills" }).click();
      await expect(page).toHaveURL(/#skills$/);
      await expect(page.locator("#skills")).toBeInViewport();
    });
  });

  test.describe("Section content", () => {
    test("all sections render with headings", async ({ page }) => {
      for (const id of ["about", "skills", "projects", "blog", "connect"]) {
        await expect(page.locator(`section#${id}`)).toHaveCount(1);
      }
      await expect(page.getByRole("heading", { name: "About", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Skills", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Writing", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Connect", exact: true })).toBeVisible();
    });

    test("about section shows interests", async ({ page }) => {
      await expect(page.locator("section#about").getByText(/Tinkering & Tech/)).toBeVisible();
    });

    test("skills section shows core categories", async ({ page }) => {
      const skills = page.locator("section#skills");
      await expect(skills.getByText(/Microsoft Backend/)).toBeVisible();
      await expect(skills.getByText("C# / .NET 10", { exact: true })).toBeVisible();
    });

    test("connect section shows contact channels", async ({ page }) => {
      const connect = page.locator("section#connect");
      await expect(connect.getByRole("heading", { name: "Connect", exact: true })).toBeVisible();
      await expect(connect.getByText("LinkedIn", { exact: true })).toBeVisible();
      await expect(connect.getByText("GitHub", { exact: true })).toBeVisible();
    });
  });
});
