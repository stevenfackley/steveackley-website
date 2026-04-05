import { describe, it, expect } from "vitest";
import { slugifyTitle } from "@/lib/utils";

describe("slugifyTitle", () => {
  it("lowercases the title", () => {
    expect(slugifyTitle("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugifyTitle("my blog post")).toBe("my-blog-post");
  });

  it("replaces non-alphanumeric chars with hyphens", () => {
    expect(slugifyTitle("Hello, World!")).toBe("hello-world");
  });

  it("collapses multiple separators into one hyphen", () => {
    expect(slugifyTitle("foo   ---   bar")).toBe("foo-bar");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugifyTitle("  hello  ")).toBe("hello");
    expect(slugifyTitle("!hello!")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(slugifyTitle("")).toBe("");
  });

  it("preserves numbers", () => {
    expect(slugifyTitle("Top 10 Tips")).toBe("top-10-tips");
  });

  it("handles already-slugified input", () => {
    expect(slugifyTitle("already-slugified")).toBe("already-slugified");
  });
});
