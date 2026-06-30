import { describe, it, expect, vi } from "vitest";
import {
  THEME_STORAGE_KEY,
  isTheme,
  readStoredTheme,
  writeStoredTheme,
  resolveTheme,
  nextTheme,
} from "@/lib/theme";

/** Minimal in-memory Storage stand-in for the bits the helpers touch. */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
    _data: data,
  };
}

// ---------------------------------------------------------------------------
// isTheme
// ---------------------------------------------------------------------------
describe("isTheme", () => {
  it("accepts the two concrete themes", () => {
    expect(isTheme("light")).toBe(true);
    expect(isTheme("dark")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isTheme("system")).toBe(false);
    expect(isTheme("")).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(isTheme(undefined)).toBe(false);
    expect(isTheme(1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// readStoredTheme
// ---------------------------------------------------------------------------
describe("readStoredTheme", () => {
  it("returns a valid stored theme", () => {
    expect(readStoredTheme(fakeStorage({ [THEME_STORAGE_KEY]: "dark" }))).toBe(
      "dark",
    );
  });

  it("returns null for an invalid stored value", () => {
    expect(
      readStoredTheme(fakeStorage({ [THEME_STORAGE_KEY]: "purple" })),
    ).toBeNull();
  });

  it("returns null when nothing is stored", () => {
    expect(readStoredTheme(fakeStorage())).toBeNull();
  });

  it("returns null when storage is missing", () => {
    expect(readStoredTheme(null)).toBeNull();
    expect(readStoredTheme(undefined)).toBeNull();
  });

  it("returns null (not throw) when getItem throws", () => {
    const throwing = {
      getItem: () => {
        throw new Error("denied");
      },
    };
    expect(readStoredTheme(throwing)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// writeStoredTheme
// ---------------------------------------------------------------------------
describe("writeStoredTheme", () => {
  it("persists the theme under the storage key", () => {
    const store = fakeStorage();
    writeStoredTheme("dark", store);
    expect(store._data.get(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("is a no-op when storage is missing", () => {
    expect(() => writeStoredTheme("light", null)).not.toThrow();
  });

  it("swallows storage write errors", () => {
    const throwing = {
      setItem: vi.fn(() => {
        throw new Error("quota");
      }),
    };
    expect(() => writeStoredTheme("dark", throwing)).not.toThrow();
    expect(throwing.setItem).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// resolveTheme — the no-FOUC resolution priority
// ---------------------------------------------------------------------------
describe("resolveTheme", () => {
  it("prefers a valid persisted choice above everything", () => {
    expect(
      resolveTheme({ stored: "light", siteDefault: "dark", prefersDark: true }),
    ).toBe("light");
  });

  it("falls back to an explicit admin light/dark default", () => {
    expect(
      resolveTheme({ stored: null, siteDefault: "dark", prefersDark: false }),
    ).toBe("dark");
  });

  it("follows the OS preference when the site default is 'system'", () => {
    expect(
      resolveTheme({ stored: null, siteDefault: "system", prefersDark: true }),
    ).toBe("dark");
    expect(
      resolveTheme({ stored: null, siteDefault: "system", prefersDark: false }),
    ).toBe("light");
  });

  it("treats an unknown/missing site default as 'system' (OS-driven)", () => {
    expect(resolveTheme({ prefersDark: true })).toBe("dark");
    expect(resolveTheme({})).toBe("light");
  });

  it("ignores an invalid stored value and moves on", () => {
    expect(
      resolveTheme({ stored: "neon", siteDefault: "system", prefersDark: true }),
    ).toBe("dark");
  });
});

// ---------------------------------------------------------------------------
// nextTheme
// ---------------------------------------------------------------------------
describe("nextTheme", () => {
  it("flips dark to light and back", () => {
    expect(nextTheme("dark")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
  });
});
