import type { APIRoute } from 'astro';
import { db, posts } from '@/db';
import { and, eq, lte, isNotNull } from 'drizzle-orm';

export const GET: APIRoute = async ({ request }) => {
  // Optional: Add a secret token for security
  const authHeader = request.headers.get('authorization');
  const expectedToken = import.meta.env.CRON_SECRET;
  
  if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const now = new Date();

    // Find all posts that:
    // 1. Have a scheduledAt date
    // 2. scheduledAt is in the past or now
    // 3. Are not yet published
    const scheduledPosts = await db
      .select()
      .from(posts)
      .where(
        and(
          isNotNull(posts.scheduledAt),
          lte(posts.scheduledAt, now),
          eq(posts.published, false)
        )
      );

    if (scheduledPosts.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No posts to publish', 
          count: 0 
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Publish all scheduled posts
    for (const post of scheduledPosts) {
      await db
        .update(posts)
        .set({ 
          published: true, 
          updatedAt: new Date() 
        })
        .where(eq(posts.id, post.id));
    }

    return new Response(
      JSON.stringify({
        message: `Successfully published ${scheduledPosts.length} post(s)`,
        count: scheduledPosts.length,
        posts: scheduledPosts.map(p => ({ id: p.id, title: p.title, slug: p.slug })),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error publishing scheduled posts:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to publish scheduled posts',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
