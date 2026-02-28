"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function changeClientPassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    const userId = await requireAuth();

    if (newPassword.length < 8) {
      return { success: false, error: "New password must be at least 8 characters" };
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { success: false, error: "User not found" };

    const isValid = await compare(currentPassword, user.passwordHash);
    if (!isValid) return { success: false, error: "Current password is incorrect" };

    const newHash = await hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

    return { success: true };
  } catch (err) {
    console.error("[changeClientPassword]", err);
    return { success: false, error: "Failed to change password" };
  }
}

export async function updateClientLogo(logoUrl: string): Promise<ActionResult> {
  try {
    const userId = await requireAuth();
    await prisma.user.update({ where: { id: userId }, data: { logo: logoUrl || null } });
    revalidatePath("/client");
    return { success: true };
  } catch (err) {
    console.error("[updateClientLogo]", err);
    return { success: false, error: "Failed to update logo" };
  }
}

export async function updateClientName(name: string): Promise<ActionResult> {
  try {
    const userId = await requireAuth();
    await prisma.user.update({ where: { id: userId }, data: { name: name.trim() || null } });
    revalidatePath("/client");
    return { success: true };
  } catch (err) {
    console.error("[updateClientName]", err);
    return { success: false, error: "Failed to update name" };
  }
}
