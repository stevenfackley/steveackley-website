import { db, siteSettings } from "../db/index";
import { eq, inArray } from "drizzle-orm";
import { SETTING_KEYS, DEFAULTS } from "./setting-keys";

export type SiteSettingKey = keyof typeof DEFAULTS;
export type SiteSettingsMap<TKeys extends readonly SiteSettingKey[]> = Record<TKeys[number], string>;

export async function getSiteSetting(key: SiteSettingKey): Promise<string> {
  try {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1);
    return row?.value ?? DEFAULTS[key] ?? "";
  } catch {
    return DEFAULTS[key] ?? "";
  }
}

export async function getSiteSettings<const TKeys extends readonly SiteSettingKey[]>(
  keys: TKeys,
): Promise<SiteSettingsMap<TKeys>> {
  try {
    const rows = await db
      .select()
      .from(siteSettings)
      .where(inArray(siteSettings.key, keys));
    const map = {} as Record<SiteSettingKey, string>;
    for (const key of keys) {
      const row = rows.find((r) => r.key === key);
      map[key] = row?.value ?? DEFAULTS[key] ?? "";
    }
    return map as SiteSettingsMap<TKeys>;
  } catch {
    const map = {} as Record<SiteSettingKey, string>;
    for (const key of keys) {
      map[key] = DEFAULTS[key] ?? "";
    }
    return map as SiteSettingsMap<TKeys>;
  }
}

export { SETTING_KEYS, DEFAULTS };
