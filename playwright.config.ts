import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration.
 *
 * In CI: expects the app to already be built and started externally
 *        (via `npm run build && npm run start`), and DATABASE_URL must
 *        point at a seeded test database.
 * Locally: `webServer` spins up `next dev` automatically.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in source. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI to absorb flakiness */
  retries: process.env.CI ? 2 : 0,
  /* Single worker in CI to avoid port conflicts */
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "html",

  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Start a dev server when running locally */
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
