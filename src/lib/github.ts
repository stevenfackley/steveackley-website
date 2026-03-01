export interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
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
const SKIP_REPOS = new Set(["public", "public-website"]);

// Manually defined private repo (P1 Ops Hub)
export const PRIVATE_PROJECTS = [
  {
    name: "P1 Ops Hub",
    description:
      "Operational management platform for P1 workflows. Enterprise platform centralising processes, reporting, and automation.",
    html_url: process.env.NEXT_PUBLIC_P1_OPS_HUB_URL ?? "#",
    created_at: "2024-01-01T00:00:00Z",
    language: "Python",
    topics: ["django", "python", "postgresql", "docker"],
    isPrivate: true,
    badges: [
      {
        label: "Django",
        imageUrl: "https://img.shields.io/badge/Django-4.2-092E20?logo=django",
        href: "https://www.djangoproject.com/",
      },
      {
        label: "Python",
        imageUrl: "https://img.shields.io/badge/Python-3.11-3776AB?logo=python",
        href: "https://www.python.org/",
      },
      {
        label: "PostgreSQL",
        imageUrl: "https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql",
        href: "https://www.postgresql.org/",
      },
      {
        label: "Docker",
        imageUrl: "https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker",
        href: "https://www.docker.com/",
      },
    ] as TechBadge[],
    status: "active" as const,
  },
];

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
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.github.v3+json" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
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
  try {
    const res = await fetch(
      "https://api.github.com/users/stevenfackley/repos?sort=updated&direction=desc&per_page=50",
      {
        headers: { Accept: "application/vnd.github.v3+json" },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return [];
    const repos: GitHubRepo[] = await res.json();
    return repos.filter((r) => !r.fork && !SKIP_REPOS.has(r.name));
  } catch {
    return [];
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
