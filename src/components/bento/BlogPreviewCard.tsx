import { cn, formatDateShort } from "@/lib/utils";
import { db, posts } from "@/db";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";

export async function BlogPreviewCard({ className }: { className?: string }) {
  const recentPosts = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      createdAt: posts.createdAt,
    })
    .from(posts)
    .where(eq(posts.published, true))
    .orderBy(desc(posts.createdAt))
    .limit(3);

  return (
    <div className={cn("p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-2xl border border-purple-200 dark:border-purple-800", className)}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">✍️</span>
        <h2 className="text-xl font-semibold">Recent Posts</h2>
      </div>
      <ul className="space-y-3">
        {recentPosts.map((post) => (
          <li key={post.id}>
            <Link
              href={`/blog/${post.slug}`}
              className="block group hover:bg-white/50 dark:hover:bg-white/5 rounded-lg p-2 -m-2 transition-colors"
            >
              <h3 className="font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1">
                {post.title}
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{formatDateShort(post.createdAt)}</p>
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/blog" className="text-sm text-purple-600 dark:text-purple-400 hover:underline mt-4 inline-block">
        View all posts →
      </Link>
    </div>
  );
}
