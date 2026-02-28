import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ClientAccountClient } from "./ClientAccountClient";

export const metadata: Metadata = { title: "Account" };

export default async function ClientAccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, logo: true },
  });

  if (!user) redirect("/admin/login");

  return (
    <ClientAccountClient
      name={user.name}
      email={user.email}
      logoUrl={user.logo}
    />
  );
}