import { test, expect } from "@playwright/test";

/**
 * The scheduled-publish route is fail-closed: without CRON_SECRET on the
 * server it answers 401 to everyone. CI builds and starts the site with no
 * CRON_SECRET, so this runs against the built server in exactly that state.
 * (That the built route still contains its real work is checked right after
 * the build, by scripts/check-built-routes.mjs.)
 */
test.describe("Scheduled-publish route", () => {
  const path = "/api/cron/publish-scheduled";

  test("answers 401 with no Authorization header", async ({ request }) => {
    const response = await request.get(path, { failOnStatusCode: false });

    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  test("answers 401 to a bearer token when no secret is configured", async ({ request }) => {
    const response = await request.get(path, {
      failOnStatusCode: false,
      headers: { authorization: "Bearer anything" },
    });

    expect(response.status()).toBe(401);
  });

  test("answers 401 to an empty bearer token", async ({ request }) => {
    const response = await request.get(path, {
      failOnStatusCode: false,
      headers: { authorization: "Bearer " },
    });

    expect(response.status()).toBe(401);
  });
});
