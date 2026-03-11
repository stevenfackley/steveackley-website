import { e as createComponent, m as maybeRenderHead, g as addAttribute, p as renderSlot, r as renderTemplate, h as createAstro, k as renderComponent } from '../chunks/astro/server_dRnksWFu.mjs';
import 'piccolore';
import { $ as $$PublicLayout } from '../chunks/PublicLayout_CiHoD-lD.mjs';
import { c as cn, a as formatDateShort } from '../chunks/utils_B0Kx7Grw.mjs';
import 'clsx';
export { renderers } from '../renderers.mjs';

const $$Astro$7 = createAstro();
const $$Card = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$7, $$props, $$slots);
  Astro2.self = $$Card;
  const { href, external = false, class: className } = Astro2.props;
  const base = cn(
    "bg-[var(--surface)] border border-[var(--border)] rounded-2xl",
    "transition-all duration-200",
    href && "hover:border-[var(--border-hover)] hover:-translate-y-0.5 hover:shadow-sm cursor-pointer",
    className
  );
  return renderTemplate`${href && external ? renderTemplate`${maybeRenderHead()}<a${addAttribute(href, "href")} target="_blank" rel="noopener noreferrer"${addAttribute(base, "class")}>${renderSlot($$result, $$slots["default"])}</a>` : href ? renderTemplate`<a${addAttribute(href, "href")}${addAttribute(base, "class")}>${renderSlot($$result, $$slots["default"])}</a>` : renderTemplate`<div${addAttribute(base, "class")}>${renderSlot($$result, $$slots["default"])}</div>`}`;
}, "C:/Users/steve/projects/steveackleyorg/src/components/ui/Card.astro", void 0);

const $$Astro$6 = createAstro();
const $$HeroCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$6, $$props, $$slots);
  Astro2.self = $$HeroCard;
  const { class: className, avatarUrl = "https://avatars.githubusercontent.com/u/stevenfackley" } = Astro2.props;
  const heroTagline = "Building enterprise-grade software with the Microsoft stack. Staff Engineer at Lockheed Martin, 12+ years shipping production systems in C#, .NET, Azure, Angular, and SQL Server.";
  return renderTemplate`${renderComponent($$result, "Card", $$Card, { "class": cn("relative overflow-hidden min-h-[240px] p-0", className) }, { "default": ($$result2) => renderTemplate`  ${maybeRenderHead()}<div class="absolute inset-0 pointer-events-none" aria-hidden="true" style="background: linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(124,58,237,0.08) 60%, transparent 100%);"></div>  <div class="absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl opacity-20 pointer-events-none" style="background: radial-gradient(circle, #7c3aed, transparent);" aria-hidden="true"></div> <div class="relative z-10 flex flex-col justify-between h-full p-8 gap-6"> <!-- Top row - avatar + name --> <div class="flex items-start gap-5"> <!-- Avatar with gradient ring --> <div class="relative shrink-0"> <div class="absolute inset-0 rounded-full blur-sm opacity-60" style="background: linear-gradient(135deg, #2563eb, #7c3aed); transform: scale(1.12);" aria-hidden="true"></div> <img${addAttribute(avatarUrl, "src")} alt="Steve Ackley" width="72" height="72" class="relative rounded-full ring-2 ring-white/20 object-cover"> </div> <!-- Name + title --> <div class="pt-1 min-w-0"> <h1 class="text-2xl font-extrabold leading-tight tracking-tight gradient-text">
Steve Ackley
</h1> <p class="text-sm font-medium text-[var(--text-secondary)] mt-0.5">
Software Engineer &middot; .NET &middot; Azure &middot; Full-Stack
</p> </div> </div> <!-- Bio summary --> <p class="text-[var(--text-secondary)] text-sm leading-relaxed max-w-xl"> ${heroTagline} </p> <!-- Status row --> <div class="flex items-center gap-4 flex-wrap"> <span class="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--surface-hover)] border border-[var(--border)] rounded-full px-3 py-1.5"> <span class="h-2 w-2 rounded-full bg-emerald-500 pulse-dot shrink-0"></span>
Available for opportunities
</span> <span class="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--surface-hover)] border border-[var(--border)] rounded-full px-3 py-1.5">
📍 United States
</span> </div> </div> ` })}`;
}, "C:/Users/steve/projects/steveackleyorg/src/components/bento/HeroCard.astro", void 0);

