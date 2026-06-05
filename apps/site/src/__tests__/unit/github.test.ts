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
    pushed_at: "2024-06-01T00:00:00Z",
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

  it("throws on a non-ok status so callers can serve the last good cache", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Server Error", { status: 500 })
    );
    await expect(getPublicRepos()).rejects.toThrow();
  });

  it("propagates network errors instead of swallowing them as empty", async () => {
    vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network error"));
    await expect(getPublicRepos()).rejects.toThrow();
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
// getCachedRepos — resilience (no cache poisoning) + badge caching
// Module state (caches) is reset per test via vi.resetModules() + dynamic import.
// ---------------------------------------------------------------------------
describe("getCachedRepos", () => {
  it("keeps serving the last good repos when a later refresh fails", async () => {
    vi.resetModules();
    const mod = await import("@/lib/github");

    let clock = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => clock);

    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation((url) => {
      const s = String(url);
      if (s.includes("/users/stevenfackley/repos")) {
        return Promise.resolve(
          new Response(JSON.stringify([makeRepo({ name: "a" }), makeRepo({ name: "b" })]), { status: 200 })
        );
      }
      return Promise.resolve(new Response("Not Found", { status: 404 })); // READMEs
    });

    const first = await mod.getCachedRepos();
    expect(first.repos.map((r) => r.name)).toEqual(["a", "b"]);

    // Next refresh window: GitHub is rate-limited. Pre-fix, this empty/failed
    // result poisoned the cache and blanked the section.
    fetchSpy.mockImplementation(() =>
      Promise.resolve(new Response("rate limited", { status: 403 }))
    );
    clock += 31_000; // past the 30s repo TTL → forces a refetch

    const second = await mod.getCachedRepos();
    expect(second.repos.map((r) => r.name)).toEqual(["a", "b"]);
  });

  it("does not re-fetch READMEs on a refresh within the badge TTL", async () => {
    vi.resetModules();
    const mod = await import("@/lib/github");

    let clock = 2_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => clock);

    let readmeCalls = 0;
    vi.spyOn(global, "fetch").mockImplementation((url) => {
      const s = String(url);
      if (s.includes("/users/stevenfackley/repos")) {
        return Promise.resolve(
          new Response(JSON.stringify([makeRepo({ name: "a" })]), { status: 200 })
        );
      }
      if (s.includes("/readme")) {
        readmeCalls++;
        return Promise.resolve(new Response("Not Found", { status: 404 }));
      }
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    });

    await mod.getCachedRepos();
    expect(readmeCalls).toBe(1);

    clock += 31_000; // past repo TTL (refetch list) but within badge TTL
    await mod.getCachedRepos();
    expect(readmeCalls).toBe(1); // badges reused — no second README burst
  });
});

