/**
 * Integration tests for src/pages/og/[slug].png.ts
 *
 * The Drizzle `db` is mocked; the real `posts` table is kept so the WHERE the
 * route builds can be rendered to SQL and pinned. satori and resvg are stubbed:
 * these tests pin which post is looked up and the meta line, not the pixels.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const h = vi.hoisted(() => {
  const state = {
    result: [] as unknown[],
    calls: [] as Array<{ method: string; args: unknown[] }>,
  };
  function makeChain(): any {
    const chain: any = {};
    for (const method of ["from", "where", "orderBy", "limit", "offset"]) {
      chain[method] = vi.fn((...args: unknown[]) => {
        state.calls.push({ method, args });
        return chain;
      });
    }
    chain.then = (onFulfilled: any, onRejected: any) =>
      Promise.resolve(state.result).then(onFulfilled, onRejected);
    return chain;
  }
  const select = vi.fn((...args: unknown[]) => {
    state.calls.push({ method: "select", args });
    return makeChain();
  });
  const satori = vi.fn(async () => "<svg></svg>");
  return { state, select, satori };
});

vi.mock("@/db", async () => {
  const schema = await import("@shared/db/schema");
  return { db: { select: h.select }, posts: schema.posts };
});

vi.mock("satori", () => ({ default: h.satori }));

vi.mock("@resvg/resvg-js", () => ({
  Resvg: class {
    render() {
      return { asPng: () => new Uint8Array([137, 80, 78, 71]) };
    }
  },
}));

import { GET } from "@/pages/og/[slug].png";

const dialect = new PgDialect();
const render = (value: unknown) => {
  const { sql, params } = dialect.sqlToQuery(value as SQL);
  return { sql, params };
};
const argsOf = (method: string) => h.state.calls.find((c) => c.method === method)?.args ?? [];

/** The meta line ("date · N min read") is the last text node in the card. */
function metaLine(): string {
  const tree = (h.satori.mock.calls[0] as unknown[])[0] as any;
  const footer = tree.props.children[2].props.children[1].props.children;
  return footer[1].props.children;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.state.result = [];
  h.state.calls = [];
});

describe("GET /og/[slug].png", () => {
  it("returns 404 without querying when the slug is missing", async () => {
    const res = await GET({ params: {} } as any);
    expect(res.status).toBe(404);
    expect(h.select).not.toHaveBeenCalled();
  });

  it("looks the slug up among published posts only", async () => {
    const res = await GET({ params: { slug: "hello-world" } } as any);

    expect(res.status).toBe(404);
    expect(Object.keys(argsOf("select")[0] as object)).toEqual([
      "title",
      "createdAt",
      "readingTimeMinutes",
    ]);
    expect(render(argsOf("where")[0])).toEqual({
      sql: '("Post"."slug" = $1 and "Post"."published" = $2)',
      params: ["hello-world", true],
    });
    expect(argsOf("limit")).toEqual([1]);
  });

  it("renders a PNG with the stored reading time in the meta line", async () => {
    h.state.result = [
      { title: "Hello", createdAt: new Date("2026-03-15T12:00:00Z"), readingTimeMinutes: 4 },
    ];

    const res = await GET({ params: { slug: "hello" } } as any);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(metaLine()).toMatch(/ {2}· {2}4 min read$/);
  });

  it("leaves the reading time off the meta line when the post has none stored", async () => {
    h.state.result = [
      { title: "Old post", createdAt: new Date("2026-03-15T12:00:00Z"), readingTimeMinutes: null },
    ];

    const res = await GET({ params: { slug: "old-post" } } as any);

    expect(res.status).toBe(200);
    expect(metaLine()).not.toContain("min read");
  });
});
