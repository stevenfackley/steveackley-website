import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PostContent } from "@/components/blog/PostContent";
import { formatDate } from "@/lib/utils";
export const dynamic = "force-dynamic";
interface Props { params: Promise<{ slug: string }> }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findUnique({ where: { slug, published: true }, select: { title: true, excerpt: true } });
  if (!post) return { title: "Not Found" };
  return { title: post.title, description: post.excerpt ?? undefined };
}
export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await prisma.post.findUnique({ where: { slug, published: true } });
  if (!post) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-8 transition-colors">← Back to Blog</Link>
      <article>
        <header className="mb-8">
          <time className="text-sm text-[var(--text-muted)]">{formatDate(post.createdAt)}</time>
          <h1 className="mt-2 text-3xl font-bold text-[var(--text-primary)] leading-tight">{post.title}</h1>
          {post.excerpt && <p className="mt-3 text-lg text-[var(--text-secondary)] leading-relaxed">{post.excerpt}</p>}
        </header>
        {post.coverImage && (
          <div className="relative mb-8 h-64 sm:h-96 rounded-2xl overflow-hidden">
            <Image src={post.coverImage} alt={post.title} fill className="object-cover" priority sizes="(max-width: 768px) 100vw, 768px" />
          </div>
        )}
        <PostContent content={post.content} />
      </article>
    </div>
  );
}
