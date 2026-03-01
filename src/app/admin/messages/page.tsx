import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db, messages, users } from "@/db";
import { eq, desc, asc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AdminMessagesClient } from "./AdminMessagesClient";

export const metadata: Metadata = { title: "Messages" };

export default async function AdminMessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const [received, sent, clients] = await Promise.all([
    db.query.messages.findMany({
      where: eq(messages.toUserId, session.user.id),
      orderBy: [desc(messages.createdAt)],
      with: {
        fromUser: {
          columns: { id: true, name: true, email: true },
        },
      },
    }),
    db.query.messages.findMany({
      where: eq(messages.fromUserId, session.user.id),
      orderBy: [desc(messages.createdAt)],
      with: {
        toUser: {
          columns: { id: true, name: true, email: true },
        },
      },
    }),
    db.query.users.findMany({
      where: eq(users.role, "CLIENT"),
      orderBy: [asc(users.name)],
      columns: { id: true, name: true, email: true },
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
