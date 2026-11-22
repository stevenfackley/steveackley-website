/**
 * Integration tests for src/pages/rss.xml.ts
 *
 * The Astro API route handler is called directly. The Drizzle `db` is mocked
 * so no real database is touched; the real `posts` table is kept so the WHERE
 * and ORDER BY the route builds can be rendered to SQL and pinned exactly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const h = vi.hoisted(() => {
  const state = {
    // What the query resolves to; tests either set it directly or let
    // resolveRows derive it from a fixture table.
    result: [] as unknown[],
    resolveRows: null as null | ((calls: Array<{ method: string; args: unknown[] }>) => unknown[]),
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
      Promise.resolve(state.resolveRows ? state.resolveRows(state.calls) : state.result).then(
        onFulfilled,
        onRejected,
      );
    return chain;
  }
  const select = vi.fn((...args: unknown[]) => {
    state.calls.push({ method: "select", args });
    return makeChain();
  });
  return { state, select };
});

vi.mock("@/db", async () => {
  const schema = await import("@shared/db/schema");
  return { db: { select: h.select }, posts: schema.posts };
});

import { GET } from "@/pages/rss.xml";

const dialect = new PgDialect();
const render = (value: unknown) => {
  const { sql, params } = dialect.sqlToQuery(value as SQL);
  return { sql, params };
};
const argsOf = (method: string) => h.state.calls.find((c) => c.method === method)?.args ?? [];

const createdAt = new Date("2026-01-15T12:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  h.state.result = [];
  h.state.resolveRows = null;
  h.state.calls = [];
});

describe("GET /rss.xml query", () => {
  it("selects the newest 50 published posts", async () => {
    await GET({} as any);

    expect(h.select).toHaveBeenCalledTimes(1);
    expect(Object.keys(argsOf("select")[0] as object)).toEqual(["slug", "title", "excerpt", "createdAt"]);
    expect(render(argsOf("where")[0])).toEqual({ sql: '"Post"."published" = $1', params: [true] });
    expect(render(argsOf("orderBy")[0])).toEqual({ sql: '"Post"."createdAt" desc', params: [] });
    expect(argsOf("limit")).toEqual([50]);
  });
});

describe("GET /rss.xml contents", () => {
  // Fixed dates, no clock: "later" is only later than the other rows.
  const rows = [
    {
      slug: "live-post",
      title: "Live Post",
      excerpt: "Out now",
      published: true,
      scheduledAt: null,
      createdAt: new Date("2026-01-10T12:00:00Z"),
    },
    {
      slug: "draft-post",
      title: "Draft Post",
      excerpt: "Not yet",
      published: false,
      scheduledAt: null,
      createdAt: new Date("2026-01-11T12:00:00Z"),
    },
    {
      slug: "scheduled-post",
      title: "Scheduled Post",
      excerpt: "Waiting for the cron",
      published: false,
      scheduledAt: new Date("2099-01-01T09:00:00Z"),
      createdAt: new Date("2026-01-12T12:00:00Z"),
    },
    {
      slug: "published-future-date",
      title: "Published With A Future Date",
      excerpt: "Published flag set, schedule still ahead",
      published: true,
      scheduledAt: new Date("2099-01-01T09:00:00Z"),
      createdAt: new Date("2026-01-13T12:00:00Z"),
    },
  ];

  // Apply the route's WHERE to the fixture. Only the one condition shape the
  // feed uses is understood; any other WHERE fails the test, so a change to
  // what the feed contains cannot slip through.
  function rowsMatchingWhere(calls: Array<{ method: string; args: unknown[] }>) {
    const where = calls.find((c) => c.method === "where")?.args[0];
    const { sql, params } = render(where);
    const match = /^"Post"\."(\w+)" = \$1$/.exec(sql);
    if (!match) throw new Error(`fixture cannot evaluate WHERE ${sql}`);
    const column = match[1] as keyof (typeof rows)[number];
    return rows
      .filter((row) => row[column] === params[0])
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  it("lists published posts, newest first, and leaves drafts and scheduled posts out", async () => {
    h.state.resolveRows = rowsMatchingWhere;

    const xml = await (await GET({} as any)).text();
    const links = [...xml.matchAll(/<link>https:\/\/steveackley\.org\/blog\/([^<]+)<\/link>/g)].map((m) => m[1]);

    expect(links).toEqual(["published-future-date", "live-post"]);
    expect(xml).not.toContain("draft-post");
    expect(xml).not.toContain("scheduled-post");
    expect(xml).toContain(`<lastBuildDate>${new Date("2026-01-13T12:00:00Z").toUTCString()}</lastBuildDate>`);
  });

  it("uses the excerpt as the item description", async () => {
    h.state.result = [{ slug: "a", title: "Post A", excerpt: "Short summary", createdAt }];

    const res = await GET({} as any);
    const xml = await res.text();

    expect(xml).toContain("<description>Short summary</description>");
  });

  it("falls back to the title when the excerpt is null or an empty string", async () => {
    h.state.result = [
      { slug: "a", title: "Null Excerpt", excerpt: null, createdAt },
      { slug: "b", title: "Blank Excerpt", excerpt: "", createdAt },
    ];

    const res = await GET({} as any);
    const xml = await res.text();

    expect(xml).toContain("<description>Null Excerpt</description>");
    expect(xml).toContain("<description>Blank Excerpt</description>");
    expect(xml).not.toContain("<description></description>");
  });

  it("dates an empty feed at the epoch", async () => {
    const res = await GET({} as any);
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/rss+xml; charset=utf-8");
    expect(xml).toContain(`<lastBuildDate>${new Date(0).toUTCString()}</lastBuildDate>`);
    expect(xml).not.toContain("<item>");
  });
});
