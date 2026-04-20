import type { APIRoute } from 'astro';
import { db, posts as postsTable } from '@/db';
import { eq, desc } from 'drizzle-orm';

const SITE = 'https://steveackley.org';

const STATIC_ROUTES: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/blog', changefreq: 'daily', priority: '0.9' },
  { path: '/resume', changefreq: 'monthly', priority: '0.8' },
];

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
      updatedAt: postsTable.updatedAt,
    })
    .from(postsTable)
    .where(eq(postsTable.published, true))
    .orderBy(desc(postsTable.updatedAt));

  const staticEntries = STATIC_ROUTES.map(({ path, changefreq, priority }) => `  <url>
    <loc>${SITE}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`).join('\n');

  const postEntries = publishedPosts
    .map((post) => `  <url>
    <loc>${SITE}/blog/${xmlEscape(post.slug)}</loc>
    <lastmod>${post.updatedAt.toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${postEntries}
</urlset>`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
