"use server";
import { auth } from "@/lib/auth";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
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

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return { success: false, error: "User not found" };

    const isValid = await compare(currentPassword, user.passwordHash);
    if (!isValid) return { success: false, error: "Current password is incorrect" };

    const newHash = await hash(newPassword, 12);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));

    return { success: true };
  } catch (err) {
    console.error("[changeClientPassword]", err);
    return { success: false, error: "Failed to change password" };
  }
}

export async function updateClientLogo(logoUrl: string): Promise<ActionResult> {
  try {
    const userId = await requireAuth();
    await db.update(users).set({ logo: logoUrl || null }).where(eq(users.id, userId));
    revalidatePath("/client/dashboard");
    revalidatePath("/client/account");
    return { success: true };
  } catch (err) {
    console.error("[updateClientLogo]", err);
    return { success: false, error: "Failed to update logo" };
  }
}

export async function updateClientProfile(data: {
  name: string;
  companyName: string;
  contactFirstName: string;
  contactLastName: string;
}): Promise<ActionResult> {
  try {
    const userId = await requireAuth();
    await db.update(users).set({
      name: data.name.trim() || null,
      companyName: data.companyName.trim() || null,
      contactFirstName: data.contactFirstName.trim() || null,
      contactLastName: data.contactLastName.trim() || null,
    }).where(eq(users.id, userId));
    revalidatePath("/client/dashboard");
    revalidatePath("/client/account");
    return { success: true };
  } catch (err) {
    console.error("[updateClientProfile]", err);
    return { success: false, error: "Failed to update profile" };
  }
}
