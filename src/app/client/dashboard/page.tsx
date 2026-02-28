import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ClientDashboardClient } from "./ClientDashboardClient";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/admin";

export const metadata: Metadata = { title: "Dashboard" };

export default async function ClientDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const admin = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
    select: { id: true },
  });

  const userWithApps = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      apps: {
        select: {
          app: {
            select: { id: true, name: true, url: true, icon: true, description: true },
          },
        },
      },
    },
  });

  const apps = userWithApps?.apps.map((ua) => ua.app) ?? [];
  const firstName = userWithApps?.name?.split(" ")[0] ?? "there";

  return (
    <ClientDashboardClient
      firstName={firstName}
      apps={apps}
      adminId={admin?.id ?? null}
    />
  );
}
