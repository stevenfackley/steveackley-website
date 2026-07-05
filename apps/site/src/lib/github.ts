import { logger } from "@/lib/logger";

export interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  language: string | null;
  topics: string[];
  fork: boolean;
  stargazers_count: number;
}

export interface TechBadge {
  label: string;
  imageUrl: string;
  href: string;
}

// Repos to skip from the public listing
const SKIP_REPOS = new Set(["public", "public-website", "p1-opshub", "P1-OpsHub"]);

// Badge overrides — bridge until each repo's README is updated with shields.io badges.
// Once a repo's README has them, remove its entry here and they'll be parsed automatically.
const REPO_BADGE_OVERRIDES: Record<string, TechBadge[]> = {
  "axon-main": [
    { label: ".NET 10",    imageUrl: "https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet",        href: "https://dotnet.microsoft.com/" },
    { label: "Avalonia UI",imageUrl: "https://img.shields.io/badge/Avalonia_UI-11.x-8B5CF6?logo=xaml",   href: "https://avaloniaui.net/" },
    { label: "ML.NET",     imageUrl: "https://img.shields.io/badge/ML.NET-3.x-512BD4?logo=dotnet",       href: "https://dotnet.microsoft.com/apps/machinelearning-ai/ml-dotnet" },
    { label: "SQLite",     imageUrl: "https://img.shields.io/badge/SQLite-Encrypted-003B57?logo=sqlite",  href: "https://www.sqlite.org/" },
  ],
  "OmniSift": [
    { label: ".NET 10",         imageUrl: "https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet",              href: "https://dotnet.microsoft.com/" },
    { label: "Blazor WASM",     imageUrl: "https://img.shields.io/badge/Blazor-WASM-512BD4?logo=blazor",            href: "https://dotnet.microsoft.com/apps/aspnet/web-apps/blazor" },
    { label: "PostgreSQL",      imageUrl: "https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql",      href: "https://www.postgresql.org/" },
    { label: "Semantic Kernel", imageUrl: "https://img.shields.io/badge/Semantic_Kernel-AI-ffb900?logo=microsoft",  href: "https://github.com/microsoft/semantic-kernel" },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface GitHubFileContent {
  content: string; // base64-encoded
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  /* c8 ignore next */
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };

    if (import.meta.env.GH_API_TOKEN) {
      headers["Authorization"] = `token ${import.meta.env.GH_API_TOKEN}`;
    }

    const res = await fetch(url, {
      signal: controller.signal,
      headers,
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// Primary: parse shields.io badges from README
//
// Convention: put shields.io badge markdown anywhere in your README, e.g.:
//   [![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
//
// The website reads those badges and renders them as-is — correct colors,
// correct icons, zero manual config.
// ---------------------------------------------------------------------------

async function detectBadgesFromReadme(repoName: string): Promise<TechBadge[]> {
  const file = await fetchJSON<GitHubFileContent>(
    `https://api.github.com/repos/stevenfackley/${repoName}/readme`
  );
  if (!file?.content) return [];

  let md: string;
  /* c8 ignore next 5 */
  try {
    md = Buffer.from(file.content, "base64").toString("utf-8");
  } catch {
    // Buffer.from(..., "base64").toString() never throws in practice;
    // this catch is purely defensive for unforeseen runtime environments.
    return [];
  }

  // Match [![AltText](https://img.shields.io/badge/...)](href)
  const regex =
    /\[!\[([^\]]*)\]\((https:\/\/img\.shields\.io\/badge\/[^)]+)\)\]\(([^)]*)\)/g;

  const badges: TechBadge[] = [];
  let match: RegExpExecArray | null;
  /* c8 ignore next */
  while ((match = regex.exec(md)) !== null) {
    badges.push({ label: match[1], imageUrl: match[2], href: match[3] });
  }

  return badges;
}

// ---------------------------------------------------------------------------
// Fallback: infer from GitHub's language + topics fields
// ---------------------------------------------------------------------------

function inferTech(repo: GitHubRepo): string[] {
  const tags: string[] = [];
  if (repo.language) tags.push(repo.language);
  if (repo.topics.length > 0) tags.push(...repo.topics.slice(0, 3));
  return tags
    .map((t) =>
      t === "csharp" ? "C#"
      : t === "typescript" ? "TypeScript"
      : t === "javascript" ? "JavaScript"
      : t === "svelte" ? "Svelte"
      : t === "python" ? "Python"
      : t === "java" ? "Java"
      : t
    )
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 4);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getPublicRepos(): Promise<GitHubRepo[]> {
  const controller = new AbortController();
  /* c8 ignore next */
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };

    const hasToken = !!import.meta.env.GH_API_TOKEN;
    if (hasToken) {
      headers["Authorization"] = `token ${import.meta.env.GH_API_TOKEN}`;
    }

    // If we have a token, use /user/repos to get both public and private repos we own.
    // Otherwise, use /users/stevenfackley/repos for public only.
    const url = hasToken
      ? "https://api.github.com/user/repos?type=owner&sort=pushed&direction=desc&per_page=100"
      : "https://api.github.com/users/stevenfackley/repos?sort=pushed&direction=desc&per_page=100";

    const res = await fetch(url, {
      signal: controller.signal,
      headers,
    });
    // Throw (don't return []) so callers can tell a transient failure apart from a
    // genuinely empty list and avoid caching the failure over the last good data.
    if (!res.ok) throw new Error(`GitHub /repos request failed: ${res.status}`);
    const repos: (GitHubRepo & { archived: boolean })[] = await res.json();

    // Filter out forks, archived projects, and explicitly skipped repos.
    return repos.filter((r) => !r.fork && !r.archived && !SKIP_REPOS.has(r.name));
  } finally {
    clearTimeout(timeout);
  }
}

