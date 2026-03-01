"use server";
import { auth } from "@/lib/auth";
import { db, posts } from "@/db";
import { eq, and, like, not } from "drizzle-orm";
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
  
  const [existing] = await db
    .select({ title: posts.title, slug: posts.slug })
    .from(posts)
    .where(eq(posts.id, id))
    .limit(1);
  
  if (!existing) return { success: false, error: "Post not found" };
  
  let slug = existing.slug;
  if (title !== existing.title) {
    const baseSlug = slugify(title);
    const others = await db
      .select({ slug: posts.slug })
      .from(posts)
      .where(and(like(posts.slug, `${baseSlug}%`), not(eq(posts.id, id))));
    slug = ensureUniqueSlug(baseSlug, new Set(others.map((p) => p.slug)));
  }
  
  const excerpt = rawExcerpt || generateExcerpt(content, 160);
  
  try {
    await db
      .update(posts)
      .set({ title, slug, content, excerpt, coverImage, published })
      .where(eq(posts.id, id));
  } catch (err) {
    console.error("[updatePost]", err);
    return { success: false, error: "Failed to update post" };
  }
  
  revalidatePath("/");           // ISR: invalidate home page blog feed
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/admin/dashboard");
  redirect("/admin/dashboard");
}