const $$Astro$5 = createAstro();
const $$SkillsCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$5, $$props, $$slots);
  Astro2.self = $$SkillsCard;
  const { class: className } = Astro2.props;
  const skills = [
    { name: "C# / .NET", level: 5 },
    { name: "Azure Cloud", level: 5 },
    { name: "SQL Server", level: 5 },
    { name: "ASP.NET / Web API", level: 5 },
    { name: "Angular", level: 4 },
    { name: "Docker / DevOps", level: 4 }
  ];
  return renderTemplate`${renderComponent($$result, "Card", $$Card, { "class": cn("p-6", className) }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="flex items-center justify-between mb-3"> <span class="text-xs font-medium tracking-widest uppercase text-[var(--text-muted)]">Skills & Stack</span> </div> <ul class="space-y-3 mt-2"> ${skills.map((skill) => renderTemplate`<li> <div class="flex items-center justify-between mb-1"> <span class="text-sm text-[var(--text-secondary)]">${skill.name}</span> <div class="flex gap-0.5"> ${Array.from({ length: 5 }).map((_, i) => renderTemplate`<span class="h-1.5 w-4 rounded-full transition-colors"${addAttribute(i < skill.level ? "background: linear-gradient(90deg, #2563eb, #7c3aed)" : "background: var(--border)", "style")}></span>`)} </div> </div> </li>`)} </ul> ` })}`;
}, "C:/Users/steve/projects/steveackleyorg/src/components/bento/SkillsCard.astro", void 0);

const $$Astro$4 = createAstro();
const $$AboutCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$4, $$props, $$slots);
  Astro2.self = $$AboutCard;
  const { class: className } = Astro2.props;
  const bioText = "Staff Software Engineer at Lockheed Martin with 12+ years building enterprise software across defense, energy, and healthcare. Microsoft stack from day one. Passionate about clean architecture and systems built to last.";
  const interests = [
    { icon: "\u{1F527}", label: "Tinkering & Tech", mason: false },
    { icon: "\u{1F332}", label: "Camping & Hiking", mason: false },
    { icon: "\u{1F3AC}", label: "Movies", mason: false },
    { icon: "\u{1F47D}", label: "Aliens & The Unknown", mason: false },
    { icon: null, label: "Freemasonry", mason: true },
    { icon: "\u231A", label: "Fitness (WHOOP)", mason: false },
    { icon: "\u{1F697}", label: "Cars", mason: false },
    { icon: "\u2615", label: "Craft Coffee", mason: false },
    { icon: "\u{1F33F}", label: "Fragrances", mason: false }
  ];
  return renderTemplate`${renderComponent($$result, "Card", $$Card, { "class": cn("p-6", className) }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="flex items-center justify-between mb-3"> <span class="text-xs font-medium tracking-widest uppercase text-[var(--text-muted)]">About</span> </div> <p class="text-sm text-[var(--text-secondary)] leading-relaxed mb-4"> ${bioText} </p> <div class="grid grid-cols-2 gap-1.5"> ${interests.map((interest) => renderTemplate`<div class="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)]"> ${interest.mason ? renderTemplate`<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-[var(--accent)] shrink-0" aria-label="Masonic square and compasses"> <path d="M12 2 L3 18 M12 2 L21 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path> <circle cx="12" cy="2" r="1.5" fill="currentColor"></circle> <path d="M3 6 L12 22 L21 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path> <text x="12" y="12" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="bold" fill="currentColor" font-family="Georgia, serif">G</text> </svg>` : renderTemplate`<span>${interest.icon}</span>`} <span>${interest.label}</span> </div>`)} </div> ` })}`;
}, "C:/Users/steve/projects/steveackleyorg/src/components/bento/AboutCard.astro", void 0);

const $$Astro$3 = createAstro();
const $$Badge = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$Badge;
  const { variant = "default", class: className } = Astro2.props;
  const variantClasses = {
    default: "bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border)]",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
  };
  return renderTemplate`${maybeRenderHead()}<span${addAttribute(cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variantClasses[variant], className), "class")}> ${renderSlot($$result, $$slots["default"])} </span>`;
}, "C:/Users/steve/projects/steveackleyorg/src/components/ui/Badge.astro", void 0);

