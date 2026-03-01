import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db, posts } from "@/db";
import { eq } from "drizzle-orm";
import { PostForm } from "@/components/admin/PostForm";
import { updatePost } from "./actions";
export const metadata: Metadata = { title: "Edit Post" };
interface Props { params: Promise<{ id: string }> }
export default async function EditPostPage({ params }: Props) {
  const { id } = await params;
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!post) notFound();
  const action = updatePost.bind(null, id);
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Edit Post</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Last updated {new Date(post.updatedAt).toLocaleDateString()}</p>
      </div>
      <PostForm action={action} defaultValues={post} />
    </div>
  );
}
