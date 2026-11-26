import { describe, it, expect } from "vitest";
import { pageExists, requestedPage } from "@/lib/pagination";

describe("requestedPage", () => {
  it("is page 1 when there is no ?page=", () => {
    expect(requestedPage(null)).toBe(1);
  });

  it.each([
    ["1", 1],
    ["2", 2],
    ["37", 37],
  ])("reads ?page=%s as page %i", (value, page) => {
    expect(requestedPage(value)).toBe(page);
  });

  it.each(["abc", "", "0", "-3", "NaN", "Infinity", "-Infinity"])(
    "falls back to page 1 for ?page=%s",
    (value) => {
      expect(requestedPage(value)).toBe(1);
    },
  );

  it("drops the fraction", () => {
    expect(requestedPage("2.9")).toBe(2);
  });
});

describe("pageExists", () => {
  it("accepts every page up to the last one", () => {
    expect(pageExists(1, 3)).toBe(true);
    expect(pageExists(3, 3)).toBe(true);
  });

  it("rejects a page past the last one", () => {
    expect(pageExists(4, 3)).toBe(false);
  });

  // The number that used to reach the database as an offset Postgres cannot hold.
  it("rejects a page number far past anything a blog could have", () => {
    expect(pageExists(requestedPage("99999999999999999999"), 3)).toBe(false);
  });

  it("keeps page 1 for a blog with no posts, so the empty state still renders", () => {
    expect(pageExists(1, 0)).toBe(true);
    expect(pageExists(2, 0)).toBe(false);
  });
});
