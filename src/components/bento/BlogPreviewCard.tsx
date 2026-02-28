import { Card, CardHeader } from "@/components/ui/Card";
import { cn, formatDateShort } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
export async function BlogPreviewCard({ className }: { className?: string }) {
  const posts = await prisma.post.findMany({ where: { published: true }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, title: true, slug: true, createdAt: true } });
  return (
    <Card className={cn("p-6", className)}>
      <CardHeader label="Latest Posts">
        <Link href="/blog" className="text-xs text-[var(--accent)] hover:underline">View all →</Link>
      </CardHeader>
      {posts.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] mt-2">No posts yet. Check back soon!</p>
      ) : (
        <div className="space-y-3 mt-1">
          {posts.map((post) => (
            <div key={post.id}>
              <Link href={`/blog/${post.slug}`} className="block group">
                <p className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-1">{post.title}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatDateShort(post.createdAt)}</p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
