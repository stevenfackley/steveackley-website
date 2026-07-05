/**
 * Unit tests for src/lib/seo.ts
 * Pure JSON-LD builder functions — no mocking required.
 */
import { describe, it, expect } from "vitest";
import {
  personSchema,
  resumePersonSchema,
  breadcrumbSchema,
  blogPostingSchema,
} from "@/lib/seo";
import type { ResumeContent } from "@/content/types";

// ---------------------------------------------------------------------------
// personSchema
// ---------------------------------------------------------------------------
describe("personSchema", () => {
  it("is a static schema.org Person object", () => {
    expect(personSchema["@type"]).toBe("Person");
    expect(personSchema.name).toBe("Steve Ackley");
    expect(personSchema.url).toBe("https://steveackley.org");
    expect(personSchema.sameAs).toContain("https://github.com/stevenfackley");
  });
});

// ---------------------------------------------------------------------------
// resumePersonSchema
// ---------------------------------------------------------------------------
function makeResumeContent(overrides: Partial<ResumeContent> = {}): ResumeContent {
  return {
    summary: "Summary text",
    coreSkills: [],
    techTags: [],
    experience: [],
    certifications: [],
    education: [],
    ...overrides,
  };
}

describe("resumePersonSchema", () => {
  it("uses the current job (first experience entry) for jobTitle and worksFor", () => {
    const content = makeResumeContent({
      experience: [
        { company: "Lockheed Martin", location: "Shelton, CT", period: "2022-Present", role: "Staff Software Engineer", body: "", tags: [] },
      ],
    });
    const result = resumePersonSchema(content, "https://example.com/avatar.png");
    expect(result.jobTitle).toBe("Staff Software Engineer");
    expect(result.worksFor).toEqual({
      "@type": "Organization",
      name: "Lockheed Martin",
      address: { "@type": "PostalAddress", addressLocality: "Shelton, CT" },
    });
    expect(result.image).toBe("https://example.com/avatar.png");
  });

  it("falls back to a default jobTitle and no worksFor when there is no experience", () => {
    const content = makeResumeContent({ experience: [] });
    const result = resumePersonSchema(content, "https://example.com/avatar.png");
    expect(result.jobTitle).toBe("Staff Software Engineer");
    expect(result.worksFor).toBeUndefined();
  });

  it("includes a location address for education entries that have one", () => {
    const content = makeResumeContent({
      education: [{ degree: "B.S.", school: "CCSU", year: "2016", location: "New Britain, CT" }],
    });
    const result = resumePersonSchema(content, "avatar.png");
    expect(result.alumniOf).toEqual([
      {
        "@type": "EducationalOrganization",
        name: "CCSU",
        address: { "@type": "PostalAddress", addressLocality: "New Britain, CT" },
      },
    ]);
  });

  it("omits the address for education entries without a location", () => {
    const content = makeResumeContent({
      education: [{ degree: "A.S.", school: "NVCC", year: "2012" }],
    });
    const result = resumePersonSchema(content, "avatar.png");
    expect(result.alumniOf).toEqual([{ "@type": "EducationalOrganization", name: "NVCC" }]);
  });

  it("maps certifications to hasCredential entries", () => {
    const content = makeResumeContent({
      certifications: [{ name: "Arcitura SOA Architect", issuer: "Arcitura Education", color: "#000", bg: "#fff", icon: "x" }],
    });
    const result = resumePersonSchema(content, "avatar.png");
    expect(result.hasCredential).toEqual([
      {
        "@type": "EducationalOccupationalCredential",
        name: "Arcitura SOA Architect",
        recognizedBy: { "@type": "Organization", name: "Arcitura Education" },
      },
    ]);
  });

  it("truncates knowsAbout to at most 20 tech tags", () => {
    const techTags = Array.from({ length: 30 }, (_, i) => `tag-${i}`);
    const content = makeResumeContent({ techTags });
    const result = resumePersonSchema(content, "avatar.png");
    expect(result.knowsAbout).toHaveLength(20);
    expect(result.knowsAbout).toEqual(techTags.slice(0, 20));
  });
});

// ---------------------------------------------------------------------------
// breadcrumbSchema
// ---------------------------------------------------------------------------
describe("breadcrumbSchema", () => {
  it("builds a BreadcrumbList with 1-based positions", () => {
    const result = breadcrumbSchema([
      { name: "Home", url: "https://steveackley.org" },
      { name: "Blog", url: "https://steveackley.org/blog" },
    ]);
    expect(result["@type"]).toBe("BreadcrumbList");
    expect(result.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://steveackley.org" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://steveackley.org/blog" },
    ]);
  });

  it("returns an empty itemListElement for an empty input", () => {
    const result = breadcrumbSchema([]);
    expect(result.itemListElement).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// blogPostingSchema
// ---------------------------------------------------------------------------
describe("blogPostingSchema", () => {
  const createdAt = new Date("2026-01-15T12:00:00Z");
  const updatedAt = new Date("2026-02-01T08:30:00Z");

  it("uses the provided excerpt and coverImage when present", () => {
    const result = blogPostingSchema({
      title: "My Post",
      slug: "my-post",
      excerpt: "A short excerpt",
      coverImage: "https://cdn.example.com/cover.jpg",
      createdAt,
      updatedAt,
    });
    expect(result.headline).toBe("My Post");
    expect(result.description).toBe("A short excerpt");
    expect(result.image).toBe("https://cdn.example.com/cover.jpg");
    expect(result.url).toBe("https://steveackley.org/blog/my-post");
    expect(result.datePublished).toBe(createdAt.toISOString());
    expect(result.dateModified).toBe(updatedAt.toISOString());
  });

  it("falls back to the title and default avatar when excerpt/coverImage are missing", () => {
    const result = blogPostingSchema({
      title: "No Extras",
      slug: "no-extras",
      excerpt: null,
      coverImage: null,
      createdAt,
      updatedAt,
    });
    expect(result.description).toBe("No Extras");
    expect(result.image).toBe("https://steveackley.org/avatar.png");
  });
});
