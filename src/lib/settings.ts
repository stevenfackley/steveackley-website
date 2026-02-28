import { prisma } from "./prisma";

export const SETTING_KEYS = {
  AVATAR_URL: "avatar_url",
  COUPLE_PHOTO_URL: "couple_photo_url",
} as const;

export const DEFAULTS = {
  [SETTING_KEYS.AVATAR_URL]: "https://avatars.githubusercontent.com/u/2008105?v=4",
  [SETTING_KEYS.COUPLE_PHOTO_URL]: "",
} as const;

export async function getSiteSetting(key: string): Promise<string> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    return row?.value ?? DEFAULTS[key as keyof typeof DEFAULTS] ?? "";
  } catch {
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
      map[key] = DEFAULTS[key as keyof typeof DEFAULTS] ?? "";
    }
    return map;
  }
}
