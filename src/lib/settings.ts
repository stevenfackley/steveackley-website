import { db, siteSettings } from "@/db";
import { eq, inArray } from "drizzle-orm";
import { SETTING_KEYS, DEFAULTS } from "./setting-keys";

export async function getSiteSetting(key: string): Promise<string> {
  try {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1);
    return row?.value ?? DEFAULTS[key as keyof typeof DEFAULTS] ?? "";
  } catch {
    return DEFAULTS[key as keyof typeof DEFAULTS] ?? "";
  }
}

export async function getSiteSettings(keys: string[]): Promise<Record<string, string>> {
  try {
    const rows = await db
      .select()
      .from(siteSettings)
      .where(inArray(siteSettings.key, keys));
    const map: Record<string, string> = {};
    for (const key of keys) {
      const row = rows.find((r) => r.key === key);
      map[key] = row?.value ?? DEFAULTS[key as keyof typeof DEFAULTS] ?? "";
    }
    return map;
  } catch {
    const map: Record<string, string> = {};
    for (const key of keys) {
      map[key] = DEFAULTS[key as keyof typeof DEFAULTS] ?? "";
    }
    return map;
  }
}

export { SETTING_KEYS, DEFAULTS };
