/**
 * Unit tests for src/lib/github.ts
 *
 * global.fetch is mocked so no real HTTP calls happen.
 * Tests cover getPublicRepos, enrichRepos, badge override logic, and inferTech.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

import {
  getPublicRepos,
  enrichRepos,
  PRIVATE_PROJECTS,
  type GitHubRepo,
} from "@/lib/github";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    name: "my-repo",
    description: "A test repo",
    html_url: "https://github.com/stevenfackley/my-repo",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
    language: "TypeScript",
    topics: ["nextjs", "react"],
    fork: false,
    stargazers_count: 42,
    ...overrides,
  };
}

/** Spy that returns repos for the list endpoint and 404 for everything else */
function mockRepoFetch(repos: GitHubRepo[], status = 200) {
  return vi.spyOn(global, "fetch").mockImplementation((url) => {
    const s = String(url);
    if (s.includes("/users/stevenfackley/repos")) {
      return Promise.resolve(
        new Response(JSON.stringify(repos), { status })
      );
    }
    // README / other requests → 404
    return Promise.resolve(new Response("Not Found", { status: 404 }));
  });
}

// ---------------------------------------------------------------------------
// getPublicRepos
// ---------------------------------------------------------------------------
describe("getPublicRepos", () => {
  it("returns non-fork repos from the GitHub API", async () => {
    mockRepoFetch([
      makeRepo({ name: "project-a", fork: false }),
      makeRepo({ name: "forked-project", fork: true }),
    ]);
    const repos = await getPublicRepos();
    expect(repos).toHaveLength(1);
    expect(repos[0].name).toBe("project-a");
  });

  it("filters out repos in the SKIP_REPOS set (public, public-website)", async () => {
    mockRepoFetch([
      makeRepo({ name: "public" }),
      makeRepo({ name: "public-website" }),
      makeRepo({ name: "axon-main" }),
    ]);
    const repos = await getPublicRepos();
    const names = repos.map((r) => r.name);
    expect(names).not.toContain("public");
    expect(names).not.toContain("public-website");
    expect(names).toContain("axon-main");
  });

  it("returns an empty array when the API responds with a non-ok status", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Server Error", { status: 500 })
    );
    const repos = await getPublicRepos();
    expect(repos).toEqual([]);
  });

  it("returns an empty array when fetch throws a network error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));
    const repos = await getPublicRepos();
    expect(repos).toEqual([]);
  });

  it("returns all non-fork, non-skipped repos", async () => {
    mockRepoFetch([
      makeRepo({ name: "project-a", fork: false }),
      makeRepo({ name: "project-b", fork: false }),
    ]);
    const repos = await getPublicRepos();
    expect(repos).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// enrichRepos — badge detection from README
// ---------------------------------------------------------------------------
describe("enrichRepos", () => {
  it("parses shields.io badges from a repo README", async () => {
    const readmeContent = Buffer.from(`
# My Repo
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
    `).toString("base64");

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ content: readmeContent }), { status: 200 })
    );

    const repos = [makeRepo()];
    const enriched = await enrichRepos(repos);

    expect(enriched[0].badges).toHaveLength(2);
    expect(enriched[0].badges[0].label).toBe("Next.js");
    expect(enriched[0].badges[0].imageUrl).toContain("img.shields.io");
    expect(enriched[0].tech).toEqual(["Next.js", "TypeScript"]);
    expect(enriched[0].status).toBe("active");
  });

  it("falls back to inferTech (language + topics) when README has no badges", async () => {
    // README exists but has no badge markdown
    const readmeContent = Buffer.from("# Simple Readme\nNo badges here.").toString("base64");

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ content: readmeContent }), { status: 200 })
    );

    const repos = [makeRepo({ language: "TypeScript", topics: ["react", "nextjs"] })];
    const enriched = await enrichRepos(repos);

    expect(enriched[0].badges).toHaveLength(0);
    expect(enriched[0].tech).toContain("TypeScript");
    expect(enriched[0].tech).toContain("react");
  });

  it("falls back to inferTech when the README API returns 404", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );

    const repos = [makeRepo({ language: "Python", topics: ["flask"] })];
    const enriched = await enrichRepos(repos);

    expect(enriched[0].badges).toHaveLength(0);
    expect(enriched[0].tech).toContain("Python");
  });

  it("falls back to inferTech when the README fetch throws", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));

    const repos = [makeRepo({ language: "Java", topics: [] })];
    const enriched = await enrichRepos(repos);

    expect(enriched[0].badges).toHaveLength(0);
    expect(enriched[0].tech).toContain("Java");
  });

  it("returns empty tech array when inferTech has no language or topics", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );

    const repos = [makeRepo({ language: null, topics: [] })];
    const enriched = await enrichRepos(repos);

    expect(enriched[0].badges).toHaveLength(0);
    expect(enriched[0].tech).toEqual([]);
  });

  it("deduplicates tech tags (language + topics overlap)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );
    // language = "TypeScript", topics = ["typescript", "react"]
    const repos = [makeRepo({ language: "typescript", topics: ["typescript", "react"] })];
    const enriched = await enrichRepos(repos);
    const count = enriched[0].tech.filter((t) => t.toLowerCase() === "typescript").length;
    expect(count).toBe(1);
  });

  it("limits tech tags to 4 entries maximum via inferTech", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );
    const repos = [
      makeRepo({
        language: "TypeScript",
        topics: ["nextjs", "react", "tailwind", "prisma", "postgres"],
      }),
    ];
    const enriched = await enrichRepos(repos);
    // inferTech: 1 language + up to 3 topics, deduplicated = max 4
    expect(enriched[0].tech.length).toBeLessThanOrEqual(4);
  });

  it("marks all enriched repos with status 'active'", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("Not Found", { status: 404 })
    );
    const repos = [makeRepo(), makeRepo({ name: "second-repo" })];
    const enriched = await enrichRepos(repos);
    expect(enriched.every((r) => r.status === "active")).toBe(true);
  });

  // ── inferTech language aliases ─────────────────────────────────────────
  it("maps 'csharp' language alias to 'C#'", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );
    const repos = [makeRepo({ language: "csharp", topics: [] })];
    const enriched = await enrichRepos(repos);
    expect(enriched[0].tech).toContain("C#");
  });

  it("maps 'typescript' language alias to 'TypeScript'", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );
    const repos = [makeRepo({ language: "typescript", topics: [] })];
    const enriched = await enrichRepos(repos);
    expect(enriched[0].tech).toContain("TypeScript");
  });

  it("maps 'javascript' language alias to 'JavaScript'", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );
    const repos = [makeRepo({ language: "javascript", topics: [] })];
    const enriched = await enrichRepos(repos);
    expect(enriched[0].tech).toContain("JavaScript");
  });

  it("maps 'svelte' language alias to 'Svelte'", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );
    const repos = [makeRepo({ language: "svelte", topics: [] })];
    const enriched = await enrichRepos(repos);
    expect(enriched[0].tech).toContain("Svelte");
  });

  it("maps 'python' language alias to 'Python'", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );
    const repos = [makeRepo({ language: "python", topics: [] })];
    const enriched = await enrichRepos(repos);
    expect(enriched[0].tech).toContain("Python");
  });

  it("maps 'java' language alias to 'Java'", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );
    const repos = [makeRepo({ language: "java", topics: [] })];
    const enriched = await enrichRepos(repos);
    expect(enriched[0].tech).toContain("Java");
  });
});

