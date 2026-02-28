"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import { isDefaultAdminEmail } from "@/lib/admin";

async function requireAdmin() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user?.id || role !== "ADMIN") throw new Error("Unauthorized");
  return session.user.id;
}

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    const userId = await requireAdmin();

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
    console.error("[changePassword]", err);
    return { success: false, error: "Failed to change password" };
  }
}

// ---------------------------------------------------------------------------
// Site Settings (avatar, couple photo, etc.)
// ---------------------------------------------------------------------------

export async function updateSiteSetting(key: string, value: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    revalidatePath("/");
    revalidatePath("/resume");
    return { success: true };
  } catch (err) {
    console.error("[updateSiteSetting]", err);
    return { success: false, error: "Failed to save setting" };
  }
}

// ---------------------------------------------------------------------------
// User Management
// ---------------------------------------------------------------------------

export async function createUser(
  email: string,
  password: string,
  name: string
): Promise<ActionResult> {
  try {
    await requireAdmin();

    if (password.length < 8) {
      return { success: false, error: "Password must be at least 8 characters" };
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { success: false, error: "A user with that email already exists" };

    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, name: name || null, role: "CLIENT" },
    });

    revalidatePath("/admin/settings");
    return { success: true, data: { id: user.id } };
  } catch (err) {
    console.error("[createUser]", err);
    return { success: false, error: "Failed to create user" };
  }
}

export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    const callerId = await requireAdmin();
    if (userId === callerId) return { success: false, error: "You cannot delete your own account" };

    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err) {
    console.error("[deleteUser]", err);
    return { success: false, error: "Failed to delete user" };
  }
}

export async function updateUserRole(
  userId: string,
  newRole: "ADMIN" | "CLIENT"
): Promise<ActionResult> {
  try {
    const callerId = await requireAdmin();
    if (userId === callerId) return { success: false, error: "You cannot change your own role" };

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return { success: false, error: "User not found" };
    if (newRole === "ADMIN") {
      return { success: false, error: "Only default admin may have ADMIN role" };
    }
    if (newRole === "CLIENT" && isDefaultAdminEmail(targetUser.email)) {
      return { success: false, error: "Cannot change role of default admin" };
    }

    await prisma.user.update({ where: { id: userId }, data: { role: newRole } });
    revalidatePath("/admin/settings");
    return { success: true };
  } catch (err) {
    console.error("[updateUserRole]", err);
    return { success: false, error: "Failed to update role" };
  }
}

// ---------------------------------------------------------------------------
// Client App Management
// ---------------------------------------------------------------------------

export async function createClientApp(
  name: string,
  url: string,
  description: string,
  icon: string,
  productName?: string,
  companyName?: string,
  environment?: "PRODUCTION" | "TEST" | "DEVELOPMENT"
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const app = await prisma.clientApp.create({
      data: {
        name,
        url,
        description: description || null,
        icon: icon || null,
        productName: productName || null,
        companyName: companyName || null,
        environment: environment || "PRODUCTION",
      },
    });
    revalidatePath("/admin/apps");
    return { success: true, data: { id: app.id } };
  } catch (err) {
    console.error("[createClientApp]", err);
    return { success: false, error: "Failed to create app" };
  }
}

export async function updateClientApp(
  appId: string,
  data: {
    name: string;
    url: string;
    description: string;
    icon: string;
    productName: string;
    companyName: string;
    environment: "PRODUCTION" | "TEST" | "DEVELOPMENT";
  }
): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.clientApp.update({
      where: { id: appId },
      data: {
        name: data.name,
        url: data.url,
        description: data.description || null,
        icon: data.icon || null,
        productName: data.productName || null,
        companyName: data.companyName || null,
        environment: data.environment,
      },
    });
    revalidatePath("/admin/apps");
    revalidatePath("/client/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[updateClientApp]", err);
    return { success: false, error: "Failed to update app" };
  }
}

export async function deleteClientApp(appId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.clientApp.delete({ where: { id: appId } });
    revalidatePath("/admin/apps");
    return { success: true };
  } catch (err) {
    console.error("[deleteClientApp]", err);
    return { success: false, error: "Failed to delete app" };
  }
}

export async function assignAppToUser(userId: string, appId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.userApp.upsert({
      where: { userId_appId: { userId, appId } },
      update: {},
      create: { userId, appId },
    });
    revalidatePath("/admin/apps");
    revalidatePath("/client/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[assignAppToUser]", err);
    return { success: false, error: "Failed to assign app" };
  }
}

export async function removeAppFromUser(userId: string, appId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    await prisma.userApp.delete({ where: { userId_appId: { userId, appId } } });
    revalidatePath("/admin/apps");
    revalidatePath("/client/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[removeAppFromUser]", err);
    return { success: false, error: "Failed to remove app" };
  }
}
