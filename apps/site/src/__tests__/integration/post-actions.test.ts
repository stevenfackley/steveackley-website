/**
 * Integration tests for the post actions in src/actions/index.ts
 *
 * `astro:actions` and `astro:schema` are virtual modules supplied by the
 * Astro build; they are mocked so `defineAction` hands back the raw
 * definition and the handlers can be called directly with parsed input.
 * The Drizzle `db` is mocked so no real database is touched.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const insertValues = vi.fn();
  const insert = vi.fn(() => ({ values: insertValues }));

  const updateWhere = vi.fn();
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));

  const selectWhere = vi.fn();
  const selectFrom = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from: selectFrom }));

  return { insert, insertValues, update, updateSet, updateWhere, select, selectWhere };
});

vi.mock("astro:actions", () => ({
  defineAction: (def: unknown) => def,
  ActionError: class ActionError extends Error {
    code: string;
    constructor({ code, message }: { code: string; message: string }) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock("astro:schema", async () => ({ z: (await import("zod")).z }));

vi.mock("@/db", () => ({
  db: { insert: h.insert, update: h.update, select: h.select },
  posts: { id: "id", slug: "slug" },
}));

vi.mock("@shared/lib/settings", () => ({ setSiteSetting: vi.fn() }));

import { server } from "@/actions";

const adminContext = { locals: { user: { role: "ADMIN" } } } as any;

function postInput(overrides: Record<string, unknown> = {}) {
  return {
    title: "Hello World",
    content: "<p>Hello <strong>world</strong> and the rest of the body.</p>",
    excerpt: "",
    coverImage: "",
    category: "",
    tags: "",
    published: false,
    scheduledAt: "",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.insertValues.mockResolvedValue(undefined);
  h.updateWhere.mockResolvedValue(undefined);
  h.selectWhere.mockResolvedValue([]);
});

describe("createPost slug", () => {
  it("derives the slug from the title", async () => {
    await server.createPost.handler(postInput({ title: "Hello World" }) as any, adminContext);

    expect(h.insertValues).toHaveBeenCalledWith(expect.objectContaining({ slug: "hello-world" }));
  });

  it("suffixes the slug when another post already has it", async () => {
    h.selectWhere.mockResolvedValue([{ slug: "hello-world" }, { slug: "hello-world-2" }]);

    await server.createPost.handler(postInput({ title: "Hello World" }) as any, adminContext);

    expect(h.insertValues).toHaveBeenCalledWith(expect.objectContaining({ slug: "hello-world-3" }));
  });

  it("falls back to a non-empty slug for a title with no ASCII letters or digits", async () => {
    await server.createPost.handler(postInput({ title: "日本語のタイトル" }) as any, adminContext);

    expect(h.insertValues).toHaveBeenCalledWith(expect.objectContaining({ slug: "post" }));
  });
});

describe("updatePost slug", () => {
  it("leaves the slug alone when the title changes", async () => {
    await server.updatePost.handler(postInput({ id: "p1", title: "A Brand New Title" }) as any, adminContext);

    expect(h.updateSet).toHaveBeenCalledWith(expect.objectContaining({ title: "A Brand New Title" }));
    expect(h.updateSet.mock.calls[0][0]).not.toHaveProperty("slug");
  });
});

describe("createPost", () => {
  it("derives the excerpt from the content when it is left blank", async () => {
    await server.createPost.handler(postInput({ excerpt: "" }) as any, adminContext);

    expect(h.insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ excerpt: "Hello world and the rest of the body." }),
    );
  });

  it("keeps an excerpt the admin typed", async () => {
    await server.createPost.handler(postInput({ excerpt: "My own summary" }) as any, adminContext);

    expect(h.insertValues).toHaveBeenCalledWith(expect.objectContaining({ excerpt: "My own summary" }));
  });
});

describe("updatePost", () => {
  it("derives the excerpt from the content when it is cleared", async () => {
    await server.updatePost.handler(postInput({ id: "p1", excerpt: "   " }) as any, adminContext);

    expect(h.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ excerpt: "Hello world and the rest of the body." }),
    );
  });
});
