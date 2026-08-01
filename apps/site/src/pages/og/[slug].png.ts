import type { APIRoute } from 'astro';
import type { ReactNode } from 'react';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { db, posts as postsTable } from '@/db';
import { eq, and } from 'drizzle-orm';
import { formatDate } from '@/lib/utils';

const require = createRequire(import.meta.url);

// satori reads woff (not woff2); the static @fontsource packages ship both.
// Loaded once per process — the buffers are reused across requests.
let fontsPromise: Promise<{ display: Buffer; sans: Buffer }> | null = null;
function loadFonts() {
  fontsPromise ??= Promise.all([
    readFile(require.resolve('@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff')),
    readFile(require.resolve('@fontsource/instrument-sans/files/instrument-sans-latin-400-normal.woff')),
  ]).then(([display, sans]) => ({ display, sans }));
  return fontsPromise;
}

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug) return new Response(null, { status: 404 });

  const [post] = await db
    .select({
      title: postsTable.title,
      createdAt: postsTable.createdAt,
      readingTimeMinutes: postsTable.readingTimeMinutes,
    })
    .from(postsTable)
    .where(and(eq(postsTable.slug, slug), eq(postsTable.published, true)))
    .limit(1);

  if (!post) return new Response(null, { status: 404 });

  const { display, sans } = await loadFonts();

  const meta = [
    formatDate(post.createdAt),
    post.readingTimeMinutes ? `${post.readingTimeMinutes} min read` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  // satori's signature wants ReactNode but documents the plain object form —
  // the cast bridges the gap without pulling JSX into an API route.
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          backgroundColor: '#0b1020',
          backgroundImage: 'linear-gradient(135deg, #0b1020 0%, #131b33 60%, #1b2330 100%)',
          color: '#f5f7fa',
          fontFamily: 'Instrument Sans',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { display: 'flex', fontSize: '26px', color: '#8b98ab', letterSpacing: '0.12em' },
              children: 'steveackley.org / blog',
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontFamily: 'Bricolage Grotesque',
                fontWeight: 700,
                fontSize: post.title.length > 70 ? '52px' : '64px',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
              },
              children: post.title,
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      width: '160px',
                      height: '6px',
                      borderRadius: '3px',
                      marginBottom: '28px',
                      backgroundImage: 'linear-gradient(90deg, #3b7bd6, #8b5cf6)',
                    },
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '28px',
                      color: '#c7d0dc',
                    },
                    children: [
                      { type: 'div', props: { style: { display: 'flex' }, children: 'Steve Ackley' } },
                      { type: 'div', props: { style: { display: 'flex', color: '#8b98ab' }, children: meta } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    } as unknown as ReactNode,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'Bricolage Grotesque', data: display, weight: 700, style: 'normal' },
        { name: 'Instrument Sans', data: sans, weight: 400, style: 'normal' },
      ],
    },
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();

  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
};
