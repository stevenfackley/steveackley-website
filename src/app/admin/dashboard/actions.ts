"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile } from "@/lib/upload";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";
async function requireAuth() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}
export async function deletePost(postId: string): Promise<ActionResult> {
  try {
    await requireAuth();
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) return { success: false, error: "Post not found" };
    if (post.coverImage) await deleteUploadedFile(post.coverImage);
    await prisma.post.delete({ where: { id: postId } });
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
    await prisma.post.update({ where: { id: postId }, data: { published } });
    revalidatePath("/blog");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[togglePublished]", err);
    return { success: false, error: "Failed to update post" };
  }
}
