/**
 * Integration tests for src/lib/content.ts
 *
 * `astro:content` is a virtual module supplied by the Astro build; it is
 * mocked here so these run without a real content-collections build.
 * getResumeContent groups entries from a Zod discriminatedUnion("type", ...)
 * schema, so fixtures cover every variant: summary, skill-category,
 * tech-stack, experience, certification, education.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mock state accessible inside vi.mock factory ─────────────────────
const h = vi.hoisted(() => ({
  getCollection: vi.fn(),
  getEntry: vi.fn(),
}));

vi.mock("astro:content", () => ({
  getCollection: h.getCollection,
  getEntry: h.getEntry,
}));

import { getHomeContent, getResumeContent, getFeaturedProjects } from "@/lib/content";

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getHomeContent
// ---------------------------------------------------------------------------
describe("getHomeContent", () => {
  it("returns the entry data for pages/home", async () => {
    const data = {
      title: "Home",
      description: "desc",
      heroName: "Steve",
      heroTitle: "Engineer",
      heroSummary: "summary",
      heroLocation: "Remote",
      availabilityLabel: "Open to work",
      aboutBio: "bio",
      interests: [],
      opportunities: [],
      contact: { email: "a@b.com", linkedin: "https://linkedin.com/in/a", github: "https://github.com/a" },
    };
    h.getEntry.mockResolvedValue({ id: "home", data });

    const result = await getHomeContent();

    expect(h.getEntry).toHaveBeenCalledWith("pages", "home");
    expect(result).toBe(data);
  });

  it("throws when the pages/home entry is missing", async () => {
    h.getEntry.mockResolvedValue(undefined);

    await expect(getHomeContent()).rejects.toThrow("Missing pages/home content entry");
  });
});

// ---------------------------------------------------------------------------
// getResumeContent
// ---------------------------------------------------------------------------
describe("getResumeContent", () => {
  const summaryEntry = {
    id: "summary",
    body: "  A seasoned engineer building reliable systems.  ",
    data: { type: "summary" as const, order: 1 },
  };

  const skillCategoryEntry = {
    id: "skills-frontend",
    body: "",
    data: {
      type: "skill-category" as const,
      order: 2,
      category: "Frontend",
      items: [
        { name: "React", pct: 90 },
        { name: "TypeScript", pct: 85 },
      ],
    },
  };

  const techStackEntry = {
    id: "tech-stack",
    body: "",
    data: {
      type: "tech-stack" as const,
      order: 3,
      items: ["Node.js", "PostgreSQL"],
    },
  };

  const experienceEntry = {
    id: "acme-corp",
    body: "  Built things that mattered.  ",
    data: {
      type: "experience" as const,
      order: 4,
      company: "Acme Corp",
      location: "Remote",
      period: "2020-2024",
      role: "Senior Engineer",
      tags: ["TypeScript", "AWS"],
    },
  };

  const certificationEntry = {
    id: "aws-cert",
    body: "",
    data: {
      type: "certification" as const,
      order: 5,
      role: "AWS Solutions Architect",
      issuer: "Amazon",
      color: "#fff",
      bg: "#000",
      icon: "aws-icon",
    },
  };

  const educationEntry = {
    id: "state-university",
    body: "",
    data: {
      type: "education" as const,
      order: 6,
      degree: "B.S. Computer Science",
      school: "State University",
      year: "2016",
      location: "Somewhere, USA",
      minor: "Mathematics",
    },
  };

  it("groups every entry type by its discriminated union `type`, ordered by `order`", async () => {
    // Deliberately out of `order` to exercise the sort.
    h.getCollection.mockResolvedValue([
      educationEntry,
      certificationEntry,
      experienceEntry,
      techStackEntry,
      skillCategoryEntry,
      summaryEntry,
    ]);

    const result = await getResumeContent();

    expect(h.getCollection).toHaveBeenCalledWith("resume");
    expect(result).toEqual({
      summary: "A seasoned engineer building reliable systems.",
      coreSkills: [
        { name: "React", pct: 90, category: "Frontend" },
        { name: "TypeScript", pct: 85, category: "Frontend" },
      ],
      techTags: ["Node.js", "PostgreSQL"],
      experience: [
        {
          company: "Acme Corp",
          location: "Remote",
          period: "2020-2024",
          role: "Senior Engineer",
          body: "Built things that mattered.",
          tags: ["TypeScript", "AWS"],
        },
      ],
      certifications: [
        {
          name: "AWS Solutions Architect",
          issuer: "Amazon",
          color: "#fff",
          bg: "#000",
          icon: "aws-icon",
        },
      ],
      education: [
        {
          degree: "B.S. Computer Science",
          school: "State University",
          year: "2016",
          location: "Somewhere, USA",
          minor: "Mathematics",
        },
      ],
    });
  });

  it("defaults summary to an empty string when body is undefined", async () => {
    h.getCollection.mockResolvedValue([{ id: "summary", data: { type: "summary" as const, order: 1 } }]);

    const result = await getResumeContent();

    expect(result.summary).toBe("");
  });

  it("returns empty arrays for types with no matching entries", async () => {
    h.getCollection.mockResolvedValue([summaryEntry]);

    const result = await getResumeContent();

    expect(result.coreSkills).toEqual([]);
    expect(result.techTags).toEqual([]);
    expect(result.experience).toEqual([]);
    expect(result.certifications).toEqual([]);
    expect(result.education).toEqual([]);
  });

  it("throws when no summary entry is present", async () => {
    h.getCollection.mockResolvedValue([skillCategoryEntry, techStackEntry]);

    await expect(getResumeContent()).rejects.toThrow("Missing resume summary content entry");
  });
});

// ---------------------------------------------------------------------------
// getFeaturedProjects
// ---------------------------------------------------------------------------
describe("getFeaturedProjects", () => {
  const projectA = {
    id: "project-a",
    data: {
      title: "Project A",
      summary: "Summary A",
      status: "active" as const,
      stack: ["TypeScript"],
      href: "https://a.dev",
      order: 2,
      featured: true,
    },
  };

  const projectB = {
    id: "project-b",
    data: {
      title: "Project B",
      summary: "Summary B",
      status: "coming-soon" as const,
      stack: ["Go"],
      order: 1,
      featured: true,
    },
  };

  const projectC = {
    id: "project-c",
    data: {
      title: "Project C",
      summary: "Summary C",
      status: "active" as const,
      stack: [],
      order: 5,
      featured: false,
    },
  };

  beforeEach(() => {
    // Mirror astro:content's real getCollection: it applies the caller's
    // filter predicate against the loaded entries.
    h.getCollection.mockImplementation(async (_name: string, filter?: (entry: any) => boolean) =>
      [projectA, projectB, projectC].filter((entry) => (filter ? filter(entry) : true)),
    );
  });

  it("returns only featured projects, sorted by order, mapped to the featured-project shape", async () => {
    const result = await getFeaturedProjects();

    expect(h.getCollection).toHaveBeenCalledWith("projects", expect.any(Function));
    expect(result).toEqual([
      {
        slug: "project-b",
        title: "Project B",
        summary: "Summary B",
        status: "coming-soon",
        stack: ["Go"],
        href: undefined,
        order: 1,
      },
      {
        slug: "project-a",
        title: "Project A",
        summary: "Summary A",
        status: "active",
        stack: ["TypeScript"],
        href: "https://a.dev",
        order: 2,
      },
    ]);
  });

  it("excludes non-featured projects", async () => {
    const result = await getFeaturedProjects();

    expect(result.find((p) => p.slug === "project-c")).toBeUndefined();
  });
});
