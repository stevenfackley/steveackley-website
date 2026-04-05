import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { db, posts } from '@/db';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const server = {
  togglePublished: defineAction({
    input: z.object({
      id: z.string(),
      published: z.boolean(),
    }),
    handler: async (input, context) => {
      if (!context.locals.user || context.locals.user.role !== 'ADMIN') {
        throw new Error('Unauthorized');
      }
      await db
        .update(posts)
        .set({ published: input.published, updatedAt: new Date() })
        .where(eq(posts.id, input.id));
      return { success: true };
    },
  }),
  deletePost: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, context) => {
      if (!context.locals.user || context.locals.user.role !== 'ADMIN') {
        throw new Error('Unauthorized');
      }
      await db.delete(posts).where(eq(posts.id, input.id));
      return { success: true };
    },
  }),
  createPost: defineAction({
    accept: 'form',
    input: z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      excerpt: z.string().optional(),
      coverImage: z.string().optional(),
      published: z.string().transform((v) => v === 'true'),
      scheduledAt: z.string().optional(),
    }),
    handler: async (input, context) => {
      if (!context.locals.user || context.locals.user.role !== 'ADMIN') {
        throw new Error('Unauthorized');
      }

      const slug = input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      await db.insert(posts).values({
        id: randomUUID(),
        title: input.title,
        slug,
        content: input.content,
        excerpt: input.excerpt,
        coverImage: input.coverImage,
        published: input.published,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      });

      return { success: true };
    },
  }),
  updatePost: defineAction({
    accept: 'form',
    input: z.object({
      id: z.string(),
      title: z.string().min(1),
      content: z.string().min(1),
      excerpt: z.string().optional(),
      coverImage: z.string().optional(),
      published: z.string().transform((v) => v === 'true'),
      scheduledAt: z.string().optional(),
    }),
    handler: async (input, context) => {
      if (!context.locals.user || context.locals.user.role !== 'ADMIN') {
        throw new Error('Unauthorized');
      }

      const slug = input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      await db
        .update(posts)
        .set({
          title: input.title,
          slug,
          content: input.content,
          excerpt: input.excerpt,
          coverImage: input.coverImage,
          published: input.published,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, input.id));

      return { success: true };
    },
  }),
};
