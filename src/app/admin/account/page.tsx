import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { getSiteSettings, SETTING_KEYS } from "@/lib/settings";
import { AdminAccountClient } from "./AdminAccountClient";

export const metadata: Metadata = { title: "My Account" };

export default async function AdminAccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true },
    }),
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
