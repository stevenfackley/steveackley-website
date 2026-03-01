import type { Metadata } from "next";
import { db } from "@/db";
import { clientApps, users as usersTable, userApps } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { AppsClient } from "./AppsClient";

export const metadata: Metadata = { title: "Live Projects" };

export default async function AdminAppsPage() {
  const [appsWithUsers, users] = await Promise.all([
    db
      .select({
        id: clientApps.id,
        name: clientApps.name,
        productName: clientApps.productName,
        companyName: clientApps.companyName,
        environment: clientApps.environment,
        url: clientApps.url,
        description: clientApps.description,
        icon: clientApps.icon,
        favicon: clientApps.favicon,
        ogImage: clientApps.ogImage,
        userId: userApps.userId,
      })
      .from(clientApps)
      .leftJoin(userApps, eq(clientApps.id, userApps.appId))
      .orderBy(asc(clientApps.createdAt)),
    db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
      })
      .from(usersTable)
      .orderBy(asc(usersTable.name)),
  ]);

  // Group apps with their user IDs
  const appsMap = new Map<string, any>();
  for (const row of appsWithUsers) {
    if (!appsMap.has(row.id)) {
      appsMap.set(row.id, {
        id: row.id,
        name: row.name,
        productName: row.productName,
        companyName: row.companyName,
        environment: row.environment,
        url: row.url,
        description: row.description,
        icon: row.icon,
        favicon: row.favicon,
        ogImage: row.ogImage,
        userIds: [],
      });
    }
    if (row.userId) {
      appsMap.get(row.id).userIds.push(row.userId);
    }
  }

  return (
    <AppsClient
      initialApps={Array.from(appsMap.values())}
      users={users as { id: string; email: string; name: string | null; role: "ADMIN" | "CLIENT" }[]}
    />
  );
}
