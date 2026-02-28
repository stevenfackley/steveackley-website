import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PostCard } from "@/components/blog/PostCard";
import { Pagination } from "@/components/blog/Pagination";
import type { PostSummary, PaginationInfo } from "@/types";

// searchParams access already makes this route dynamic — force-dynamic is redundant
export const metadata: Metadata = {
  title: "Blog",
  description: "Thoughts on software engineering, technology, and life.",
};

const PER_PAGE = 10;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: p } = await searchParams;
  const currentPage = Math.max(1, parseInt(p ?? "1", 10));
  const skip = (currentPage - 1) * PER_PAGE;

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: PER_PAGE,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        published: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.post.count({ where: { published: true } }),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);
  const pagination: PaginationInfo = {
    currentPage,
    totalPages,
    totalItems: total,
    itemsPerPage: PER_PAGE,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
      <header className="mb-12">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Blog</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Thoughts on software, technology, and whatever else I find interesting.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--text-muted)] text-lg">No posts yet. Check back soon!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post as PostSummary} />
            ))}
          </div>
          <Pagination pagination={pagination} basePath="/blog" />
        </>
      )}
    </div>
  );
}
