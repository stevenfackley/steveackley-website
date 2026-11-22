// @vitest-environment jsdom
/**
 * Unit tests for src/components/bento/HomeDashboard.tsx
 *
 * Rendered in jsdom. The island polls /api/github/repos and uses
 * IntersectionObserver + matchMedia, so those browser APIs are stubbed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import { HomeDashboard } from "@/components/bento/HomeDashboard";
import type { FeaturedProjectContent, HomeContent } from "@/content/types";
import type { EnrichedRepo } from "@/lib/github";

const homeContent: HomeContent = {
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

function project(overrides: Partial<FeaturedProjectContent>): FeaturedProjectContent {
  return {
    slug: "p",
    title: "Project",
    summary: "summary",
    status: "active",
    stack: [],
    href: "https://example.com",
    order: 0,
    ...overrides,
  };
}

beforeEach(() => {
  // Never resolves: the live-refresh effect just waits.
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("HomeDashboard featured projects", () => {
  it("labels each featured card by its status instead of always 'Live'", () => {
    render(
      <HomeDashboard
        blogPosts={[]}
        githubRepos={[]}
        homeContent={homeContent}
        featuredProjects={[
          project({ slug: "live-one", title: "LiveOne", status: "active", href: "https://live.example.com" }),
          project({ slug: "soon-one", title: "SoonOne", status: "coming-soon", href: "https://soon.example.com" }),
        ]}
      />,
    );

    const liveCard = screen.getByRole("link", { name: /LiveOne/ });
    const soonCard = screen.getByRole("link", { name: /SoonOne/ });

    expect(within(liveCard).getByText("Live", { exact: true })).toBeInTheDocument();
    expect(within(soonCard).queryByText("Live", { exact: true })).not.toBeInTheDocument();
    expect(within(soonCard).getByText("Coming soon", { exact: true })).toBeInTheDocument();
  });
});

function repo(overrides: Partial<EnrichedRepo>): EnrichedRepo {
  return {
    name: "repo",
    description: null,
    html_url: "https://github.com/stevenfackley/repo",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    pushed_at: "2025-01-01T00:00:00Z",
    language: "TypeScript",
    topics: [],
    fork: false,
    stargazers_count: 0,
    badges: [],
    tech: [],
    status: "active",
    ...overrides,
  };
}

function renderWithRepos(githubRepos: EnrichedRepo[]) {
  render(
    <HomeDashboard blogPosts={[]} githubRepos={githubRepos} homeContent={homeContent} featuredProjects={[]} />,
  );
}

const repoCard = (name: string) => screen.getByRole("heading", { name }).closest("a") as HTMLElement;

describe("HomeDashboard GitHub repos", () => {
  it("lists the repos it is given, most recent push first", () => {
    renderWithRepos([
      repo({ name: "older", pushed_at: "2025-01-01T00:00:00Z" }),
      repo({ name: "newest", pushed_at: "2025-03-01T00:00:00Z" }),
      repo({ name: "middle", pushed_at: "2025-02-01T00:00:00Z" }),
    ]);

    const names = Array.from(document.querySelectorAll("#projects h3")).map((h) => h.textContent);
    expect(names).toEqual(["newest", "middle", "older"]);
    expect(screen.getByText("3 repos, ordered by last commit")).toBeInTheDocument();
  });

  it("tags only repos GitHub marks private", () => {
    renderWithRepos([
      repo({ name: "secret", private: true }),
      repo({ name: "open", private: false }),
      repo({ name: "unset" }),
    ]);

    expect(within(repoCard("secret")).getByText("Private")).toBeInTheDocument();
    expect(within(repoCard("open")).queryByText("Private")).not.toBeInTheDocument();
    expect(within(repoCard("unset")).queryByText("Private")).not.toBeInTheDocument();
  });
});
