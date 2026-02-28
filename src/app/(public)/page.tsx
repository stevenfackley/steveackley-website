import { BentoDashboard } from "@/components/bento/BentoDashboard";
import { TabsDashboard } from "@/components/bento/TabsDashboard";
import { prisma } from "@/lib/prisma";
import { getPublicRepos, enrichRepos } from "@/lib/github";
import { getSiteSettings, SETTING_KEYS } from "@/lib/settings";

// ISR: revalidate every hour (GitHub data), post actions call revalidatePath("/") on publish
export const revalidate = 3600;

export default async function HomePage() {
  const [blogPosts, rawRepos, settings] = await Promise.all([
    prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, title: true, slug: true, excerpt: true, createdAt: true },
    }),
    getPublicRepos(),
    getSiteSettings([SETTING_KEYS.AVATAR_URL, SETTING_KEYS.COUPLE_PHOTO_URL]),
  ]);

  const githubRepos = await enrichRepos(rawRepos);

  return (
    <TabsDashboard
      overview={<BentoDashboard />}
      blogPosts={blogPosts}
      githubRepos={githubRepos}
      avatarUrl={settings[SETTING_KEYS.AVATAR_URL]}
      couplePhotoUrl={settings[SETTING_KEYS.COUPLE_PHOTO_URL]}
    />
  );
}
