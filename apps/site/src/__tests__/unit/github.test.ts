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
  listsPrivateRepos,
  enrichRepos,
  isNonProjectRepo,
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

  it("filters out repos in the SKIP_REPOS set (public, public-website, the site itself, P1, POCs)", async () => {
    mockRepoFetch([
      makeRepo({ name: "public" }),
      makeRepo({ name: "public-website" }),
      makeRepo({ name: "steveackley-website" }),
      makeRepo({ name: "p1-opshub" }),
      makeRepo({ name: "P1-OpsHub" }),
      makeRepo({ name: "ios-embedded-krestel-poc" }),
      makeRepo({ name: "axon-main" }),
    ]);
    const repos = await getPublicRepos();
    const names = repos.map((r) => r.name);
    expect(names).toEqual(["axon-main"]);
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

  it("filters GitHub template repos (is_template) and repos named *template*", async () => {
    mockRepoFetch([
      makeRepo({ name: "repo-template-nextjs15", is_template: true }),
      makeRepo({ name: "astro-template", is_template: false }),
      makeRepo({ name: "undertow-engine" }),
    ]);
    const names = (await getPublicRepos()).map((r) => r.name);
    expect(names).toEqual(["undertow-engine"]);
  });

  it("filters infrastructure repos by name and by topic", async () => {
    mockRepoFetch([
      makeRepo({ name: "gh-actions", topics: [] }),
      makeRepo({ name: "infra", topics: [] }),
      makeRepo({ name: "homelab-infra", topics: [] }),
      makeRepo({ name: "dotfiles", topics: [] }),
      makeRepo({ name: "cluster-ops", topics: ["infrastructure"] }),
      makeRepo({ name: "OmniSift", topics: [] }),
    ]);
    const names = (await getPublicRepos()).map((r) => r.name);
    expect(names).toEqual(["OmniSift"]);
  });
});

