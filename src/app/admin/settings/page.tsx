import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteSettings, SETTING_KEYS } from "@/lib/settings";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const [users, settings] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    }),
    getSiteSettings([
      SETTING_KEYS.AVATAR_URL,
      SETTING_KEYS.COUPLE_PHOTO_URL,
      SETTING_KEYS.BIO_TEXT,
      SETTING_KEYS.HERO_TAGLINE,
    ]),
  ]);

  return (
    <SettingsClient
      users={users as { id: string; email: string; name: string | null; role: "ADMIN" | "CLIENT"; createdAt: Date }[]}
      avatarUrl={settings[SETTING_KEYS.AVATAR_URL]}
      couplePhotoUrl={settings[SETTING_KEYS.COUPLE_PHOTO_URL]}
      bioText={settings[SETTING_KEYS.BIO_TEXT]}
      heroTagline={settings[SETTING_KEYS.HERO_TAGLINE]}
    />
  );
}
