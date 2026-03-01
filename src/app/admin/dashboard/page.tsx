import type { Metadata } from "next";
import Link from "next/link";
import { db, posts as postsTable } from "@/db";
import { desc } from "drizzle-orm";
import { AdminPostTable } from "@/components/admin/AdminPostTable";
import { Button } from "@/components/ui/Button";
import type { PostSummary } from "@/types";
export const metadata: Metadata = { title: "Dashboard" };
export default async function AdminDashboardPage() {
  const posts = await db
    .select({
      id: postsTable.id,
      title: postsTable.title,
      slug: postsTable.slug,
      published: postsTable.published,
      createdAt: postsTable.createdAt,
      updatedAt: postsTable.updatedAt,
      excerpt: postsTable.excerpt,
      coverImage: postsTable.coverImage,
    })
    .from(postsTable)
    .orderBy(desc(postsTable.updatedAt));
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Posts</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">{posts.length} total · {posts.filter((p) => p.published).length} published</p>
        </div>
        <Link href="/admin/posts/new"><Button variant="primary" size="md">+ New Post</Button></Link>
      </div>
      <AdminPostTable posts={posts as PostSummary[]} />
    </div>
  );
}
