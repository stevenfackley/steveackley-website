import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { AppsClient } from "./AppsClient";

export const metadata: Metadata = { title: "Live Projects" };

export default async function AdminAppsPage() {
  const [apps, users] = await Promise.all([
    prisma.clientApp.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        users: { select: { userId: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, email: true, name: true, role: true },
    }),
  ]);

  return (
    <AppsClient
      initialApps={apps.map((a) => ({
        id: a.id,
        name: a.name,
        productName: a.productName,
        companyName: a.companyName,
        environment: a.environment,
        url: a.url,
        description: a.description,
        icon: a.icon,
        favicon: a.favicon,
        ogImage: a.ogImage,
        userIds: a.users.map((u) => u.userId),
      }))}
      users={users as { id: string; email: string; name: string | null; role: "ADMIN" | "CLIENT" }[]}
    />
  );
}
