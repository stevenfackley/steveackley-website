import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ClientAccountClient } from "./ClientAccountClient";

export const metadata: Metadata = { title: "Account" };

export default async function ClientAccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const [user] = await db
    .select({ 
      id: users.id, 
      name: users.name, 
      email: users.email, 
      logo: users.logo,
      companyName: users.companyName,
      contactFirstName: users.contactFirstName,
      contactLastName: users.contactLastName,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) redirect("/admin/login");

  return (
    <ClientAccountClient
      name={user.name}
      email={user.email}
      logoUrl={user.logo}
      companyName={user.companyName}
      contactFirstName={user.contactFirstName}
      contactLastName={user.contactLastName}
    />
  );
}