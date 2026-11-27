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
  /** GitHub "template repository" flag. Templates are scaffolding, not projects. */
  is_template?: boolean;
  /** Set by GitHub; true for the owner's private repos. Listed only with a fine-grained token. */
  private?: boolean;
}

export interface TechBadge {
  label: string;
  imageUrl: string;
  href: string;
}

// Repos to skip from the public listing: the site's own repo, the private P1
// repos (P1 is shown as a Featured card instead), and proofs of concept.
const SKIP_REPOS = new Set([
  "public",
  "public-website",
  "steveackley-website",
  "p1-opshub",
  "P1-OpsHub",
  "ios-embedded-krestel-poc",
]);

// Scaffolding and infrastructure are not projects. Matched three ways (GitHub's
// template flag, name, topic) so a new template or infra repo stays off the site
// without a code change.
const INFRA_REPOS = new Set(["gh-actions", "infra", "infrastructure", "_tooling", "dotfiles"]);
const NON_PROJECT_NAME = /template|(^|-)infra(structure)?($|-)/i;
const NON_PROJECT_TOPICS = new Set(["template", "repo-template", "infra", "infrastructure"]);

export function isNonProjectRepo(
  r: Pick<GitHubRepo, "name" | "topics"> & { is_template?: boolean },
): boolean {
  if (r.is_template) return true;
  if (INFRA_REPOS.has(r.name) || NON_PROJECT_NAME.test(r.name)) return true;
  return (r.topics ?? []).some((t) => NON_PROJECT_TOPICS.has(t.toLowerCase()));
}

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

/**
 * The GitHub token, read at run time. `import.meta.env.GH_API_TOKEN` is replaced
 * with a literal when the site is built, and the image build never has the
 * token, so a read through it is always empty in production: the token the
 * deploy provides was never used. A blank value counts as no token.
 * scripts/check-built-routes.mjs guards this read.
 */
function githubToken(): string | undefined {
  const value = process.env.GH_API_TOKEN?.trim();
  return value ? value : undefined;
}

/**
 * GET a GitHub API URL with the v3 Accept header (plus the token when one is
 * set) and an 8s abort. The abort timer stays armed until `read` settles, so a
 * body read inside `read` is covered by it.
 */
async function githubFetch<T>(url: string, read: (res: Response) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  /* c8 ignore next */
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };

    const token = githubToken();
    if (token) {
      headers["Authorization"] = `token ${token}`;
    }

    const res = await fetch(url, {
      signal: controller.signal,
      headers,
    });
    return await read(res);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJSON<T>(url: string): Promise<T | null> {
  let res: Response;
  try {
    res = await githubFetch(url, async (r) => r);
  } catch {
    return null;
  }
  if (!res.ok) return null;
  return res.json() as Promise<T>;
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

const PUBLIC_REPOS_URL =
  "https://api.github.com/users/stevenfackley/repos?sort=pushed&direction=desc&per_page=100";
const PRIVATE_REPOS_URL =
  "https://api.github.com/user/repos?visibility=private&affiliation=owner&sort=pushed&direction=desc&per_page=100";

/**
 * Whether this token may put private repositories on the public homepage.
 *
 * Only a fine-grained personal access token may (GitHub gives those the prefix
 * "github_pat_"): its owner chose, repository by repository, what it can read.
 * A classic token with the `repo` scope reads everything the account owns, so
 * with any other kind of token the site keeps to the public list. The token
 * still authenticates the calls, which raises the rate limit.
 */
export function listsPrivateRepos(token: string | undefined): boolean {
  return token !== undefined && token.startsWith("github_pat_");
}

let warnedAboutTokenKind = false;

export async function getPublicRepos(): Promise<GitHubRepo[]> {
  const token = githubToken();
  const includePrivate = listsPrivateRepos(token);
  if (token && !includePrivate && !warnedAboutTokenKind) {
    warnedAboutTokenKind = true;
    logger.warn("GH_API_TOKEN is not a fine-grained token, so private repositories are not listed");
  }

  const read = async (res: Response) => {
    // Throw (don't return []) so callers can tell a transient failure apart from a
    // genuinely empty list and avoid caching the failure over the last good data.
    if (!res.ok) throw new Error(`GitHub /repos request failed: ${res.status}`);
    return (await res.json()) as (GitHubRepo & { archived: boolean })[];
  };

  // The public list always comes from the public endpoint. Private repositories
  // come from a second call and are merged in: what a fine-grained token gets
  // from /user/repos is what it was given access to, which need not include
  // every public repository.
  const publicRepos = (await githubFetch(PUBLIC_REPOS_URL, read)).filter((r) => r.private !== true);
  const privateRepos = includePrivate
    ? (await githubFetch(PRIVATE_REPOS_URL, read)).filter((r) => r.private === true)
    : [];

  // Filter out forks, archived projects, explicitly skipped repos, and
  // templates / infrastructure (see isNonProjectRepo).
  const seen = new Set<string>();
  return [...publicRepos, ...privateRepos]
    .filter((r) => !r.fork && !r.archived && !SKIP_REPOS.has(r.name) && !isNonProjectRepo(r))
    .filter((r) => (seen.has(r.name) ? false : (seen.add(r.name), true)))
    .sort((a, b) => (Date.parse(b.pushed_at) || 0) - (Date.parse(a.pushed_at) || 0));
}

export type EnrichedRepo = GitHubRepo & {
  badges: TechBadge[];
  tech: string[]; // fallback label list when no badges found
  status: "active" | "coming-soon";
};

// Curated override takes priority while README hasn't been updated yet.
async function uncachedBadges(name: string): Promise<TechBadge[]> {
  return REPO_BADGE_OVERRIDES[name] ? REPO_BADGE_OVERRIDES[name] : detectBadgesFromReadme(name);
}

/**
 * Attach badges, tech tags and status to each repo. `getBadges` defaults to an
 * uncached lookup; getCachedRepos passes the 6h badge cache below.
 */
export async function enrichRepos(
  repos: GitHubRepo[],
  getBadges: (name: string) => Promise<TechBadge[]> = uncachedBadges,
): Promise<EnrichedRepo[]> {
  const badgeResults = await Promise.all(repos.map((r) => getBadges(r.name)));

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
      const enriched = await enrichRepos(repos, cachedBadges);
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
