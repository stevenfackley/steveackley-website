"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify, generateExcerpt, ensureUniqueSlug } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import type { ActionResult } from "@/types";
const ALLOWED = { ALLOWED_TAGS: ["p","br","strong","em","u","s","h1","h2","h3","h4","h5","h6","ul","ol","li","blockquote","code","pre","a","img","hr","table","thead","tbody","tr","th","td"], ALLOWED_ATTR: ["href","src","alt","title","class","target","rel","width","height"] };
export async function updatePost(id: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session) return { success: false, error: "Unauthorized" };
  const title = (formData.get("title") as string)?.trim();
  const rawContent = formData.get("content") as string;
  const rawExcerpt = (formData.get("excerpt") as string)?.trim();
  const coverImage = (formData.get("coverImage") as string)?.trim() || null;
  const published = formData.get("published") === "true";
  if (!title) return { success: false, error: "Title is required" };
  if (!rawContent) return { success: false, error: "Content is required" };
  const content = DOMPurify.sanitize(rawContent, ALLOWED);
  const existing = await prisma.post.findUnique({ where: { id }, select: { title: true, slug: true } });
  if (!existing) return { success: false, error: "Post not found" };
  let slug = existing.slug;
  if (title !== existing.title) {
    const baseSlug = slugify(title);
    const others = await prisma.post.findMany({ where: { slug: { startsWith: baseSlug }, NOT: { id } }, select: { slug: true } });
    slug = ensureUniqueSlug(baseSlug, new Set(others.map((p) => p.slug)));
  }
  const excerpt = rawExcerpt || generateExcerpt(content, 160);
  try {
    await prisma.post.update({ where: { id }, data: { title, slug, content, excerpt, coverImage, published } });
  } catch (err) {
    console.error("[updatePost]", err);
    return { success: false, error: "Failed to update post" };
  }
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/admin/dashboard");
  redirect("/admin/dashboard");
}
