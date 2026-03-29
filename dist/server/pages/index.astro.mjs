import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, m as maybeRenderHead } from '../chunks/astro/server_brmzxYiS.mjs';
import 'piccolore';
import { $ as $$PublicLayout } from '../chunks/PublicLayout_CqgctOFt.mjs';
import { d as db, p as posts } from '../chunks/index_BYBdbJMu.mjs';
import { eq, desc } from 'drizzle-orm';
export { renderers } from '../renderers.mjs';

const $$Astro = createAstro();
const $$BentoDashboard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$BentoDashboard;
  const { blogPosts, githubRepos, avatarUrl, couplePhotoUrl } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "TabsDashboard", null, { "client:only": "react", "blogPosts": blogPosts, "githubRepos": githubRepos, "avatarUrl": avatarUrl, "couplePhotoUrl": couplePhotoUrl, "client:component-hydration": "only", "client:component-path": "C:/Users/steve/projects/steveackleyorg/src/components/bento/TabsDashboard", "client:component-export": "TabsDashboard" })}`;
}, "C:/Users/steve/projects/steveackleyorg/src/components/bento/BentoDashboard.astro", void 0);

const SKIP_REPOS = /* @__PURE__ */ new Set(["public", "public-website"]);
[
  {
    name: "P1 Ops Hub",
    description: "Operational management platform for P1 workflows. Enterprise platform centralising processes, reporting, and automation.",
    html_url: process.env.NEXT_PUBLIC_P1_OPS_HUB_URL ?? "#",
    created_at: "2024-01-01T00:00:00Z",
    language: "Python",
    topics: ["django", "python", "postgresql", "docker"],
    isPrivate: true,
    badges: [
      {
        label: "Django",
        imageUrl: "https://img.shields.io/badge/Django-4.2-092E20?logo=django",
        href: "https://www.djangoproject.com/"
      },
      {
        label: "Python",
        imageUrl: "https://img.shields.io/badge/Python-3.11-3776AB?logo=python",
        href: "https://www.python.org/"
      },
      {
        label: "PostgreSQL",
        imageUrl: "https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql",
        href: "https://www.postgresql.org/"
      },
      {
        label: "Docker",
        imageUrl: "https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker",
        href: "https://www.docker.com/"
      }
    ],
    status: "active"
  }
];
const REPO_BADGE_OVERRIDES = {
  "axon-main": [
    { label: ".NET 10", imageUrl: "https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet", href: "https://dotnet.microsoft.com/" },
    { label: "Avalonia UI", imageUrl: "https://img.shields.io/badge/Avalonia_UI-11.x-8B5CF6?logo=xaml", href: "https://avaloniaui.net/" },
    { label: "ML.NET", imageUrl: "https://img.shields.io/badge/ML.NET-3.x-512BD4?logo=dotnet", href: "https://dotnet.microsoft.com/apps/machinelearning-ai/ml-dotnet" },
    { label: "SQLite", imageUrl: "https://img.shields.io/badge/SQLite-Encrypted-003B57?logo=sqlite", href: "https://www.sqlite.org/" }
  ],
  "OmniSift": [
    { label: ".NET 10", imageUrl: "https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet", href: "https://dotnet.microsoft.com/" },
    { label: "Blazor WASM", imageUrl: "https://img.shields.io/badge/Blazor-WASM-512BD4?logo=blazor", href: "https://dotnet.microsoft.com/apps/aspnet/web-apps/blazor" },
    { label: "PostgreSQL", imageUrl: "https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql", href: "https://www.postgresql.org/" },
    { label: "Semantic Kernel", imageUrl: "https://img.shields.io/badge/Semantic_Kernel-AI-ffb900?logo=microsoft", href: "https://github.com/microsoft/semantic-kernel" }
  ]
};
async function fetchJSON(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8e3);
  try {
    const headers = {
      Accept: "application/vnd.github.v3+json"
    };
    if (process.env.GH_API_TOKEN) {
      headers["Authorization"] = `token ${process.env.GH_API_TOKEN}`;
    }
    const res = await fetch(url, {
      signal: controller.signal,
      headers
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
async function detectBadgesFromReadme(repoName) {
  const file = await fetchJSON(
    `https://api.github.com/repos/stevenfackley/${repoName}/readme`
  );
  if (!file?.content) return [];
  let md;
  try {
    md = Buffer.from(file.content, "base64").toString("utf-8");
  } catch {
    return [];
  }
  const regex = /\[!\[([^\]]*)\]\((https:\/\/img\.shields\.io\/badge\/[^)]+)\)\]\(([^)]*)\)/g;
  const badges = [];
  let match;
  while ((match = regex.exec(md)) !== null) {
    badges.push({ label: match[1], imageUrl: match[2], href: match[3] });
  }
  return badges;
}
function inferTech(repo) {
  const tags = [];
  if (repo.language) tags.push(repo.language);
  if (repo.topics.length > 0) tags.push(...repo.topics.slice(0, 3));
  return tags.map(
    (t) => t === "csharp" ? "C#" : t === "typescript" ? "TypeScript" : t === "javascript" ? "JavaScript" : t === "svelte" ? "Svelte" : t === "python" ? "Python" : t === "java" ? "Java" : t
  ).filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
}
async function getPublicRepos() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8e3);
  try {
    const headers = {
      Accept: "application/vnd.github.v3+json"
    };
    if (process.env.GH_API_TOKEN) {
      headers["Authorization"] = `token ${process.env.GH_API_TOKEN}`;
    }
    const res = await fetch(
      "https://api.github.com/users/stevenfackley/repos?sort=updated&direction=desc&per_page=50",
      {
        signal: controller.signal,
        headers
      }
    );
    if (!res.ok) return [];
    const repos = await res.json();
    return repos.filter((r) => !r.fork && !SKIP_REPOS.has(r.name));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
async function enrichRepos(repos) {
  const badgeResults = await Promise.all(
    repos.map(
      (r) => (
        // Curated override takes priority while README hasn't been updated yet
        REPO_BADGE_OVERRIDES[r.name] ? Promise.resolve(REPO_BADGE_OVERRIDES[r.name]) : detectBadgesFromReadme(r.name)
      )
    )
  );
  return repos.map((r, i) => ({
    ...r,
    badges: badgeResults[i],
    // Derive plain text tags from badge labels; fall back to language/topics
    tech: badgeResults[i].length > 0 ? badgeResults[i].map((b) => b.label) : inferTech(r),
    status: "active"
  }));
}

const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const blogPosts = await db.select().from(posts).where(eq(posts.published, true)).orderBy(desc(posts.createdAt)).limit(3);
  let githubRepos = [];
  try {
    const rawRepos = await getPublicRepos();
    githubRepos = await enrichRepos(rawRepos);
  } catch (e) {
    console.error("Failed to fetch GitHub repos:", e);
  }
  const avatarUrl = "https://github.com/stevenfackley.png";
  const couplePhotoUrl = "";
  return renderTemplate`${renderComponent($$result, "PublicLayout", $$PublicLayout, { "title": "Steve Ackley", "description": "Staff Software Engineer - .NET, Azure, Full-Stack" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="py-8"> ${renderComponent($$result2, "BentoDashboard", $$BentoDashboard, { "blogPosts": blogPosts, "githubRepos": githubRepos, "avatarUrl": avatarUrl, "couplePhotoUrl": couplePhotoUrl })} </div> ` })}`;
}, "C:/Users/steve/projects/steveackleyorg/src/pages/index.astro", void 0);

const $$file = "C:/Users/steve/projects/steveackleyorg/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
