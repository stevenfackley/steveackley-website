"use server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify, generateExcerpt, ensureUniqueSlug } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import DOMPurify from "isomorphic-dompurify";
import type { ActionResult } from "@/types";
const ALLOWED = { ALLOWED_TAGS: ["p","br","strong","em","u","s","h1","h2","h3","h4","h5","h6","ul","ol","li","blockquote","code","pre","a","img","hr","table","thead","tbody","tr","th","td"], ALLOWED_ATTR: ["href","src","alt","title","class","target","rel","width","height"] };
export async function createPost(formData: FormData): Promise<ActionResult> {
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
  const baseSlug = slugify(title);
  const existing = await prisma.post.findMany({ where: { slug: { startsWith: baseSlug } }, select: { slug: true } });
  const slug = ensureUniqueSlug(baseSlug, new Set(existing.map((p) => p.slug)));
  const excerpt = rawExcerpt || generateExcerpt(content, 160);
  try {
    await prisma.post.create({ data: { title, slug, content, excerpt, coverImage, published } });
  } catch (err) {
    console.error("[createPost]", err);
    return { success: false, error: "Failed to create post" };
  }
  revalidatePath("/");           // ISR: invalidate home page blog feed
  revalidatePath("/blog");
  revalidatePath("/admin/dashboard");
  redirect("/admin/dashboard");
}
