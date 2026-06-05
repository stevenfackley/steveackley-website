import type { APIRoute } from 'astro';
import { db, posts as postsTable } from '@/db';
import { eq, desc } from 'drizzle-orm';

const SITE = 'https://steveackley.org';
const FEED_TITLE = 'Steve Ackley';
const FEED_DESCRIPTION =
  'Writing on .NET, Azure, software architecture, and engineering practices.';

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const publishedPosts = await db
    .select({
      slug: postsTable.slug,
      title: postsTable.title,
      excerpt: postsTable.excerpt,
      createdAt: postsTable.createdAt,
    })
    .from(postsTable)
    .where(eq(postsTable.published, true))
    .orderBy(desc(postsTable.createdAt))
    .limit(50);

  const items = publishedPosts
    .map((post) => {
      const url = `${SITE}/blog/${xmlEscape(post.slug)}`;
      return `  <item>
    <title>${xmlEscape(post.title)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <pubDate>${post.createdAt.toUTCString()}</pubDate>
    <description>${xmlEscape(post.excerpt ?? post.title)}</description>
  </item>`;
    })
    .join('\n');

  const lastBuildDate = publishedPosts[0]?.createdAt.toUTCString() ?? new Date(0).toUTCString();

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(FEED_TITLE)}</title>
    <link>${SITE}/blog</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>${xmlEscape(FEED_DESCRIPTION)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
