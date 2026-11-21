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

  return { insert, insertValues, update, updateSet, updateWhere };
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
  db: { insert: h.insert, update: h.update },
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
