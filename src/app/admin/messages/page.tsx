import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminMessagesClient } from "./AdminMessagesClient";

export const metadata: Metadata = { title: "Messages" };

export default async function AdminMessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const [received, sent, clients] = await Promise.all([
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
    prisma.user.findMany({
      where: { role: "CLIENT" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return (
    <AdminMessagesClient
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
      clients={clients}
    />
  );
}
