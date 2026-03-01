import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSiteSettings, SETTING_KEYS } from "@/lib/settings";
import { AdminAccountClient } from "./AdminAccountClient";

export const metadata: Metadata = { title: "My Account" };

export default async function AdminAccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const [[user], settings] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
    getSiteSettings([SETTING_KEYS.AVATAR_URL, SETTING_KEYS.COUPLE_PHOTO_URL]),
  ]);

  if (!user) redirect("/admin/login");

  return (
    <AdminAccountClient
      name={user.name}
      email={user.email}
      avatarUrl={settings[SETTING_KEYS.AVATAR_URL]}
      couplePhotoUrl={settings[SETTING_KEYS.COUPLE_PHOTO_URL]}
    />
  );
}
