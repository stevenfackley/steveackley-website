/**
 * Integration tests for src/pages/api/github/repos.ts
 *
 * @/lib/github is mocked so no real GitHub API calls occur.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetCachedRepos } = vi.hoisted(() => ({
  mockGetCachedRepos: vi.fn(),
}));

vi.mock("@/lib/github", () => ({
  getCachedRepos: mockGetCachedRepos,
}));

import { GET } from "@/pages/api/github/repos";

describe("GET /api/github/repos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with the cached repos as JSON", async () => {
    const repos = [{ name: "project-a" }, { name: "project-b" }];
    mockGetCachedRepos.mockResolvedValue({ repos, fetchedAt: 1_700_000_000_000 });

    const res = await GET({} as any);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    const body = await res.json();
    expect(body.repos).toEqual(repos);
    expect(body.fetchedAt).toBe(new Date(1_700_000_000_000).toISOString());
  });

  it("sets Cache-Control: no-store so clients always revalidate", async () => {
    mockGetCachedRepos.mockResolvedValue({ repos: [], fetchedAt: Date.now() });
    const res = await GET({} as any);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
