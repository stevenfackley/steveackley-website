import { defineAction } from 'astro:actions';
import { z } from 'astro:schema';
import { db, posts } from '@/db';
import { and, eq, like, lte, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { setSiteSetting } from '@shared/lib/settings';
import { SETTING_KEYS } from '@shared/lib/setting-keys';
import { readingTimeMinutes } from '@/lib/reading-time';
import { requireAdminAction } from '@/lib/auth-guards';
import { coverImageOf } from '@/lib/posts';
import { ensureUniqueSlug, generateExcerpt, slugify } from '@/lib/utils';

/** Parse a comma-separated tag string into a clean string[], or null if empty. */
function parseTags(raw: string | undefined): string[] | null {
  if (!raw) return null;
  const tags = raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  return tags.length > 0 ? tags : null;
}

/** Trim a category string, collapsing blank input to null. */
function cleanCategory(raw: string | undefined): string | null {
  const value = raw?.trim();
  return value ? value : null;
}

/** Keep a typed excerpt; derive one from the post body when it is blank. */
function resolveExcerpt(raw: string | undefined, content: string): string {
  return raw?.trim() ? raw : generateExcerpt(content);
}

/** The post form fields createPost and updatePost both accept. */
const postFields = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  excerpt: z.string().optional(),
  coverImage: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
  published: z.string().transform((v) => v === 'true'),
  scheduledAt: z.string().optional(),
});

type PostFields = ReturnType<typeof postFields.parse>;

/** Map the post form fields to the columns both actions write. */
function toPostValues(input: PostFields) {
  return {
    title: input.title,
    content: input.content,
    excerpt: resolveExcerpt(input.excerpt, input.content),
    // null, not undefined: Drizzle skips undefined on update, which would keep
    // a cover the admin removed.
    coverImage: coverImageOf(input),
    category: cleanCategory(input.category),
    tags: parseTags(input.tags),
    readingTimeMinutes: readingTimeMinutes(input.content),
    published: input.published,
    scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
  };
}

export const server = {
  saveSettings: defineAction({
    accept: 'form',
    input: z.object({
      avatarUrl: z.string(),
      couplePhotoUrl: z.string(),
    }),
    handler: async (input, context) => {
      requireAdminAction(context);
      await Promise.all([
        setSiteSetting(SETTING_KEYS.AVATAR_URL, input.avatarUrl.trim()),
        setSiteSetting(SETTING_KEYS.COUPLE_PHOTO_URL, input.couplePhotoUrl.trim()),
      ]);
      return { success: true };
    },
  }),
  togglePublished: defineAction({
    input: z.object({
      id: z.string(),
      published: z.boolean(),
    }),
    handler: async (input, context) => {
      requireAdminAction(context);
      const now = new Date();
      if (!input.published) {
        // A schedule time that has passed is used up. Left in place, the cron
        // route would publish the post again at its next run. Cleared before
        // the post is unpublished, so it is never both unpublished and due.
        await db
          .update(posts)
          .set({ scheduledAt: null })
          .where(and(eq(posts.id, input.id), lte(posts.scheduledAt, now)));
      }
      await db
        .update(posts)
        .set({ published: input.published, updatedAt: now })
        .where(eq(posts.id, input.id));
      return { success: true };
    },
  }),
  deletePost: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, context) => {
      requireAdminAction(context);
      await db.delete(posts).where(eq(posts.id, input.id));
      return { success: true };
    },
  }),
  createPost: defineAction({
    accept: 'form',
    input: postFields,
    handler: async (input, context) => {
      requireAdminAction(context);

      // A title with no ASCII letters or digits slugifies to '', so fall back
      // to 'post'. posts.slug is unique: suffix -2, -3, ... on a clash.
      const baseSlug = slugify(input.title) || 'post';
      const taken = await db
        .select({ slug: posts.slug })
        .from(posts)
        .where(or(eq(posts.slug, baseSlug), like(posts.slug, `${baseSlug}-%`)));
      const slug = ensureUniqueSlug(baseSlug, new Set(taken.map((p) => p.slug)));

      await db.insert(posts).values({
        id: randomUUID(),
        slug,
        ...toPostValues(input),
      });

      return { success: true };
    },
  }),
  updatePost: defineAction({
    accept: 'form',
    // id first, then the shared fields: keeps the field order (and so the
    // order of validation issues) the action has always had.
    input: z.object({
      id: z.string(),
      ...postFields.shape,
    }),
    handler: async (input, context) => {
      requireAdminAction(context);

      // The slug is fixed at creation: /blog/<slug> and /og/<slug>.png are
      // public URLs, so editing the title must not move them.
      await db
        .update(posts)
        .set({
          ...toPostValues(input),
          updatedAt: new Date(),
        })
        .where(eq(posts.id, input.id));

      return { success: true };
    },
  }),
};
