import './chunks/virtual__lkE-L3Q.mjs';
import * as z from 'zod';
import { d as db, p as posts } from './chunks/index_BS2BhPuU.mjs';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { a as defineAction } from './chunks/index_T92e_VwJ.mjs';

const server = {
  togglePublished: defineAction({
    input: z.object({
      id: z.string(),
      published: z.boolean()
    }),
    handler: async (input, context) => {
      if (!context.locals.user || context.locals.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
      }
      await db.update(posts).set({ published: input.published, updatedAt: /* @__PURE__ */ new Date() }).where(eq(posts.id, input.id));
      return { success: true };
    }
  }),
  deletePost: defineAction({
    input: z.object({
      id: z.string()
    }),
    handler: async (input, context) => {
      if (!context.locals.user || context.locals.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
      }
      await db.delete(posts).where(eq(posts.id, input.id));
      return { success: true };
    }
  }),
  createPost: defineAction({
    accept: "form",
    input: z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      excerpt: z.string().optional(),
      coverImage: z.string().optional(),
      published: z.string().transform((v) => v === "true")
    }),
    handler: async (input, context) => {
      if (!context.locals.user || context.locals.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
      }
      const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      await db.insert(posts).values({
        id: randomUUID(),
        title: input.title,
        slug,
        content: input.content,
        excerpt: input.excerpt,
        coverImage: input.coverImage,
        published: input.published
      });
      return { success: true };
    }
  }),
  updatePost: defineAction({
    accept: "form",
    input: z.object({
      id: z.string(),
      title: z.string().min(1),
      content: z.string().min(1),
      excerpt: z.string().optional(),
      coverImage: z.string().optional(),
      published: z.string().transform((v) => v === "true")
    }),
    handler: async (input, context) => {
      if (!context.locals.user || context.locals.user.role !== "ADMIN") {
        throw new Error("Unauthorized");
      }
      const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      await db.update(posts).set({
        title: input.title,
        slug,
        content: input.content,
        excerpt: input.excerpt,
        coverImage: input.coverImage,
        published: input.published,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(posts.id, input.id));
      return { success: true };
    }
  })
};

export { server };
