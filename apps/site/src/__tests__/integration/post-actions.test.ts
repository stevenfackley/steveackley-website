/**
 * Integration tests for the post actions in src/actions/index.ts
 *
 * `astro:actions` and `astro:schema` are virtual modules supplied by the
 * Astro build; they are mocked so `defineAction` hands back the raw
 * definition and the handlers can be called directly with parsed input.
 * The Drizzle `db` is mocked so no real database is touched; the real `posts`
 * table is kept so the WHERE clauses the handlers build can be rendered to SQL.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

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

vi.mock("@/db", async () => {
  const schema = await import("@shared/db/schema");
  return {
    db: { insert: h.insert, update: h.update, select: h.select },
    posts: schema.posts,
  };
});

vi.mock("@shared/lib/settings", () => ({ setSiteSetting: vi.fn() }));

import { server } from "@/actions";

const adminContext = { locals: { user: { role: "ADMIN" } } } as any;
const clientContext = { locals: { user: { role: "CLIENT" } } } as any;

const dialect = new PgDialect();
const render = (value: unknown) => {
  const { sql, params } = dialect.sqlToQuery(value as SQL);
  return { sql, params };
};

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

// Astro's form parser hands a blank optional field to the handler as
// undefined, so that is how "no cover" arrives from the admin form. "" and
// whitespace can only come from a hand-built request.
describe("post cover image", () => {
  const noCover = [undefined, "", "   "];

  it.each(noCover)("createPost stores NULL when the cover is %j", async (coverImage) => {
    await server.createPost.handler(postInput({ coverImage }) as any, adminContext);

    expect(h.insertValues.mock.calls[0][0]).toHaveProperty("coverImage", null);
  });

  it.each(noCover)("updatePost clears the stored cover when the cover is %j", async (coverImage) => {
    await server.updatePost.handler(postInput({ id: "p1", coverImage }) as any, adminContext);

    // undefined would make Drizzle skip the column and keep the old cover.
    expect(h.updateSet.mock.calls[0][0]).toHaveProperty("coverImage", null);
  });

  it("keeps a cover that is set, exactly as sent", async () => {
    const coverImage = "https://cdn.example.com/cover.webp";

    await server.createPost.handler(postInput({ coverImage }) as any, adminContext);
    await server.updatePost.handler(postInput({ id: "p1", coverImage }) as any, adminContext);

    expect(h.insertValues.mock.calls[0][0]).toHaveProperty("coverImage", coverImage);
    expect(h.updateSet.mock.calls[0][0]).toHaveProperty("coverImage", coverImage);
  });
});

// ── Characterization: the exact rows both actions write ─────────────────────

const filledForm = {
  title: "Hello World",
  excerpt: "My own summary",
  coverImage: "https://cdn.example.com/cover.webp",
  category: "  Engineering  ",
  tags: " astro, react ,, drizzle ",
  published: true,
  scheduledAt: "2026-12-01T09:00:00.000Z",
};

const filledColumns = {
  title: "Hello World",
  content: postInput().content,
  excerpt: "My own summary",
  coverImage: "https://cdn.example.com/cover.webp",
  category: "Engineering",
  tags: ["astro", "react", "drizzle"],
  readingTimeMinutes: 1,
  published: true,
  scheduledAt: new Date("2026-12-01T09:00:00.000Z"),
};

const blankColumns = {
  title: "Hello World",
  content: postInput().content,
  excerpt: "Hello world and the rest of the body.",
  coverImage: null,
  category: null,
  tags: null,
  readingTimeMinutes: 1,
  published: false,
  scheduledAt: null,
};

describe("createPost row", () => {
  it("writes every column from a filled-in form", async () => {
    await server.createPost.handler(postInput(filledForm) as any, adminContext);

    expect(h.insertValues).toHaveBeenCalledTimes(1);
    expect(h.insertValues.mock.calls[0][0]).toStrictEqual({
      id: expect.any(String),
      slug: "hello-world",
      ...filledColumns,
    });
  });

  it("collapses blank optional fields", async () => {
    await server.createPost.handler(postInput({ category: "   ", tags: " , " }) as any, adminContext);

    expect(h.insertValues.mock.calls[0][0]).toStrictEqual({
      id: expect.any(String),
      slug: "hello-world",
      ...blankColumns,
    });
  });

  it("writes NULL for an absent cover image", async () => {
    await server.createPost.handler(
      { title: "T", content: "<p>x</p>", published: false } as any,
      adminContext,
    );

    expect(h.insertValues.mock.calls[0][0]).toStrictEqual({
      id: expect.any(String),
      slug: "t",
      title: "T",
      content: "<p>x</p>",
      excerpt: "x",
      coverImage: null,
      category: null,
      tags: null,
      readingTimeMinutes: 1,
      published: false,
      scheduledAt: null,
    });
  });

  it("gives each new post a fresh id", async () => {
    await server.createPost.handler(postInput() as any, adminContext);
    await server.createPost.handler(postInput() as any, adminContext);

    const [first, second] = h.insertValues.mock.calls.map((c: any[]) => c[0].id);
    expect(first).not.toBe(second);
  });

  it("looks up the base slug and every suffixed variant in one query", async () => {
    await server.createPost.handler(postInput({ title: "Hello World" }) as any, adminContext);

    expect(h.select).toHaveBeenCalledTimes(1);
    expect(render(h.selectWhere.mock.calls[0][0])).toEqual({
      sql: '("Post"."slug" = $1 or "Post"."slug" like $2)',
      params: ["hello-world", "hello-world-%"],
    });
  });

  // The slug rule that runs in production: lower-case, every run of characters
  // outside a-z0-9 becomes one hyphen, hyphens trimmed from both ends, and
  // "post" when nothing is left.
  it.each([
    ["Don't Stop", "don-t-stop"],
    ["v1.2 release notes", "v1-2-release-notes"],
    ["  ¡Hola, Mundo!  ", "hola-mundo"],
    ["C# & .NET_10", "c-net-10"],
    ["Café au lait", "caf-au-lait"],
    ["snake_case_title", "snake-case-title"],
    ["---", "post"],
  ])("slugifies %j as %j", async (title, slug) => {
    await server.createPost.handler(postInput({ title }) as any, adminContext);

    expect(h.insertValues.mock.calls[0][0].slug).toBe(slug);
  });
});

describe("updatePost row", () => {
  it("writes every column and stamps updatedAt, keyed by id", async () => {
    await server.updatePost.handler(postInput({ id: "p1", ...filledForm }) as any, adminContext);

    expect(h.updateSet).toHaveBeenCalledTimes(1);
    expect(h.updateSet.mock.calls[0][0]).toStrictEqual({
      ...filledColumns,
      updatedAt: expect.any(Date),
    });
    expect(render(h.updateWhere.mock.calls[0][0])).toEqual({ sql: '"Post"."id" = $1', params: ["p1"] });
  });

  it("collapses blank optional fields", async () => {
    await server.updatePost.handler(postInput({ id: "p1", category: "   ", tags: " , " }) as any, adminContext);

    expect(h.updateSet.mock.calls[0][0]).toStrictEqual({ ...blankColumns, updatedAt: expect.any(Date) });
  });
});

describe("togglePublished", () => {
  it("publishes with one update, keyed by id, and leaves the schedule time alone", async () => {
    await server.togglePublished.handler({ id: "p1", published: true }, adminContext);

    expect(h.updateSet).toHaveBeenCalledTimes(1);
    expect(h.updateSet.mock.calls[0][0]).toStrictEqual({ published: true, updatedAt: expect.any(Date) });
    expect(render(h.updateWhere.mock.calls[0][0])).toEqual({ sql: '"Post"."id" = $1', params: ["p1"] });
  });

  it("unpublishing first clears a schedule time that has passed, then unpublishes", async () => {
    // Left in place, a passed time would make the cron route publish the post
    // again at its next run.
    await server.togglePublished.handler({ id: "p1", published: false }, adminContext);

    expect(h.updateSet).toHaveBeenCalledTimes(2);

    expect(h.updateSet.mock.calls[0][0]).toStrictEqual({ scheduledAt: null });
    const clear = render(h.updateWhere.mock.calls[0][0]);
    expect(clear.sql).toBe('("Post"."id" = $1 and "Post"."scheduledAt" <= $2)');
    expect(clear.params[0]).toBe("p1");

    const unpublish = h.updateSet.mock.calls[1][0] as { published: boolean; updatedAt: Date };
    expect(unpublish).toStrictEqual({ published: false, updatedAt: expect.any(Date) });
    expect(render(h.updateWhere.mock.calls[1][0])).toEqual({ sql: '"Post"."id" = $1', params: ["p1"] });

    // "Passed" is judged against the same instant the row is stamped with.
    expect(new Date(clear.params[1] as string).getTime()).toBe(unpublish.updatedAt.getTime());
  });

  it("does not unpublish when clearing the schedule time fails", async () => {
    h.updateWhere.mockRejectedValueOnce(new Error("db down"));

    await expect(
      server.togglePublished.handler({ id: "p1", published: false }, adminContext),
    ).rejects.toThrow("db down");

    expect(h.updateSet).toHaveBeenCalledTimes(1);
    expect(h.updateSet.mock.calls[0][0]).toStrictEqual({ scheduledAt: null });
  });

  it("rejects a non-admin before touching the database", async () => {
    await expect(
      server.togglePublished.handler({ id: "p1", published: false }, clientContext),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    expect(h.update).not.toHaveBeenCalled();
  });
});

describe("post action guards", () => {
  it.each(["createPost", "updatePost"] as const)(
    "%s rejects a non-admin before touching the database",
    async (name) => {
      await expect(
        server[name].handler(postInput({ id: "p1" }) as any, clientContext),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });

      expect(h.select).not.toHaveBeenCalled();
      expect(h.insert).not.toHaveBeenCalled();
      expect(h.update).not.toHaveBeenCalled();
    },
  );
});

describe("post action input schemas", () => {
  const fields = ["title", "content", "excerpt", "coverImage", "category", "tags", "published", "scheduledAt"];

  it("createPost takes the post fields; updatePost takes id first, then the same fields", () => {
    expect(Object.keys((server.createPost as any).input.shape)).toEqual(fields);
    expect(Object.keys((server.updatePost as any).input.shape)).toEqual(["id", ...fields]);
  });

  it("reads published as true only for the string 'true'", () => {
    const parse = (published: string) =>
      (server.createPost as any).input.parse({ title: "T", content: "C", published }).published;

    expect(parse("true")).toBe(true);
    expect(parse("false")).toBe(false);
    expect(parse("on")).toBe(false);
  });

  it("reports missing required fields in field order", () => {
    const paths = (name: "createPost" | "updatePost") =>
      (server[name] as any).input.safeParse({}).error.issues.map((i: any) => i.path.join("."));

    expect(paths("createPost")).toEqual(["title", "content", "published"]);
    expect(paths("updatePost")).toEqual(["id", "title", "content", "published"]);
  });

  it("rejects an empty title or body", () => {
    const result = (server.updatePost as any).input.safeParse({ id: "p1", title: "", content: "", published: "true" });

    expect(result.success).toBe(false);
    expect(result.error.issues.map((i: any) => i.path.join("."))).toEqual(["title", "content"]);
  });
});