const SKIP_REPOS = /* @__PURE__ */ new Set(["public", "public-website"]);
const PRIVATE_PROJECTS = [
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
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/vnd.github.v3+json" },
      next: { revalidate: 3600 }
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
    const res = await fetch(
      "https://api.github.com/users/stevenfackley/repos?sort=updated&direction=desc&per_page=50",
      {
        signal: controller.signal,
        headers: { Accept: "application/vnd.github.v3+json" },
        next: { revalidate: 3600 }
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

const $$Astro$2 = createAstro();
const $$ProjectsCard = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$ProjectsCard;
  const { class: className } = Astro2.props;
  const FEATURED_NAMES = ["OmniSift", "axon-main", "TrustLog", "steveackley-website", "SortCompare"];
  let publicToShow = [];
  try {
    const rawRepos = await getPublicRepos();
    const enriched = await enrichRepos(rawRepos);
    const sorted = [...enriched].sort((a, b) => {
      const ai = FEATURED_NAMES.indexOf(a.name);
      const bi = FEATURED_NAMES.indexOf(b.name);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
    publicToShow = sorted.slice(0, 4);
  } catch {
  }
  return renderTemplate`${renderComponent($$result, "Card", $$Card, { "class": cn("p-6", className) }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="flex items-center justify-between mb-3"> <span class="text-xs font-medium tracking-widest uppercase text-[var(--text-muted)]">Projects & Portfolio</span> </div> <div class="space-y-1.5 mt-1"> <!-- P1 Ops Hub - private, always first --> ${PRIVATE_PROJECTS.map((p) => {
    const inner = renderTemplate`<div class="rounded-xl px-3 py-2.5 border border-transparent transition-all duration-150 hover:bg-[var(--surface-hover)] hover:border-[var(--border)] cursor-pointer"> <div class="flex items-center justify-between"> <div class="flex items-center gap-3 min-w-0"> <div class="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 text-white" style="background: linear-gradient(135deg, #2563eb, #7c3aed)">P</div> <div class="min-w-0"> <p class="text-sm font-medium text-[var(--text-primary)] truncate">${p.name}</p> <p class="text-xs text-[var(--text-muted)] truncate">Private repository</p> </div> </div> ${renderComponent($$result2, "Badge", $$Badge, { "variant": "success" }, { "default": async ($$result3) => renderTemplate`Active` })} </div> ${p.badges.length > 0 && renderTemplate`<div class="flex flex-wrap gap-1 mt-2 ml-10"> ${p.badges.map((b) => renderTemplate`<img${addAttribute(b.imageUrl, "src")}${addAttribute(b.label, "alt")} class="h-5">`)} </div>`} </div>`;
    return p.html_url && p.html_url !== "#" ? renderTemplate`<a${addAttribute(p.html_url, "href")} target="_blank" rel="noopener noreferrer">${inner}</a>` : inner;
  })} <!-- Public GitHub repos --> ${publicToShow.map((repo) => {
    const year = new Date(repo.created_at).getFullYear();
    return renderTemplate`<a${addAttribute(repo.html_url, "href")} target="_blank" rel="noopener noreferrer"> <div class="rounded-xl px-3 py-2.5 border border-transparent transition-all duration-150 hover:bg-[var(--surface-hover)] hover:border-[var(--border)] cursor-pointer"> <div class="flex items-center justify-between"> <div class="flex items-center gap-3 min-w-0"> <div class="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 bg-[var(--surface-hover)] text-[var(--text-secondary)]"> ${repo.name[0].toUpperCase()} </div> <div class="min-w-0"> <p class="text-sm font-medium text-[var(--text-primary)] truncate">${repo.name}</p> <p class="text-xs text-[var(--text-muted)] truncate"> ${repo.language ?? "Code"} &middot; ${year} </p> </div> </div> ${renderComponent($$result2, "Badge", $$Badge, { "variant": "info" }, { "default": async ($$result3) => renderTemplate`GitHub` })} </div> ${repo.badges.length > 0 && renderTemplate`<div class="flex flex-wrap gap-1 mt-2 ml-10"> ${repo.badges.map((b) => renderTemplate`<img${addAttribute(b.imageUrl, "src")}${addAttribute(b.label, "alt")} class="h-5">`)} </div>`} </div> </a>`;
  })} </div> ` })}`;
}, "C:/Users/steve/projects/steveackleyorg/src/components/bento/ProjectsCard.astro", void 0);

const $$Astro$1 = createAstro();
const $$BlogPreviewCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$BlogPreviewCard;
  const { class: className } = Astro2.props;
  const recentPosts = [
    { id: "1", title: "Building a Portfolio Site with Astro and React", slug: "building-portfolio-astro-react", createdAt: /* @__PURE__ */ new Date("2026-02-15") },
    { id: "2", title: "Why .NET is Still My Go-To Stack", slug: "why-dotnet-still-my-go-to", createdAt: /* @__PURE__ */ new Date("2026-01-28") },
    { id: "3", title: "Clean Architecture in Practice", slug: "clean-architecture-in-practice", createdAt: /* @__PURE__ */ new Date("2026-01-10") }
  ];
  return renderTemplate`${maybeRenderHead()}<div${addAttribute(cn("p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-2xl border border-purple-200 dark:border-purple-800", className), "class")}> <div class="flex items-center gap-2 mb-4"> <span class="text-2xl">✍️</span> <h2 class="text-xl font-semibold">Recent Posts</h2> </div> <ul class="space-y-3"> ${recentPosts.map((post) => renderTemplate`<li> <a${addAttribute(`/blog/${post.slug}`, "href")} class="block group hover:bg-white/50 dark:hover:bg-white/5 rounded-lg p-2 -m-2 transition-colors"> <h3 class="font-medium group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors line-clamp-1"> ${post.title} </h3> <p class="text-sm text-neutral-600 dark:text-neutral-400">${formatDateShort(post.createdAt)}</p> </a> </li>`)} </ul> <a href="/blog" class="text-sm text-purple-600 dark:text-purple-400 hover:underline mt-4 inline-block">
View all posts →
</a> </div>`;
}, "C:/Users/steve/projects/steveackleyorg/src/components/bento/BlogPreviewCard.astro", void 0);

const $$Astro = createAstro();
const $$CTACard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$CTACard;
  const { class: className } = Astro2.props;
  const linkedin = "https://www.linkedin.com/in/stevenackley";
  const email = "stevenfackley@gmail.com";
  return renderTemplate`${renderComponent($$result, "Card", $$Card, { "class": cn("p-6 flex flex-col justify-between", className) }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div> <div class="flex items-center justify-between mb-3"> <span class="text-xs font-medium tracking-widest uppercase text-[var(--text-muted)]">Let's Connect</span> </div> <p class="text-sm text-[var(--text-secondary)] mb-5">Open to new opportunities, collaborations, and interesting conversations.</p> </div> <div class="space-y-2"> <a${addAttribute(linkedin, "href")} target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 rounded-xl px-4 py-3 border text-sm font-medium transition-all duration-150 bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
LinkedIn ↗
</a> <a${addAttribute(`mailto:${email}`, "href")} class="flex items-center gap-3 rounded-xl px-4 py-3 border text-sm font-medium transition-all duration-150 bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]">
Send an Email
</a> <a href="/resume.pdf" download="Steve-Ackley-Resume.pdf" class="flex items-center gap-3 rounded-xl px-4 py-3 border text-sm font-medium transition-all duration-150 bg-[var(--accent)] border-[var(--accent)] text-white hover:bg-[var(--accent-hover)]">
↓ Download Resume
</a> </div> ` })}`;
}, "C:/Users/steve/projects/steveackleyorg/src/components/bento/CTACard.astro", void 0);

const $$BentoDashboard = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<div class="bg-mesh"> <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"> ${renderComponent($$result, "HeroCard", $$HeroCard, { "class": "lg:col-span-2" })} ${renderComponent($$result, "SkillsCard", $$SkillsCard, {})} ${renderComponent($$result, "AboutCard", $$AboutCard, {})} ${renderComponent($$result, "ProjectsCard", $$ProjectsCard, { "class": "lg:col-span-2" })} ${renderComponent($$result, "BlogPreviewCard", $$BlogPreviewCard, { "class": "lg:col-span-2" })} ${renderComponent($$result, "CTACard", $$CTACard, {})} </div> </div>`;
}, "C:/Users/steve/projects/steveackleyorg/src/components/bento/BentoDashboard.astro", void 0);

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "PublicLayout", $$PublicLayout, { "title": "Steve Ackley", "description": "Staff Software Engineer - .NET, Azure, Full-Stack" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8"> ${renderComponent($$result2, "BentoDashboard", $$BentoDashboard, {})} </div> ` })}`;
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
