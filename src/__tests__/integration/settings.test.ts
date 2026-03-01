/**
 * Integration tests for src/lib/settings.ts
 *
 * Prisma is mocked so these run without a real database.
 * They verify the fallback / error-handling logic of getSiteSetting
 * and getSiteSettings.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock Prisma before importing anything that uses it ────────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    siteSetting: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getSiteSetting, getSiteSettings, DEFAULTS, SETTING_KEYS } from "@/lib/settings";

const mockFindUnique = prisma.siteSetting.findUnique as ReturnType<typeof vi.fn>;
const mockFindMany = prisma.siteSetting.findMany as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getSiteSetting
// ---------------------------------------------------------------------------
describe("getSiteSetting", () => {
  it("returns the database value when found", async () => {
    mockFindUnique.mockResolvedValueOnce({ key: SETTING_KEYS.BIO_TEXT, value: "Custom bio" });
    const result = await getSiteSetting(SETTING_KEYS.BIO_TEXT);
    expect(result).toBe("Custom bio");
  });

  it("falls back to DEFAULTS when the row doesn't exist", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const result = await getSiteSetting(SETTING_KEYS.BIO_TEXT);
    expect(result).toBe(DEFAULTS[SETTING_KEYS.BIO_TEXT]);
  });

  it("falls back to DEFAULTS when Prisma throws", async () => {
    mockFindUnique.mockRejectedValueOnce(new Error("DB error"));
    const result = await getSiteSetting(SETTING_KEYS.HERO_TAGLINE);
    expect(result).toBe(DEFAULTS[SETTING_KEYS.HERO_TAGLINE]);
  });

  it("returns an empty string for an unknown key with no default", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    const result = await getSiteSetting("unknown_key");
    expect(result).toBe("");
  });

  it("calls Prisma with the correct key", async () => {
    mockFindUnique.mockResolvedValueOnce(null);
    await getSiteSetting(SETTING_KEYS.AVATAR_URL);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { key: SETTING_KEYS.AVATAR_URL },
    });
  });
});

// ---------------------------------------------------------------------------
// getSiteSettings (bulk)
// ---------------------------------------------------------------------------
describe("getSiteSettings", () => {
  it("returns database values for all requested keys", async () => {
    mockFindMany.mockResolvedValueOnce([
      { key: SETTING_KEYS.AVATAR_URL, value: "https://custom.com/avatar.png" },
      { key: SETTING_KEYS.BIO_TEXT, value: "Custom bio" },
    ]);

    const result = await getSiteSettings([SETTING_KEYS.AVATAR_URL, SETTING_KEYS.BIO_TEXT]);

    expect(result[SETTING_KEYS.AVATAR_URL]).toBe("https://custom.com/avatar.png");
    expect(result[SETTING_KEYS.BIO_TEXT]).toBe("Custom bio");
  });

  it("falls back to DEFAULTS for keys missing from the DB", async () => {
    mockFindMany.mockResolvedValueOnce([
      { key: SETTING_KEYS.AVATAR_URL, value: "https://custom.com/avatar.png" },
    ]);

    const result = await getSiteSettings([
      SETTING_KEYS.AVATAR_URL,
      SETTING_KEYS.BIO_TEXT,
    ]);

    expect(result[SETTING_KEYS.BIO_TEXT]).toBe(DEFAULTS[SETTING_KEYS.BIO_TEXT]);
  });

  it("falls back to all DEFAULTS when Prisma throws", async () => {
    mockFindMany.mockRejectedValueOnce(new Error("DB error"));

    const result = await getSiteSettings([
      SETTING_KEYS.AVATAR_URL,
      SETTING_KEYS.HERO_TAGLINE,
    ]);

    expect(result[SETTING_KEYS.AVATAR_URL]).toBe(DEFAULTS[SETTING_KEYS.AVATAR_URL]);
    expect(result[SETTING_KEYS.HERO_TAGLINE]).toBe(DEFAULTS[SETTING_KEYS.HERO_TAGLINE]);
  });

  it("returns empty string for unknown keys when Prisma throws (catch ?? '' branch)", async () => {
    mockFindMany.mockRejectedValueOnce(new Error("DB error"));
    const result = await getSiteSettings(["unknown_key_in_catch"]);
    expect(result["unknown_key_in_catch"]).toBe("");
  });

  it("returns empty string for unknown keys with no default", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const result = await getSiteSettings(["unknown_key"]);
    expect(result["unknown_key"]).toBe("");
  });

  it("returns an empty object when called with no keys", async () => {
    mockFindMany.mockResolvedValueOnce([]);
    const result = await getSiteSettings([]);
    expect(result).toEqual({});
  });

  it("falls back to DEFAULTS when a found row has a null value (null-coalescing branch)", async () => {
    // row exists but value is null → should use DEFAULTS[key]
    mockFindMany.mockResolvedValueOnce([
      { key: SETTING_KEYS.AVATAR_URL, value: null },
    ]);
    const result = await getSiteSettings([SETTING_KEYS.AVATAR_URL]);
    expect(result[SETTING_KEYS.AVATAR_URL]).toBe(DEFAULTS[SETTING_KEYS.AVATAR_URL]);
  });

  it("falls back to empty string when row value is null and key has no default", async () => {
    mockFindMany.mockResolvedValueOnce([
      { key: "unknown_key", value: null },
    ]);
    const result = await getSiteSettings(["unknown_key"]);
    expect(result["unknown_key"]).toBe("");
  });
});