export type EnrichedRepo = GitHubRepo & {
  badges: TechBadge[];
  tech: string[]; // fallback label list when no badges found
  status: "active" | "coming-soon";
};

export async function enrichRepos(repos: GitHubRepo[]): Promise<EnrichedRepo[]> {
  const badgeResults = await Promise.all(
    repos.map((r) =>
      // Curated override takes priority while README hasn't been updated yet
      REPO_BADGE_OVERRIDES[r.name]
        ? Promise.resolve(REPO_BADGE_OVERRIDES[r.name])
        : detectBadgesFromReadme(r.name)
    )
  );

  return repos.map((r, i) => ({
    ...r,
    badges: badgeResults[i],
    // Derive plain text tags from badge labels; fall back to language/topics
    tech:
      badgeResults[i].length > 0
        ? badgeResults[i].map((b) => b.label)
        : inferTech(r),
    status: "active" as const,
  }));
}

// ---------------------------------------------------------------------------
// Per-repo badge cache. READMEs / shields.io badges change rarely, so cache them
// for hours. This stops the 30s repo-list refresh from firing one README request
// per repo every cycle — that concurrent burst was tripping GitHub's secondary
// rate limit, which made the whole repo fetch fail and blanked the section.
// ---------------------------------------------------------------------------

const BADGE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

const badgeCache = new Map<string, { badges: TechBadge[]; fetchedAt: number }>();

async function cachedBadges(name: string): Promise<TechBadge[]> {
  if (REPO_BADGE_OVERRIDES[name]) return REPO_BADGE_OVERRIDES[name];
  const hit = badgeCache.get(name);
  if (hit && Date.now() - hit.fetchedAt <= BADGE_CACHE_TTL_MS) return hit.badges;
  const badges = await detectBadgesFromReadme(name);
  badgeCache.set(name, { badges, fetchedAt: Date.now() });
  return badges;
}

async function enrichReposCached(repos: GitHubRepo[]): Promise<EnrichedRepo[]> {
  const badgeResults = await Promise.all(repos.map((r) => cachedBadges(r.name)));
  return repos.map((r, i) => ({
    ...r,
    badges: badgeResults[i],
    tech: badgeResults[i].length > 0 ? badgeResults[i].map((b) => b.label) : inferTech(r),
    status: "active" as const,
  }));
}

// ---------------------------------------------------------------------------
// Shared cache: SSR pages AND the /api/github/repos endpoint both call this so
// they never burn duplicate GitHub round-trips. 30s TTL + in-flight de-dupe.
//
// On a failed refresh we keep serving the last good data instead of caching the
// failure — one transient GitHub error must NOT blank the repo section for 30s.
// ---------------------------------------------------------------------------

const REPO_CACHE_TTL_MS = 30_000;

let repoCache: { data: EnrichedRepo[]; fetchedAt: number } | null = null;
let repoInflight: Promise<EnrichedRepo[]> | null = null;

export async function getCachedRepos(): Promise<{ repos: EnrichedRepo[]; fetchedAt: number }> {
  if (repoCache && Date.now() - repoCache.fetchedAt <= REPO_CACHE_TTL_MS) {
    return { repos: repoCache.data, fetchedAt: repoCache.fetchedAt };
  }
  if (!repoInflight) {
    repoInflight = (async () => {
      const repos = await getPublicRepos();
      const enriched = await enrichReposCached(repos);
      repoCache = { data: enriched, fetchedAt: Date.now() };
      return enriched;
    })();
    // Reset the in-flight slot once settled. The .catch on the derived promise
    // stops a rejected refresh from surfacing as an unhandled rejection — the
    // real error is handled by the awaiting caller below, which serves stale.
    void repoInflight
      .finally(() => {
        repoInflight = null;
      })
      .catch(() => {});
  }
  try {
    const data = await repoInflight;
    return { repos: data, fetchedAt: repoCache?.fetchedAt ?? Date.now() };
  } catch (e) {
    logger.error(
      "getCachedRepos: GitHub fetch failed; serving last good cache.",
      e instanceof Error ? e : new Error(String(e)),
    );
    if (repoCache) return { repos: repoCache.data, fetchedAt: repoCache.fetchedAt };
    return { repos: [], fetchedAt: Date.now() };
  }
}
