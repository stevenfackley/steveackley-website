import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminPostTable } from "@/components/admin/AdminPostTable";
import { Button } from "@/components/ui/Button";
import type { PostSummary } from "@/types";
export const metadata: Metadata = { title: "Dashboard" };
export default async function AdminDashboardPage() {
  const posts = await prisma.post.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id:true, title:true, slug:true, published:true, createdAt:true, updatedAt:true, excerpt:true, coverImage:true },
  });
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
