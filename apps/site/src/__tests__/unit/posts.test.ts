import { describe, it, expect } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { coverImageOf, isPublic, isPublicPost, readMinutesOf, withReadMinutes } from "@/lib/posts";

const dialect = new PgDialect();

describe("isPublic", () => {
  it("is the published = true condition the post queries have always used", () => {
    const { sql, params } = dialect.sqlToQuery(isPublic());
    expect({ sql, params }).toEqual({ sql: '"Post"."published" = $1', params: [true] });
  });
});

describe("isPublicPost", () => {
  it("is true only for published rows", () => {
    expect(isPublicPost({ published: true })).toBe(true);
    expect(isPublicPost({ published: false })).toBe(false);
  });
});

describe("readMinutesOf", () => {
  const body = `<p>${"word ".repeat(450)}</p>`; // 450 words -> 2 min at 200 wpm

  it("uses the stored reading time when there is one", () => {
    expect(readMinutesOf({ readingTimeMinutes: 7, content: body })).toBe(7);
  });

  it("keeps a stored zero rather than recomputing", () => {
    expect(readMinutesOf({ readingTimeMinutes: 0, content: body })).toBe(0);
  });

  it("computes it from the body when none is stored", () => {
    expect(readMinutesOf({ readingTimeMinutes: null, content: body })).toBe(2);
    expect(readMinutesOf({ readingTimeMinutes: null, content: "" })).toBe(1);
  });
});

describe("coverImageOf", () => {
  it("returns a cover exactly as stored", () => {
    expect(coverImageOf({ coverImage: "https://cdn.example.com/cover.webp" })).toBe(
      "https://cdn.example.com/cover.webp",
    );
    expect(coverImageOf({ coverImage: " /uploads/cover.png " })).toBe(" /uploads/cover.png ");
  });

  it.each([null, undefined, "", "   ", "\n\t"])("is null when the cover is %j", (coverImage) => {
    expect(coverImageOf({ coverImage })).toBeNull();
  });

  it("is null when the row carries no cover field", () => {
    expect(coverImageOf({})).toBeNull();
  });
});

describe("withReadMinutes", () => {
  it("keeps every field and adds readMinutes", () => {
    const post = { id: "p1", title: "T", readingTimeMinutes: null, content: "one two three" };
    expect(withReadMinutes(post)).toEqual({ ...post, readMinutes: 1 });
  });
});
