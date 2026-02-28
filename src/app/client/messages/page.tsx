import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ClientMessagesClient } from "./ClientMessagesClient";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/admin";

export const metadata: Metadata = { title: "Messages" };

export default async function ClientMessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const admin = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
    select: { id: true },
  });

  const [received, sent] = await Promise.all([
    prisma.message.findMany({
      where: { toUserId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.message.findMany({
      where: { fromUserId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        toUser: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return (
    <ClientMessagesClient
      adminId={admin?.id ?? null}
      initialReceived={received.map((m) => ({
        id: m.id,
        subject: m.subject,
        body: m.body,
        type: m.type as "GENERAL" | "PROJECT_REQUEST",
        read: m.read,
        createdAt: m.createdAt,
        fromUser: m.fromUser,
      }))}
      initialSent={sent.map((m) => ({
        id: m.id,
        subject: m.subject,
        body: m.body,
        type: m.type as "GENERAL" | "PROJECT_REQUEST",
        createdAt: m.createdAt,
        toUser: m.toUser,
      }))}
    />
  );
}
