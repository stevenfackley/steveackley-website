import type { APIRoute } from 'astro';
import { db, posts } from '@/db';
import { and, eq, lte, isNotNull } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { cronSecret } from '@/lib/scheduler';
import { createHash, timingSafeEqual } from 'node:crypto';

/** Compares in constant time. Hashing first gives both sides the same length. */
function sameValue(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export const GET: APIRoute = async ({ request }) => {
  // Require a shared secret. Fail closed: if CRON_SECRET is not configured the
  // endpoint is locked rather than left open to anyone. The secret is read at
  // run time (see lib/scheduler.ts for why that matters).
  const authHeader = request.headers.get('authorization');
  const expectedToken = cronSecret();

  if (!expectedToken || !authHeader || !sameValue(authHeader, `Bearer ${expectedToken}`)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const now = new Date();

    // Publish every due post in a single batched UPDATE … RETURNING:
    //  1. has a scheduledAt date
    //  2. scheduledAt is now or in the past
    //  3. not yet published
    const published = await db
      .update(posts)
      .set({ published: true, updatedAt: now })
      .where(
        and(
          isNotNull(posts.scheduledAt),
          lte(posts.scheduledAt, now),
          eq(posts.published, false)
        )
      )
      .returning();

    // The caller's copy of this answer can be lost (a timeout, a retry that
    // then finds nothing due), so the server keeps its own record.
    if (published.length > 0) {
      logger.info('Published scheduled posts', {
        count: published.length,
        posts: published.map((p) => ({ id: p.id, slug: p.slug })),
      });
    }

    return new Response(
      JSON.stringify({
        message: published.length === 0
          ? 'No posts to publish'
          : `Successfully published ${published.length} post(s)`,
        count: published.length,
        posts: published.map((p) => ({ id: p.id, title: p.title, slug: p.slug })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error('Error publishing scheduled posts', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ error: 'Failed to publish scheduled posts' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
