import { BentoDashboard } from "@/components/bento/BentoDashboard";
import { TabsDashboard } from "@/components/bento/TabsDashboard";
import { prisma } from "@/lib/prisma";
import { getPublicRepos, enrichRepos } from "@/lib/github";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [blogPosts, rawRepos] = await Promise.all([
    prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, slug: true, excerpt: true, createdAt: true },
    }),
    getPublicRepos(),
  ]);

  const githubRepos = await enrichRepos(rawRepos);

  return (
    <TabsDashboard
      overview={<BentoDashboard />}
      blogPosts={blogPosts}
      githubRepos={githubRepos}
    />
  );
}
