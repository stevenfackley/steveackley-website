/**
 * Integration tests for src/pages/rss.xml.ts
 *
 * The Astro API route handler is called directly. The Drizzle `db` is mocked
 * so no real database is touched.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const limit = vi.fn();
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return { select, from, where, orderBy, limit };
});

vi.mock("@/db", () => ({
  db: { select: h.select },
  posts: { slug: "slug", title: "title", excerpt: "excerpt", createdAt: "createdAt", published: "published" },
}));

import { GET } from "@/pages/rss.xml";

const createdAt = new Date("2026-01-15T12:00:00Z");

describe("GET /rss.xml", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the excerpt as the item description", async () => {
    h.limit.mockResolvedValue([{ slug: "a", title: "Post A", excerpt: "Short summary", createdAt }]);

    const res = await GET({} as any);
    const xml = await res.text();

    expect(xml).toContain("<description>Short summary</description>");
  });

  it("falls back to the title when the excerpt is null or an empty string", async () => {
    h.limit.mockResolvedValue([
      { slug: "a", title: "Null Excerpt", excerpt: null, createdAt },
      { slug: "b", title: "Blank Excerpt", excerpt: "", createdAt },
    ]);

    const res = await GET({} as any);
    const xml = await res.text();

    expect(xml).toContain("<description>Null Excerpt</description>");
    expect(xml).toContain("<description>Blank Excerpt</description>");
    expect(xml).not.toContain("<description></description>");
  });
});