describe("isNonProjectRepo", () => {
  it("flags templates and infrastructure, leaves products alone", () => {
    expect(isNonProjectRepo({ name: "repo-template-python-fastapi", topics: [], is_template: true })).toBe(true);
    expect(isNonProjectRepo({ name: "my-template", topics: [] })).toBe(true);
    expect(isNonProjectRepo({ name: "gh-actions", topics: [] })).toBe(true);
    expect(isNonProjectRepo({ name: "k8s-infrastructure", topics: [] })).toBe(true);
    expect(isNonProjectRepo({ name: "anything", topics: ["Template"] })).toBe(true);
    expect(isNonProjectRepo({ name: "Qavren-Swarm", topics: ["mcp", "docker"] })).toBe(false);
    expect(isNonProjectRepo({ name: "infrared-sensor", topics: [] })).toBe(false);
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

  it("enriches repos the same way enrichRepos does (badges, fallback tech, overrides)", async () => {
    const readmeContent = Buffer.from(
      "[![Astro](https://img.shields.io/badge/Astro-7-orange)](https://astro.build/)",
    ).toString("base64");
    const list = [
      makeRepo({ name: "with-badges" }),
      makeRepo({ name: "no-readme", language: "csharp", topics: ["dotnet"] }),
      makeRepo({ name: "axon-main" }),
    ];
    const respond = (url: unknown) => {
      const s = String(url);
      if (s.includes("/users/stevenfackley/repos")) {
        return Promise.resolve(new Response(JSON.stringify(list), { status: 200 }));
      }
      if (s.endsWith("/with-badges/readme")) {
        return Promise.resolve(new Response(JSON.stringify({ content: readmeContent }), { status: 200 }));
      }
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    };

    vi.resetModules();
    const mod = await import("@/lib/github");
    vi.spyOn(global, "fetch").mockImplementation(respond);

    const { repos } = await mod.getCachedRepos();
    const direct = await mod.enrichRepos(list);

    expect(repos).toEqual(direct);
    expect(repos.map((r) => r.tech)).toEqual([
      ["Astro"],
      ["C#", "dotnet"],
      direct[2].badges.map((b) => b.label),
    ]);
    expect(repos.every((r) => r.status === "active")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GitHub request shape: headers, token and timeout signal on every call
// ---------------------------------------------------------------------------
describe("GitHub requests", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function headersOf(init: RequestInit | undefined): Record<string, string> {
    return (init?.headers ?? {}) as Record<string, string>;
  }

  it("sends only the v3 Accept header and uses the public list URL without a token", async () => {
    vi.stubEnv("GH_API_TOKEN", "");
    const fetchSpy = mockRepoFetch([makeRepo({ name: "a" })]);

    const repos = await getPublicRepos();
    await enrichRepos(repos);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    const [listUrl, listInit] = fetchSpy.mock.calls[0];
    const [readmeUrl, readmeInit] = fetchSpy.mock.calls[1];
    expect(String(listUrl)).toBe(
      "https://api.github.com/users/stevenfackley/repos?sort=pushed&direction=desc&per_page=100",
    );
    expect(String(readmeUrl)).toBe("https://api.github.com/repos/stevenfackley/a/readme");
    for (const init of [listInit, readmeInit]) {
      expect(headersOf(init)).toEqual({ Accept: "application/vnd.github.v3+json" });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("treats a blank token as no token", async () => {
    vi.stubEnv("GH_API_TOKEN", "   ");
    const fetchSpy = mockRepoFetch([makeRepo({ name: "a" })]);

    await getPublicRepos();

    const [listUrl, listInit] = fetchSpy.mock.calls[0];
    expect(String(listUrl)).toBe(
      "https://api.github.com/users/stevenfackley/repos?sort=pushed&direction=desc&per_page=100",
    );
    expect(headersOf(listInit)).toEqual({ Accept: "application/vnd.github.v3+json" });
  });

  it("reads the token when it is called, not when the module loads", async () => {
    // The deploy provides the token only at run time; a value captured at
    // build or import time would never see it.
    vi.stubEnv("GH_API_TOKEN", "");
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify([makeRepo({ name: "a" })]), { status: 200 })),
    );

    await getPublicRepos();
    vi.stubEnv("GH_API_TOKEN", "  later  ");
    await getPublicRepos();

    expect(headersOf(fetchSpy.mock.calls[0][1])).toEqual({ Accept: "application/vnd.github.v3+json" });
    expect(String(fetchSpy.mock.calls[1][0])).toContain("/users/stevenfackley/repos");
    expect(headersOf(fetchSpy.mock.calls[1][1])).toEqual({
      Accept: "application/vnd.github.v3+json",
      Authorization: "token later",
    });
  });

  it("with a token that is not fine-grained, sends it but lists public repos only", async () => {
    // A classic token with the repo scope reads every private repo the account
    // owns. It must never put them on the public homepage.
    vi.stubEnv("GH_API_TOKEN", "ghp_placeholder");
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation((url) => {
      const s = String(url);
      if (s.includes("/users/stevenfackley/repos")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([makeRepo({ name: "a" }), makeRepo({ name: "leaked", private: true })]),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    });

    const repos = await getPublicRepos();
    await enrichRepos(repos);

    expect(repos.map((r) => r.name)).toEqual(["a"]);
    const listCalls = fetchSpy.mock.calls.filter(([url]) => String(url).includes("/repos?"));
    expect(listCalls.map(([url]) => String(url))).toEqual([
      "https://api.github.com/users/stevenfackley/repos?sort=pushed&direction=desc&per_page=100",
    ]);
    for (const [, init] of fetchSpy.mock.calls) {
      expect(headersOf(init)).toEqual({
        Accept: "application/vnd.github.v3+json",
        Authorization: "token ghp_placeholder",
      });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("with a fine-grained token, adds the private repos it can read to the public list", async () => {
    vi.stubEnv("GH_API_TOKEN", "github_pat_placeholder");
    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation((url) => {
      const s = String(url);
      if (s.includes("/users/stevenfackley/repos")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              makeRepo({ name: "pub-old", pushed_at: "2024-01-01T00:00:00Z" }),
              makeRepo({ name: "pub-new", pushed_at: "2024-09-01T00:00:00Z" }),
            ]),
            { status: 200 },
          ),
        );
      }
      if (s.includes("/user/repos")) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              makeRepo({ name: "secret-mid", private: true, pushed_at: "2024-05-01T00:00:00Z" }),
              // The private call may also return a public repo: it is already listed.
              makeRepo({ name: "pub-new", pushed_at: "2024-09-01T00:00:00Z" }),
              makeRepo({ name: "secret-fork", private: true, fork: true }),
            ]),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response("Not Found", { status: 404 }));
    });

    const repos = await getPublicRepos();

    // Newest push first, across both lists; forks dropped; nothing twice.
    expect(repos.map((r) => r.name)).toEqual(["pub-new", "secret-mid", "pub-old"]);
    expect(repos.find((r) => r.name === "secret-mid")?.private).toBe(true);
    expect(fetchSpy.mock.calls.map(([url]) => String(url))).toEqual([
      "https://api.github.com/users/stevenfackley/repos?sort=pushed&direction=desc&per_page=100",
      "https://api.github.com/user/repos?visibility=private&affiliation=owner&sort=pushed&direction=desc&per_page=100",
    ]);
    for (const [, init] of fetchSpy.mock.calls) {
      expect(headersOf(init)).toEqual({
        Accept: "application/vnd.github.v3+json",
        Authorization: "token github_pat_placeholder",
      });
    }
  });

  it("fails as a whole when the private list fails, so callers keep the last good list", async () => {
    vi.stubEnv("GH_API_TOKEN", "github_pat_placeholder");
    vi.spyOn(global, "fetch").mockImplementation((url) => {
      const s = String(url);
      if (s.includes("/users/stevenfackley/repos")) {
        return Promise.resolve(new Response(JSON.stringify([makeRepo({ name: "a" })]), { status: 200 }));
      }
      return Promise.resolve(new Response("Forbidden", { status: 403 }));
    });

    await expect(getPublicRepos()).rejects.toThrow("GitHub /repos request failed: 403");
  });
});

describe("listsPrivateRepos", () => {
  it("is true only for a fine-grained personal access token", () => {
    expect(listsPrivateRepos("github_pat_11ABC")).toBe(true);
    for (const other of ["ghp_classic", "gho_oauth", "ghs_app", "placeholder", "", undefined]) {
      expect(listsPrivateRepos(other)).toBe(false);
    }
  });
});


