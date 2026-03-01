import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db, messages, users } from "@/db";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ClientMessagesClient } from "./ClientMessagesClient";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/admin";

export const metadata: Metadata = { title: "Messages" };

export default async function ClientMessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const admin = await db.query.users.findFirst({
    where: eq(users.email, DEFAULT_ADMIN_EMAIL),
    columns: { id: true },
  });

  const [received, sent] = await Promise.all([
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
