/**
 * Setting key constants and defaults.
 * This file is browser-safe (no Prisma imports).
 * Import server-side functions (getSiteSetting etc.) from ./settings instead.
 */

export const SETTING_KEYS = {
  AVATAR_URL: "avatar_url",
  COUPLE_PHOTO_URL: "couple_photo_url",
  BIO_TEXT: "bio_text",
  HERO_TAGLINE: "hero_tagline",
} as const;

export const DEFAULTS = {
  [SETTING_KEYS.AVATAR_URL]: "https://avatars.githubusercontent.com/u/2008105?v=4",
  [SETTING_KEYS.COUPLE_PHOTO_URL]: "",
  [SETTING_KEYS.BIO_TEXT]:
    "Staff Software Engineer at Lockheed Martin with 12+ years in the Microsoft ecosystem. C#, .NET, Azure, Angular, and SQL Server.",
  [SETTING_KEYS.HERO_TAGLINE]:
    "12+ years designing and shipping enterprise-grade software. Core stack is C# / .NET on Azure, with deep experience across full-stack, cloud architecture, and technical leadership.",
} as const;
