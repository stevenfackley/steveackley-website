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
  SITE_THEME: "site_theme",
} as const;

export const DEFAULTS = {
  [SETTING_KEYS.AVATAR_URL]: "https://github.com/stevenfackley.png",
  [SETTING_KEYS.COUPLE_PHOTO_URL]: "",
  [SETTING_KEYS.BIO_TEXT]:
    "Staff Software Engineer at Lockheed Martin with 12+ years in the Microsoft ecosystem. C#, .NET, Azure, Angular, and SQL Server.",
  [SETTING_KEYS.HERO_TAGLINE]:
    "12+ years designing and shipping enterprise-grade software. Core stack is C# / .NET on Azure, with deep experience across full-stack, cloud architecture, and technical leadership.",
  // "system" = follow the visitor's OS prefers-color-scheme when they haven't
  // explicitly toggled. Admins may still pin "light" or "dark" via the
  // SiteSetting row; an explicit value overrides the OS preference.
  [SETTING_KEYS.SITE_THEME]: "system",
} as const;
