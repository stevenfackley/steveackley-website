/**
 * Theme resolution + persistence helpers.
 *
 * Intentionally DOM-free and side-effect-free so the logic is unit-testable in
 * a plain Node environment. The actual DOM glue (reading `localStorage`,
 * `matchMedia`, toggling the `.dark` class) lives in the component scripts that
 * import these helpers — and a hand-mirrored copy of {@link resolveTheme} runs
 * inline in `BaseLayout.astro` before first paint to avoid a flash of the wrong
 * theme.
 */

/** A concrete, applied theme. */
export type Theme = "light" | "dark";

/**
 * A theme *preference*. `"system"` (or any unrecognised value) means "follow the
 * OS `prefers-color-scheme`". Used for the site-wide default.
 */
export type ThemePreference = Theme | "system";

/** localStorage key holding the visitor's explicit, persisted choice. */
export const THEME_STORAGE_KEY = "theme";

/** Narrowing guard: is the value one of the concrete themes? */
export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

/**
 * Read a previously persisted, explicit theme choice from a storage-like object.
 * Returns `null` when nothing valid is stored, or if storage access throws
 * (e.g. Safari private mode, disabled cookies).
 */
export function readStoredTheme(
  storage: Pick<Storage, "getItem"> | null | undefined,
): Theme | null {
  if (!storage) return null;
  try {
    const value = storage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * Persist an explicit theme choice. Swallows storage errors so a failed write
 * never breaks toggling.
 */
export function writeStoredTheme(
  theme: Theme,
  storage: Pick<Storage, "setItem"> | null | undefined,
): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore (storage unavailable) */
  }
}

/**
 * Resolve the theme to apply, in priority order:
 *   1. the visitor's persisted choice (`stored`), if valid;
 *   2. an explicit site default of `"light"` / `"dark"` set by the admin;
 *   3. otherwise the OS preference (`prefersDark`) — this is the `"system"` path.
 */
export function resolveTheme(opts: {
  stored?: string | null;
  siteDefault?: string | null;
  prefersDark?: boolean;
}): Theme {
  const { stored, siteDefault, prefersDark = false } = opts;
  if (isTheme(stored)) return stored;
  if (isTheme(siteDefault)) return siteDefault;
  return prefersDark ? "dark" : "light";
}

/** The opposite theme — used by the toggle button. */
export function nextTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}
