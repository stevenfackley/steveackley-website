/**
 * Integration tests for src/lib/settings.ts
 *
 * Drizzle db is mocked so these run without a real database.
 * They verify the fallback / error-handling logic of getSiteSetting
 * and getSiteSettings.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mock state accessible inside vi.mock factory ─────────────────────
const mockState = vi.hoisted(() => ({
  rows: [] as Array<{ key: string; value: string | null }>,
  throws: false,
}));

// ── Mock @/db before importing anything that uses it ─────────────────────────
vi.mock("@/db", () => {
  function buildQuery() {
    if (mockState.throws) {
      const p = Promise.reject(new Error("DB error"));
      return Object.assign(p, { limit: () => p });
    }
    const rows = mockState.rows.slice();
    const p = Promise.resolve(rows);
    return Object.assign(p, { limit: () => Promise.resolve(rows) });
  }
  return {
    db: { select: () => ({ from: () => ({ where: buildQuery }) }) },
    siteSettings: {},
  };
});

import { getSiteSetting, getSiteSettings, DEFAULTS, SETTING_KEYS } from "@/lib/settings";

beforeEach(() => {
  mockState.rows = [];
  mockState.throws = false;
});

// ---------------------------------------------------------------------------
// getSiteSetting
// ---------------------------------------------------------------------------
describe("getSiteSetting", () => {
  it("returns the database value when found", async () => {
    mockState.rows = [{ key: SETTING_KEYS.BIO_TEXT, value: "Custom bio" }];
    const result = await getSiteSetting(SETTING_KEYS.BIO_TEXT);
    expect(result).toBe("Custom bio");
  });

  it("falls back to DEFAULTS when the row doesn't exist", async () => {
    mockState.rows = [];
    const result = await getSiteSetting(SETTING_KEYS.BIO_TEXT);
    expect(result).toBe(DEFAULTS[SETTING_KEYS.BIO_TEXT]);
  });

  it("falls back to DEFAULTS when db throws", async () => {
    mockState.throws = true;
    const result = await getSiteSetting(SETTING_KEYS.HERO_TAGLINE);
    expect(result).toBe(DEFAULTS[SETTING_KEYS.HERO_TAGLINE]);
  });

  it("returns an empty string for an unknown key with no default", async () => {
    mockState.rows = [];
    const result = await getSiteSetting("unknown_key");
    expect(result).toBe("");
  });
});

// ---------------------------------------------------------------------------
// getSiteSettings (bulk)
// ---------------------------------------------------------------------------
describe("getSiteSettings", () => {
  it("returns database values for all requested keys", async () => {
    mockState.rows = [
      { key: SETTING_KEYS.AVATAR_URL, value: "https://custom.com/avatar.png" },
      { key: SETTING_KEYS.BIO_TEXT, value: "Custom bio" },
    ];

    const result = await getSiteSettings([SETTING_KEYS.AVATAR_URL, SETTING_KEYS.BIO_TEXT]);

    expect(result[SETTING_KEYS.AVATAR_URL]).toBe("https://custom.com/avatar.png");
    expect(result[SETTING_KEYS.BIO_TEXT]).toBe("Custom bio");
  });

  it("falls back to DEFAULTS for keys missing from the DB", async () => {
    mockState.rows = [{ key: SETTING_KEYS.AVATAR_URL, value: "https://custom.com/avatar.png" }];

    const result = await getSiteSettings([SETTING_KEYS.AVATAR_URL, SETTING_KEYS.BIO_TEXT]);

    expect(result[SETTING_KEYS.BIO_TEXT]).toBe(DEFAULTS[SETTING_KEYS.BIO_TEXT]);
  });

  it("falls back to all DEFAULTS when db throws", async () => {
    mockState.throws = true;

    const result = await getSiteSettings([SETTING_KEYS.AVATAR_URL, SETTING_KEYS.HERO_TAGLINE]);

    expect(result[SETTING_KEYS.AVATAR_URL]).toBe(DEFAULTS[SETTING_KEYS.AVATAR_URL]);
    expect(result[SETTING_KEYS.HERO_TAGLINE]).toBe(DEFAULTS[SETTING_KEYS.HERO_TAGLINE]);
  });

  it("returns empty string for unknown keys when db throws", async () => {
    mockState.throws = true;
    const result = await getSiteSettings(["unknown_key_in_catch"]);
    expect(result["unknown_key_in_catch"]).toBe("");
  });

  it("returns empty string for unknown keys with no default", async () => {
    mockState.rows = [];
    const result = await getSiteSettings(["unknown_key"]);
    expect(result["unknown_key"]).toBe("");
  });

  it("returns an empty object when called with no keys", async () => {
    mockState.rows = [];
    const result = await getSiteSettings([]);
    expect(result).toEqual({});
  });

  it("falls back to DEFAULTS when a found row has a null value", async () => {
    mockState.rows = [{ key: SETTING_KEYS.AVATAR_URL, value: null }];
    const result = await getSiteSettings([SETTING_KEYS.AVATAR_URL]);
    expect(result[SETTING_KEYS.AVATAR_URL]).toBe(DEFAULTS[SETTING_KEYS.AVATAR_URL]);
  });

  it("falls back to empty string when row value is null and key has no default", async () => {
    mockState.rows = [{ key: "unknown_key", value: null }];
    const result = await getSiteSettings(["unknown_key"]);
    expect(result["unknown_key"]).toBe("");
  });
});
