import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ClientDashboardClient } from "./ClientDashboardClient";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/admin";

export const metadata: Metadata = { title: "Dashboard" };

export default async function ClientDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const admin = await db.query.users.findFirst({
    where: eq(users.email, DEFAULT_ADMIN_EMAIL),
    columns: { id: true },
  });

  const userWithApps = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: {
      name: true,
    },
    with: {
      apps: {
        with: {
          app: {
            columns: {
              id: true,
              name: true,
              productName: true,
              companyName: true,
              environment: true,
              url: true,
              icon: true,
              description: true,
            },
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
