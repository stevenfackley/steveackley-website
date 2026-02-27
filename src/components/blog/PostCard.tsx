import Link from "next/link";
import Image from "next/image";
import { formatDateShort, cn } from "@/lib/utils";
import type { PostSummary } from "@/types";
export function PostCard({ post, className }: { post: PostSummary; className?: string }) {
  return (
    <article className={cn("group bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--border-hover)] hover:-translate-y-0.5 transition-all duration-200", className)}>
      {post.coverImage && (
        <div className="relative h-48 overflow-hidden">
          <Image src={post.coverImage} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 768px) 100vw, 33vw" />
        </div>
      )}
      <div className="p-5">
        <time className="text-xs text-[var(--text-muted)]">{formatDateShort(post.createdAt)}</time>
        <h2 className="mt-1.5 text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2">
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        {post.excerpt && <p className="mt-2 text-sm text-[var(--text-secondary)] line-clamp-3 leading-relaxed">{post.excerpt}</p>}
        <Link href={`/blog/${post.slug}`} className="mt-4 inline-flex text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">Read more →</Link>
      </div>
    </article>
  );
}
