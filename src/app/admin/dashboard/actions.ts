"use server";
import { auth } from "@/lib/auth";
import { db, posts } from "@/db";
import { deleteUploadedFile } from "@/lib/upload";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
import { eq } from "drizzle-orm";

async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

export async function deletePost(postId: string): Promise<ActionResult> {
  try {
    await requireAuth();
    
    const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    
    if (!post) {
      return { success: false, error: "Post not found" };
    }
    
    if (post.coverImage) {
      await deleteUploadedFile(post.coverImage);
    }
    
    await db.delete(posts).where(eq(posts.id, postId));
    
    revalidatePath("/");           // ISR: invalidate home page blog feed
    revalidatePath("/blog");
    revalidatePath("/admin/dashboard");
    
    return { success: true };
  } catch (err) {
    console.error("[deletePost]", err);
    return { success: false, error: "Failed to delete post" };
  }
}

export async function togglePublished(postId: string, published: boolean): Promise<ActionResult> {
  try {
    await requireAuth();
    await db.update(posts).set({ published }).where(eq(posts.id, postId));
    revalidatePath("/");           // ISR: invalidate home page blog feed
    revalidatePath("/blog");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[togglePublished]", err);
    return { success: false, error: "Failed to update post" };
  }
}
