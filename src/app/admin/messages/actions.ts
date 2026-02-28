"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import { DEFAULT_ADMIN_EMAIL } from "@/lib/admin";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== "ADMIN") throw new Error("Unauthorized");
  return session.user.id;
}

// ---------------------------------------------------------------------------
// Get admin user id
// ---------------------------------------------------------------------------
async function getAdminUserId(): Promise<string | null> {
  const admin = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN_EMAIL },
    select: { id: true },
  });
  return admin?.id ?? null;
}

// ---------------------------------------------------------------------------
// Send a message (client → admin or admin → client)
// ---------------------------------------------------------------------------
export async function sendMessage(
  toUserId: string,
  subject: string,
  body: string,
  type: "GENERAL" | "PROJECT_REQUEST" = "GENERAL"
): Promise<ActionResult> {
  try {
    const fromUserId = await requireAuth();
    if (!subject.trim() || !body.trim()) {
      return { success: false, error: "Subject and body are required" };
    }
    const msg = await prisma.message.create({
      data: { fromUserId, toUserId, subject: subject.trim(), body: body.trim(), type },
    });
    revalidatePath("/admin/messages");
    revalidatePath("/client/messages");
    return { success: true, data: { id: msg.id } };
  } catch (err) {
    console.error("[sendMessage]", err);
    return { success: false, error: "Failed to send message" };
  }
}

// ---------------------------------------------------------------------------
// Send a project request (client → admin)
// ---------------------------------------------------------------------------
export async function sendProjectRequest(body: string): Promise<ActionResult> {
  try {
    const fromUserId = await requireAuth();
    const adminId = await getAdminUserId();
    if (!adminId) return { success: false, error: "Admin not found" };
    if (!body.trim()) return { success: false, error: "Message body is required" };

    const msg = await prisma.message.create({
      data: {
        fromUserId,
        toUserId: adminId,
        subject: "Project Request",
        body: body.trim(),
        type: "PROJECT_REQUEST",
      },
    });
    revalidatePath("/admin/messages");
    revalidatePath("/client/messages");
    return { success: true, data: { id: msg.id } };
  } catch (err) {
    console.error("[sendProjectRequest]", err);
    return { success: false, error: "Failed to send project request" };
  }
}

// ---------------------------------------------------------------------------
// Send a message to a client (admin → client)
// ---------------------------------------------------------------------------
export async function sendMessageToClient(
  toUserId: string,
  subject: string,
  body: string
): Promise<ActionResult> {
  try {
    const fromUserId = await requireAdmin();
    if (!subject.trim() || !body.trim()) {
      return { success: false, error: "Subject and body are required" };
    }
    const msg = await prisma.message.create({
      data: { fromUserId, toUserId, subject: subject.trim(), body: body.trim(), type: "GENERAL" },
    });
    revalidatePath("/admin/messages");
    revalidatePath("/client/messages");
    return { success: true, data: { id: msg.id } };
  } catch (err) {
    console.error("[sendMessageToClient]", err);
    return { success: false, error: "Failed to send message" };
  }
}

// ---------------------------------------------------------------------------
// Mark message as read
// ---------------------------------------------------------------------------
export async function markMessageRead(messageId: string): Promise<ActionResult> {
  try {
    const userId = await requireAuth();
    // Only the recipient can mark as read
    await prisma.message.updateMany({
      where: { id: messageId, toUserId: userId },
      data: { read: true },
    });
    revalidatePath("/admin/messages");
    revalidatePath("/client/messages");
    return { success: true };
  } catch (err) {
    console.error("[markMessageRead]", err);
    return { success: false, error: "Failed to mark as read" };
  }
}

// ---------------------------------------------------------------------------
// Mark all messages as read (for current user)
// ---------------------------------------------------------------------------
export async function markAllRead(): Promise<ActionResult> {
  try {
    const userId = await requireAuth();
    await prisma.message.updateMany({
      where: { toUserId: userId, read: false },
      data: { read: true },
    });
    revalidatePath("/admin/messages");
    revalidatePath("/client/messages");
    return { success: true };
  } catch (err) {
    console.error("[markAllRead]", err);
    return { success: false, error: "Failed to mark all as read" };
  }
}

// ---------------------------------------------------------------------------
// Delete a message (admin only, or own sent message)
// ---------------------------------------------------------------------------
export async function deleteMessage(messageId: string): Promise<ActionResult> {
  try {
    const userId = await requireAuth();
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) return { success: false, error: "Message not found" };
    if (msg.fromUserId !== userId && msg.toUserId !== userId) {
      return { success: false, error: "Unauthorized" };
    }
    await prisma.message.delete({ where: { id: messageId } });
    revalidatePath("/admin/messages");
    revalidatePath("/client/messages");
    return { success: true };
  } catch (err) {
    console.error("[deleteMessage]", err);
    return { success: false, error: "Failed to delete message" };
  }
}

// ---------------------------------------------------------------------------
// Get unread count for current user
// ---------------------------------------------------------------------------
export async function getUnreadCount(): Promise<number> {
  try {
    const session = await auth();
    if (!session?.user?.id) return 0;
    return await prisma.message.count({
      where: { toUserId: session.user.id, read: false },
    });
  } catch {
    return 0;
  }
}
