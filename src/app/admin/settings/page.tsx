import type { Metadata } from "next";
import { db, users as usersTable } from "@/db";
import { asc } from "drizzle-orm";
import { getSiteSettings, SETTING_KEYS } from "@/lib/settings";
import { SettingsClient } from "./SettingsClient";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const [users, settings] = await Promise.all([
    db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(asc(usersTable.createdAt)),
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
