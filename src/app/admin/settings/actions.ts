"use server";
import { auth } from "@/lib/auth";
import { db, users, siteSettings, clientApps, userApps } from "@/db";
import { eq, and } from "drizzle-orm";
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

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return { success: false, error: "User not found" };

    const isValid = await compare(currentPassword, user.passwordHash);
    if (!isValid) return { success: false, error: "Current password is incorrect" };

    const newHash = await hash(newPassword, 12);
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));

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
    await db
      .insert(siteSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } });
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

    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) return { success: false, error: "A user with that email already exists" };

    const passwordHash = await hash(password, 12);
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, name: name || null, role: "CLIENT" })
      .returning({ id: users.id });

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

    await db.delete(users).where(eq(users.id, userId));
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

    const [targetUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!targetUser) return { success: false, error: "User not found" };
    if (newRole === "ADMIN") {
      return { success: false, error: "Only default admin may have ADMIN role" };
    }
    if (newRole === "CLIENT" && isDefaultAdminEmail(targetUser.email)) {
      return { success: false, error: "Cannot change role of default admin" };
    }

    await db.update(users).set({ role: newRole }).where(eq(users.id, userId));
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
    const [app] = await db
      .insert(clientApps)
      .values({
        name,
        url,
        description: description || null,
        icon: icon || null,
        productName: productName || null,
        companyName: companyName || null,
        environment: environment || "PRODUCTION",
      })
      .returning({ id: clientApps.id });
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
    await db
      .update(clientApps)
      .set({
        name: data.name,
        url: data.url,
        description: data.description || null,
        icon: data.icon || null,
        productName: data.productName || null,
        companyName: data.companyName || null,
        environment: data.environment,
        updatedAt: new Date(),
      })
      .where(eq(clientApps.id, appId));
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
    await db.delete(clientApps).where(eq(clientApps.id, appId));
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
    await db
      .insert(userApps)
      .values({ userId, appId })
      .onConflictDoNothing();
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
    await db.delete(userApps).where(and(eq(userApps.userId, userId), eq(userApps.appId, appId)));
    revalidatePath("/admin/apps");
    revalidatePath("/client/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[removeAppFromUser]", err);
    return { success: false, error: "Failed to remove app" };
  }
}
