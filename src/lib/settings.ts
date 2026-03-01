import { prisma } from "./prisma";
import { SETTING_KEYS, DEFAULTS } from "./setting-keys";

// Re-export constants for backward compat (server components only)
export { SETTING_KEYS, DEFAULTS };

export async function getSiteSetting(key: string): Promise<string> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    return row?.value ?? DEFAULTS[key as keyof typeof DEFAULTS] ?? "";
  } catch {
    /* c8 ignore next */
    return DEFAULTS[key as keyof typeof DEFAULTS] ?? "";
  }
}

export async function getSiteSettings(keys: string[]): Promise<Record<string, string>> {
  try {
    const rows = await prisma.siteSetting.findMany({ where: { key: { in: keys } } });
    const map: Record<string, string> = {};
    for (const key of keys) {
      const row = rows.find((r) => r.key === key);
      map[key] = row?.value ?? DEFAULTS[key as keyof typeof DEFAULTS] ?? "";
    }
    return map;
  } catch {
    const map: Record<string, string> = {};
    for (const key of keys) {
      /* c8 ignore next */
      map[key] = DEFAULTS[key as keyof typeof DEFAULTS] ?? "";
    }
    return map;
  }
}
