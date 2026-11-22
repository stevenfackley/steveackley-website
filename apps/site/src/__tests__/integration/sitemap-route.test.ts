/**
 * Integration tests for src/pages/sitemap.xml.ts
 *
 * The Drizzle `db` is mocked; the real `posts` table is kept so the WHERE and
 * ORDER BY the route builds can be rendered to SQL and pinned exactly.
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
  return { state, select };
});

vi.mock("@/db", async () => {
  const schema = await import("@shared/db/schema");
  return { db: { select: h.select }, posts: schema.posts };
});

import { GET } from "@/pages/sitemap.xml";

const dialect = new PgDialect();
const render = (value: unknown) => {
  const { sql, params } = dialect.sqlToQuery(value as SQL);
  return { sql, params };
};
const argsOf = (method: string) => h.state.calls.find((c) => c.method === method)?.args ?? [];

beforeEach(() => {
  vi.clearAllMocks();
  h.state.result = [];
  h.state.calls = [];
});

describe("GET /sitemap.xml", () => {
  it("lists only published posts, most recently updated first", async () => {
    await GET({} as any);

    expect(h.select).toHaveBeenCalledTimes(1);
    expect(Object.keys(argsOf("select")[0] as object)).toEqual(["slug", "updatedAt"]);
    expect(render(argsOf("where")[0])).toEqual({ sql: '"Post"."published" = $1', params: [true] });
    expect(render(argsOf("orderBy")[0])).toEqual({ sql: '"Post"."updatedAt" desc', params: [] });
  });

  it("renders static routes then one escaped entry per post", async () => {
    h.state.result = [
      { slug: "first-post", updatedAt: new Date("2026-01-02T03:04:05.000Z") },
      { slug: "a&b", updatedAt: new Date("2026-02-03T00:00:00.000Z") },
    ];

    const res = await GET({} as any);
    const body = await res.text();

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
    expect(body).toContain("<loc>https://steveackley.org/</loc>");
    expect(body).toContain(
      "<loc>https://steveackley.org/blog/first-post</loc>\n    <lastmod>2026-01-02T03:04:05.000Z</lastmod>",
    );
    expect(body).toContain("<loc>https://steveackley.org/blog/a&amp;b</loc>");
    expect(body.indexOf("first-post")).toBeLessThan(body.indexOf("a&amp;b"));
  });
});
