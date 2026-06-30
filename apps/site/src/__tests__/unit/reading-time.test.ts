import { describe, it, expect } from "vitest";
import {
  WORDS_PER_MINUTE,
  countWords,
  readingTimeMinutes,
} from "@/lib/reading-time";

// ---------------------------------------------------------------------------
// countWords
// ---------------------------------------------------------------------------
describe("countWords", () => {
  it("counts simple whitespace-delimited words", () => {
    expect(countWords("one two three")).toBe(3);
  });

  it("collapses runs of whitespace", () => {
    expect(countWords("one   two\t\nthree")).toBe(3);
  });

  it("returns 0 for an empty string", () => {
    expect(countWords("")).toBe(0);
  });

  it("returns 0 for whitespace-only input", () => {
    expect(countWords("   \n\t  ")).toBe(0);
  });

  it("counts a single word", () => {
    expect(countWords("hello")).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// readingTimeMinutes
// ---------------------------------------------------------------------------
describe("readingTimeMinutes", () => {
  it("uses 200 wpm as the default rate", () => {
    expect(WORDS_PER_MINUTE).toBe(200);
  });

  it("strips HTML tags before counting words", () => {
    const html = "<p>" + "word ".repeat(200) + "</p>";
    // 200 words / 200 wpm = exactly 1 minute
    expect(readingTimeMinutes(html)).toBe(1);
  });

  it("rounds to the nearest whole minute", () => {
    // 500 words / 200 wpm = 2.5 → rounds to 3
    expect(readingTimeMinutes("w ".repeat(500))).toBe(3);
    // 420 words / 200 wpm = 2.1 → rounds to 2
    expect(readingTimeMinutes("w ".repeat(420))).toBe(2);
  });

  it("clamps to a minimum of 1 minute for short content", () => {
    expect(readingTimeMinutes("just a few words")).toBe(1);
  });

  it("returns 1 minute for empty content (never 0)", () => {
    expect(readingTimeMinutes("")).toBe(1);
  });

  it("treats null/undefined content as empty (1 minute)", () => {
    expect(readingTimeMinutes(null)).toBe(1);
    expect(readingTimeMinutes(undefined)).toBe(1);
  });

  it("decodes HTML entities via stripHtml when counting", () => {
    // "a &amp; b" → "a & b" → 3 words
    expect(countWords("a & b")).toBe(3);
    expect(readingTimeMinutes("<p>a &amp; b</p>")).toBe(1);
  });

  it("honours a custom words-per-minute rate", () => {
    // 300 words / 100 wpm = 3 minutes
    expect(readingTimeMinutes("w ".repeat(300), 100)).toBe(3);
  });
});