// ---------------------------------------------------------------------------
// REPO_BADGE_OVERRIDES — curated repos skip README fetch
// ---------------------------------------------------------------------------
describe("REPO_BADGE_OVERRIDES", () => {
  it("uses the curated override for 'axon-main' without fetching README", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    const repos = [makeRepo({ name: "axon-main" })];
    const enriched = await enrichRepos(repos);

    // No fetch calls for overridden repos
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(enriched[0].badges.length).toBeGreaterThan(0);
    expect(enriched[0].badges[0].label).toBe(".NET 10");
  });

  it("uses the curated override for 'OmniSift' without fetching README", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

    const repos = [makeRepo({ name: "OmniSift" })];
    const enriched = await enrichRepos(repos);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(enriched[0].badges.length).toBeGreaterThan(0);
  });

  it("populates tech from badge labels for overridden repos", async () => {
    vi.spyOn(global, "fetch"); // not expected to be called

    const repos = [makeRepo({ name: "axon-main" })];
    const enriched = await enrichRepos(repos);

    // tech should come from badge labels
    expect(enriched[0].tech).toEqual(enriched[0].badges.map((b) => b.label));
  });
});

// ---------------------------------------------------------------------------
// PRIVATE_PROJECTS constant
// ---------------------------------------------------------------------------
describe("PRIVATE_PROJECTS", () => {
  it("has at least one entry", () => {
    expect(PRIVATE_PROJECTS.length).toBeGreaterThan(0);
  });

  it("all private projects have required fields", () => {
    for (const p of PRIVATE_PROJECTS) {
      expect(p.name).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.isPrivate).toBe(true);
      expect(p.status).toBe("active");
      expect(Array.isArray(p.badges)).toBe(true);
    }
  });

  it("uses NEXT_PUBLIC_P1_OPS_HUB_URL env or falls back to '#'", () => {
    const p1 = PRIVATE_PROJECTS[0];
    // If env is not set, html_url should default to "#"
    if (!process.env.NEXT_PUBLIC_P1_OPS_HUB_URL) {
      expect(p1.html_url).toBe("#");
    } else {
      expect(p1.html_url).toBe(process.env.NEXT_PUBLIC_P1_OPS_HUB_URL);
    }
  });
});
