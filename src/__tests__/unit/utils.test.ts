import { describe, it, expect } from "vitest";
import {
  cn,
  slugify,
  stripHtml,
  generateExcerpt,
  formatDate,
  formatDateShort,
  formatDateTime,
  ensureUniqueSlug,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// cn — tailwind class merger
// ---------------------------------------------------------------------------
describe("cn", () => {
  it("joins class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles falsy values", () => {
    expect(cn("foo", undefined, null, false, "bar")).toBe("foo bar");
  });

  it("merges conflicting Tailwind classes (last wins)", () => {
    // tailwind-merge keeps the last conflicting class
    const result = cn("px-2", "px-4");
    expect(result).toBe("px-4");
  });

  it("works with an object of conditionals", () => {
    expect(cn({ "text-red-500": true, "text-blue-500": false })).toBe(
      "text-red-500"
    );
  });
});

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------
describe("slugify", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Hello, World!")).toBe("hello-world");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("foo  --  bar")).toBe("foo-bar");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("replaces underscores with hyphens", () => {
    expect(slugify("hello_world")).toBe("hello-world");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles numbers", () => {
    expect(slugify("Post 42")).toBe("post-42");
  });

  it("handles unicode safely (strips non-ASCII)", () => {
    // Non-word unicode chars get stripped
    const result = slugify("café");
    expect(result).toMatch(/^[a-z0-9-]*$/);
  });
});

// ---------------------------------------------------------------------------
// stripHtml
// ---------------------------------------------------------------------------
describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello <strong>World</strong></p>")).toBe(
      "Hello World"
    );
  });

  it("decodes common HTML entities", () => {
    expect(stripHtml("A &amp; B &lt;C&gt; &quot;D&quot;")).toBe(
      'A & B <C> "D"'
    );
  });

  it("replaces &nbsp; with a space", () => {
    expect(stripHtml("foo&nbsp;bar")).toBe("foo bar");
  });

  it("collapses multiple whitespace into one space", () => {
    expect(stripHtml("<p>  too   many   spaces  </p>")).toBe("too many spaces");
  });

  it("returns empty string for empty input", () => {
    expect(stripHtml("")).toBe("");
  });

  it("handles nested tags", () => {
    expect(
      stripHtml("<div><ul><li>item one</li><li>item two</li></ul></div>")
    ).toBe("item one item two");
  });
});

// ---------------------------------------------------------------------------
// generateExcerpt
// ---------------------------------------------------------------------------
describe("generateExcerpt", () => {
  const shortText = "Short text.";
  const longHtml =
    "<p>" + "word ".repeat(50) + "</p>"; // 50 words, well over 160 chars

  it("returns the full text when shorter than the limit", () => {
    expect(generateExcerpt(`<p>${shortText}</p>`)).toBe(shortText);
  });

  it("truncates at word boundary and appends ellipsis", () => {
    const excerpt = generateExcerpt(longHtml, 40);
    expect(excerpt.endsWith("…")).toBe(true);
    // The plain text before ellipsis should be ≤40 chars
    expect(excerpt.slice(0, -1).length).toBeLessThanOrEqual(40);
  });

  it("does not cut in the middle of a word", () => {
    // "The quick brown fox" → sliced at 10 chars → "The quick " → trimmed to "The quick"
    // Both words are complete — this tests the /\s+\S*$/ stripping logic
    const excerpt = generateExcerpt("<p>The quick brown fox</p>", 10);
    expect(excerpt.endsWith("…")).toBe(true);
    // Every token before the ellipsis must be a complete word from the source
    const source = "The quick brown fox";
    const textBeforeEllipsis = excerpt.slice(0, -1); // drop "…"
    const words = textBeforeEllipsis.trim().split(/\s+/);
    expect(words.every((w) => source.split(" ").includes(w))).toBe(true);
  });

  it("respects a custom length", () => {
    const excerpt = generateExcerpt(longHtml, 20);
    expect(excerpt.length).toBeLessThanOrEqual(21 + 1); // 20 chars + …
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe("formatDate", () => {
  it("formats a Date object in long US format", () => {
    const result = formatDate(new Date("2026-02-26"));
    expect(result).toMatch(/February/);
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/26/);
  });

  it("accepts an ISO string", () => {
    // Use noon UTC so the date is unambiguous in any timezone (avoids UTC→local midnight rollback)
    const result = formatDate("2026-01-15T12:00:00Z");
    expect(result).toMatch(/January/);
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/15/);
  });
});

// ---------------------------------------------------------------------------
// formatDateShort
// ---------------------------------------------------------------------------
describe("formatDateShort", () => {
  it("formats in short US format", () => {
    const result = formatDateShort(new Date("2026-02-26"));
    expect(result).toMatch(/Feb/);
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/26/);
  });
});

// ---------------------------------------------------------------------------
// formatDateTime
// ---------------------------------------------------------------------------
describe("formatDateTime", () => {
  it("includes date and time components", () => {
    const result = formatDateTime(new Date("2026-02-26T15:45:00"));
    expect(result).toMatch(/Feb/);
    expect(result).toMatch(/2026/);
    // Time portion — AM/PM
    expect(result).toMatch(/[AP]M/i);
  });
});

// ---------------------------------------------------------------------------
// ensureUniqueSlug
// ---------------------------------------------------------------------------
describe("ensureUniqueSlug", () => {
  it("returns the base slug when not in the set", () => {
    expect(ensureUniqueSlug("hello", new Set())).toBe("hello");
  });

  it("appends -2 when base slug is taken", () => {
    expect(ensureUniqueSlug("hello", new Set(["hello"]))).toBe("hello-2");
  });

  it("increments counter until a free slot is found", () => {
    const existing = new Set(["hello", "hello-2", "hello-3"]);
    expect(ensureUniqueSlug("hello", existing)).toBe("hello-4");
  });

  it("does not mutate the existing slugs set", () => {
    const existing = new Set(["test"]);
    ensureUniqueSlug("test", existing);
    expect(existing.size).toBe(1);
  });
});
