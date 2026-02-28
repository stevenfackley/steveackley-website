"use client";

import { useState } from "react";
import Image from "next/image";
import { cn, formatDateShort } from "@/lib/utils";
import type { PostSummary } from "@/types";
import Link from "next/link";
import { PRIVATE_PROJECTS, type EnrichedRepo } from "@/lib/github";

const TABS = [
  { id: "overview",  label: "Overview"  },
  { id: "about",     label: "About"     },
  { id: "skills",    label: "Skills"    },
  { id: "projects",  label: "Projects"  },
  { id: "blog",      label: "Blog"      },
  { id: "connect",   label: "Connect"   },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface TabsDashboardProps {
  overview: React.ReactNode;
  blogPosts: Pick<PostSummary, "id" | "title" | "slug" | "excerpt" | "createdAt">[];
  githubRepos: EnrichedRepo[];
  avatarUrl: string;
  couplePhotoUrl: string;
}

export function TabsDashboard({ overview, blogPosts, githubRepos, avatarUrl, couplePhotoUrl }: TabsDashboardProps) {
  const [active, setActive] = useState<TabId>("overview");

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Tab bar */}
      <div className="mb-6 border-b border-[var(--border)]">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Dashboard sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={cn(
                "whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-150",
                active === tab.id
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-hover)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab panels */}
      {active === "overview"  && overview}
      {active === "about"     && <AboutPanel avatarUrl={avatarUrl} couplePhotoUrl={couplePhotoUrl} />}
      {active === "skills"    && <SkillsPanel />}
      {active === "projects"  && <ProjectsPanel repos={githubRepos} />}
      {active === "blog"      && <BlogPanel posts={blogPosts} />}
      {active === "connect"   && <ConnectPanel />}
    </div>
  );
}

// Masonic icon
function MasonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-label="Masonic square and compasses"
    >
      <path d="M12 2 L3 18 M12 2 L21 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="2" r="1.5" fill="currentColor" />
      <path d="M3 6 L12 22 L21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="12" textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="bold" fill="currentColor" fontFamily="Georgia, serif">G</text>
    </svg>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 md:p-8", className)}>
      <h2 className="text-xs font-medium tracking-widest uppercase text-[var(--text-muted)] mb-5">{title}</h2>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// About Panel
// ---------------------------------------------------------------------------

// Interests: tinkering/tech first, Freemasonry lower
const interests = [
  { icon: "🔧", label: "Tinkering & Tech",      detail: "Building and breaking things to figure out how they work." },
  { icon: "🌲", label: "Camping & Hiking",       detail: "Getting off the grid. Mountains, trails, and good company." },
  { icon: "🎬", label: "Movies",                 detail: "Sci-fi, action, and anything with a great story." },
  { icon: "👽", label: "Aliens & The Unknown",   detail: "There is more out there than most people are willing to admit." },
  { icon: null,  label: "Freemasonry",            detail: "Active Lodge member. Brotherhood, tradition, and service.", mason: true },
  { icon: "⌚",  label: "Fitness (WHOOP)",        detail: "Data-driven health and recovery tracking." },
  { icon: "🚗",  label: "Cars",                   detail: "Passion for performance and automotive design." },
  { icon: "☕",  label: "Craft Coffee",           detail: "Single-origin beans, espresso, and pour-overs." },
  { icon: "🌿",  label: "Fragrances",             detail: "Curating a personal collection of signature scents." },
];

// Career timeline uses real work history
const timeline = [
  {
    period: "Dec 2020 - Present",
    title: "Staff / Senior Software Engineer @ Lockheed Martin",
    body: "Spearheaded IETM development for the F-16 fighter aircraft (web-based) and HH-60W Combat Rescue Helicopter (desktop, disconnected). Led teams of up to 10 engineers and authored coding standards adopted by 30+ engineers.",
  },
  {
    period: "Jul - Dec 2020",
    title: "Software Architect @ Flexi Software",
    body: "Sole principal engineer on a cloud-hosted SaaS license authorization platform. Produced complete technical specs and coordinated a 15-engineer team across 3 locations and 2 countries.",
  },
  {
    period: "Sep 2016 - Jul 2020",
    title: "Sr. Specialist, SE & Integration @ Sila Solutions Group",
    body: "Embedded consulting engineer at Lockheed Martin / Sikorsky Aircraft on the HH-60W Combat Rescue Helicopter IETM. Introduced agile practices that drove a 15% throughput improvement.",
  },
  {
    period: "May 2014 - Sep 2016",
    title: ".NET Developer @ Emerson Process Management",
    body: "Owned the Catapult EAM platform for oil and gas reliability clients. Engineered a RESTful Web API layer deployed to every installation and architected a KPI analytics application.",
  },
  {
    period: "Jan 2013 - Jun 2014",
    title: "Programmer / Analyst @ SMC Partners",
    body: "Healthcare consulting. Replaced an end-of-life VB6 QA auditing system with a modern ASP.NET application at Connecticare. Rationalized SSRS reporting at Hometown Health, cutting the report estate by 40%.",
  },
  {
    period: "2012 - 2013",
    title: "Early Career",
    body: "Help desk and system analyst roles at Northeast Utilities and Housing System Solutions while completing a BS in Computer Science at Central Connecticut State University.",
  },
];

function AboutPanel({ avatarUrl, couplePhotoUrl }: { avatarUrl: string; couplePhotoUrl: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Bio */}
      <Section title="Bio" className="lg:col-span-2">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Photos */}
          <div className="flex flex-col sm:flex-row gap-4 shrink-0">
            {/* GitHub avatar */}
            <div className="relative shrink-0">
              <div
                className="absolute inset-0 rounded-full blur-sm opacity-50"
                style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)", transform: "scale(1.1)" }}
                aria-hidden
              />
              <Image
                src={avatarUrl}
                alt="Steve Ackley"
                width={96}
                height={96}
                className="relative rounded-full ring-2 ring-[var(--border)] object-cover"
              />
            </div>

            {/* Steve and Brooke photo */}
            <div className="relative shrink-0">
              {couplePhotoUrl ? (
                <Image
                  src={couplePhotoUrl}
                  alt="About photo"
                  width={160}
                  height={96}
                  className="rounded-2xl ring-2 ring-[var(--border)] object-cover"
                />
              ) : (
                <div className="w-40 h-24 rounded-2xl ring-2 ring-[var(--border)] bg-[var(--surface-hover)] flex flex-col items-center justify-center gap-1 text-[var(--text-muted)]">
                  <span className="text-2xl">📸</span>
                  <span className="text-xs text-center px-2">Steve &amp; Brooke</span>
                  <span className="text-[10px] text-center px-2 opacity-60">Photo coming soon</span>
                </div>
              )}
            </div>
          </div>

          {/* Text */}
          <div className="space-y-3">
            <p className="text-[var(--text-secondary)] leading-relaxed max-w-3xl">
              Staff Software Engineer at{" "}
              <span className="text-[var(--text-primary)] font-medium">Lockheed Martin</span> with{" "}
              <span className="text-[var(--text-primary)] font-medium">12+ years of experience</span>{" "}
              building enterprise-grade applications. The Microsoft stack has been home base from day one:
              C# / .NET back-ends, ASP.NET Core APIs, SQL Server, Azure, and WPF desktop applications.
              Most of my career has been in Angular and ASP.NET shops, which is where I sharpened my
              professional front-end skills. React and Next.js are newer territory, picked up on personal
              projects including this site.
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed max-w-3xl">
              The most important person in my life is{" "}
              <span className="text-[var(--text-primary)] font-medium">Brooke</span>. She is brilliant,
              kind, and genuinely one of the most beautiful people I have ever known, inside and out.
              She pushes me to be better, keeps me grounded, and makes every day worth showing up for.
              We spend our time hiking, catching movies, and generally finding ways to make the most of
              wherever life takes us.
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed max-w-3xl">
              Outside of the two of us, I am probably tinkering with something, going down a rabbit hole
              about aliens, at a Lodge meeting, or hunting the perfect espresso pull.
            </p>
          </div>
        </div>
      </Section>

      {/* Career Timeline */}
      <Section title="Career Timeline">
        <ol className="relative border-l border-[var(--border)] space-y-6 pl-5">
          {timeline.map((item) => (
            <li key={item.period} className="relative">
              <span
                className="absolute -left-[1.65rem] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-[var(--surface)]"
                style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <p className="text-xs font-semibold text-[var(--accent)] mb-0.5 uppercase tracking-wide">{item.period}</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5 leading-relaxed">{item.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Interests */}
      <Section title="Interests & Hobbies">
        <div className="space-y-3">
          {interests.map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-xl p-3 bg-[var(--surface-hover)]">
              {item.mason ? (
                <MasonIcon className="text-[var(--accent)] mt-0.5" />
              ) : (
                <span className="text-xl leading-none pt-0.5">{item.icon}</span>
              )}
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Certifications teaser */}
        <div className="mt-5 pt-5 border-t border-[var(--border)]">
          <p className="text-xs font-medium tracking-widest uppercase text-[var(--text-muted)] mb-3">Certifications</p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}>
              🏗 Arcitura Certified SOA Architect
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white"
              style={{ background: "linear-gradient(135deg, #0078d4, #005a9e)" }}>
              🪟 Microsoft Technology Associate
            </span>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skills Panel
// ---------------------------------------------------------------------------

const skillCategories = [
  {
    label: "Microsoft Backend",
    icon: "🪟",
    highlight: true,
    skills: [
      { name: "C# / .NET 10",            level: 5, note: "12+ years across ASP.NET Core, Web API, console, and worker services." },
      { name: "ASP.NET Core / Web API",   level: 5, note: "REST APIs, OData, SignalR, middleware pipelines." },
      { name: "SQL Server",               level: 5, note: "Complex T-SQL, stored procedures, schema design, performance tuning." },
      { name: "SSIS",                     level: 4, note: "ETL pipeline design and execution for data warehouse workloads." },
      { name: "SSAS",                     level: 4, note: "OLAP cube design and MDX queries for BI and analytics platforms." },
      { name: "WPF / XAML",              level: 4, note: "Rich desktop application development on the Windows stack." },
      { name: "ML.NET",                   level: 3, note: "Machine learning pipelines within the .NET ecosystem." },
      { name: "Entity Framework Core",    level: 5, note: "Code-first migrations, complex LINQ, query optimization." },
    ],
  },
  {
    label: "Microsoft Cloud & DevOps",
    icon: "☁️",
    highlight: true,
    skills: [
      { name: "Azure Cloud",              level: 5, note: "App Service, Functions, Service Bus, Key Vault, AKS, Storage." },
      { name: "Azure DevOps",             level: 5, note: "Pipelines, Boards, Repos, Artifacts. Full lifecycle management." },
      { name: "Docker / Containers",      level: 4, note: "Multi-stage builds, Compose, container registries." },
      { name: "Kubernetes (AKS)",         level: 3, note: "Deployment management, Helm charts, monitoring." },
      { name: "Jenkins",                  level: 4, note: "Pipeline configuration, build automation, plugin management." },
      { name: "GitLab CI/CD",            level: 4, note: "Pipelines, runners, environment deployments." },
    ],
  },
  {
    label: "Frontend",
    icon: "🖥️",
    skills: [
      { name: "Angular",                  level: 5, note: "Primary professional frontend framework across multiple enterprise roles." },
      { name: "TypeScript",               level: 5, note: "Strict typing, generics, utility types across Angular and React." },
      { name: "React / Next.js",          level: 4, note: "App Router, RSC, hooks. Newest addition. Used on this site." },
      { name: "CSS / SCSS",               level: 4, note: "Component styles, BEM, responsive layouts, animations." },
      { name: "Bootstrap",                level: 4, note: "Grid system, component library, responsive utilities." },
      { name: "Tailwind CSS",             level: 3, note: "Newer skill. Utility-first styling picked up on personal projects." },
    ],
  },
  {
    label: "Data & BI",
    icon: "📊",
    skills: [
      { name: "SQL / PostgreSQL",         level: 5, note: "Complex queries, schema design, performance tuning across databases." },
      { name: "Tableau",                  level: 4, note: "Dashboard design, calculated fields, data source management." },
      { name: "Data Warehousing",         level: 4, note: "Dimensional modeling, star/snowflake schemas, ETL design." },
      { name: "SSRS",                     level: 4, note: "Paginated reports, subscriptions, parameterized reporting." },
    ],
  },
  {
    label: "Architecture & Leadership",
    icon: "🏗️",
    skills: [
      { name: "Clean Architecture",       level: 5, note: "Domain-driven design, SOLID principles, dependency inversion." },
      { name: "SOA / Microservices",      level: 5, note: "Service composition, contracts, and governance. Arcitura certified." },
      { name: "Technical Leadership",     level: 5, note: "Architecture reviews, mentoring, RFC processes, team direction." },
      { name: "Automated Testing",        level: 4, note: "Unit, integration, and E2E: xUnit, NUnit, Playwright, Jasmine." },
    ],
  },
];

const certifications = [
  {
    name: "Arcitura Certified SOA Architect",
    issuer: "Arcitura Education",
    icon: "🏗",
    color: "#2563eb",
  },
  {
    name: "Microsoft Technology Associate",
    issuer: "Microsoft (MCPS - Software Development)",
    icon: "🪟",
    color: "#0078d4",
  },
];

function SkillBar({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5 shrink-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="h-1.5 w-5 rounded-full transition-colors"
          style={
            i < level
              ? { background: "linear-gradient(90deg, #2563eb, #7c3aed)" }
              : { background: "var(--border)" }
          }
        />
      ))}
    </div>
  );
}

function SkillsPanel() {
  return (
    <div className="space-y-5">
      {/* Certifications */}
      <Section title="Certifications">
        <div className="grid gap-3 sm:grid-cols-2">
          {certifications.map((cert) => (
            <div
              key={cert.name}
              className="flex items-center gap-4 rounded-xl p-4 border border-[var(--border)] bg-[var(--surface-hover)]"
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: `${cert.color}20`, border: `1px solid ${cert.color}40` }}
              >
                {cert.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{cert.name}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{cert.issuer}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Skill categories */}
      <div className="grid gap-5 lg:grid-cols-2">
        {skillCategories.map((cat) => (
          <Section
            key={cat.label}
            title={`${cat.icon}  ${cat.label}`}
            className={cat.highlight ? "border-[var(--accent)]/30" : ""}
          >
            {cat.highlight && (
              <p className="text-xs text-[var(--accent)] mb-3 -mt-2 font-medium">Core expertise</p>
            )}
            <ul className="space-y-4">
              {cat.skills.map((skill) => (
                <li key={skill.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{skill.name}</span>
                    <SkillBar level={skill.level} />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">{skill.note}</p>
                </li>
              ))}
            </ul>
          </Section>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Projects Panel
// ---------------------------------------------------------------------------

const FEATURED_ORDER = ["OmniSift", "axon-main", "TrustLog", "steveackley-website", "SortCompare", "DesignPatterns"];
const SKIP_REPOS = new Set(["public", "public-website"]);

function ProjectsPanel({ repos }: { repos: EnrichedRepo[] }) {
  const filtered = repos.filter((r) => !SKIP_REPOS.has(r.name));
  const sorted = [...filtered].sort((a, b) => {
    const ai = FEATURED_ORDER.indexOf(a.name);
    const bi = FEATURED_ORDER.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {sorted.length + PRIVATE_PROJECTS.length} project{sorted.length + PRIVATE_PROJECTS.length !== 1 ? "s" : ""}
        </p>
        <a
          href="https://github.com/stevenfackley"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--accent)] hover:underline underline-offset-2"
        >
          View GitHub profile
        </a>
      </div>

      {/* P1 Ops Hub - private, always first */}
      {PRIVATE_PROJECTS.map((p) => (
        <div key={p.name} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 card-glow">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 text-white"
                style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
              >
                P
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{p.name}</h3>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]">
                    Private
                  </span>
                </div>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">Operational management platform for P1 workflows</p>
              </div>
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              Active
            </span>
          </div>
          <p className="mt-4 text-sm text-[var(--text-secondary)] leading-relaxed">{p.description}</p>
          {p.badges.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {p.badges.map((b) => (
                <a key={b.imageUrl} href={b.href} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt={b.label} className="h-5" />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Public GitHub repos */}
      {sorted.map((repo) => {
        const year = new Date(repo.created_at).getFullYear();
        return (
          <a key={repo.name} href={repo.html_url} target="_blank" rel="noopener noreferrer" className="block group">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 card-glow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
                    {repo.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {repo.name}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mt-0.5">
                      {repo.language ?? "Code"} &middot; {year}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-[var(--surface-hover)] text-[var(--text-muted)] shrink-0">
                  GitHub
                </span>
              </div>
              {repo.description && (
                <p className="mt-4 text-sm text-[var(--text-secondary)] leading-relaxed">{repo.description}</p>
              )}
              {repo.badges.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1">
                  {repo.badges.map((b) =>
                    b.href ? (
                      <a key={b.imageUrl} href={b.href} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.imageUrl} alt={b.label} className="h-5" />
                      </a>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={b.imageUrl} src={b.imageUrl} alt={b.label} className="h-5" />
                    )
                  )}
                </div>
              ) : repo.tech.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {repo.tech.map((t) => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-md bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-secondary)]">
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
              <span className="mt-3 inline-block text-xs text-[var(--accent)]">View on GitHub</span>
            </div>
          </a>
        );
      })}

      {sorted.length === 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">Unable to load GitHub repos. Check back soon.</p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blog Panel
// ---------------------------------------------------------------------------

function BlogPanel({ posts }: { posts: TabsDashboardProps["blogPosts"] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {posts.length === 0 ? "No posts yet." : `${posts.length} published post${posts.length !== 1 ? "s" : ""}`}
        </p>
        <Link href="/blog" className="text-sm text-[var(--accent)] hover:underline underline-offset-2">
          View all posts
        </Link>
      </div>

      {posts.length === 0 ? (
        <Section title="Blog">
          <p className="text-sm text-[var(--text-muted)]">No posts yet. Check back soon!</p>
        </Section>
      ) : (
        posts.map((post) => (
          <Link key={post.id} href={`/blog/${post.slug}`} className="block group">
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 card-glow">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                  {post.title}
                </h3>
                <span className="text-xs text-[var(--text-muted)] shrink-0 mt-0.5">
                  {formatDateShort(post.createdAt)}
                </span>
              </div>
              {post.excerpt && (
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                  {post.excerpt}
                </p>
              )}
              <span className="mt-3 inline-block text-xs text-[var(--accent)]">Read more</span>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connect Panel
// ---------------------------------------------------------------------------

function ConnectPanel() {
  const linkedin = process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "https://www.linkedin.com/in/stevenackley";
  const email    = process.env.NEXT_PUBLIC_EMAIL ?? "stevenfackley@gmail.com";

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section title="Open To" className="lg:col-span-2">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: "💼", title: "Contract & Freelance",  body: "Short or long-term engagements on challenging .NET / Azure projects alongside my day job." },
            { icon: "🚀", title: "Side Projects",         body: "Open to interesting technical problems and collaborations outside of Lockheed work." },
            { icon: "🤝", title: "Consulting",            body: "Architecture reviews, technical design, and advisory work in the Microsoft stack." },
          ].map((item) => (
            <div key={item.title} className="rounded-xl bg-[var(--surface-hover)] p-4">
              <p className="text-lg mb-1">{item.icon}</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Get In Touch">
        <div className="space-y-3">
          <a
            href={linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-xl px-4 py-3.5 border border-[var(--border)] bg-[var(--surface-hover)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-150 text-[var(--text-secondary)] text-sm font-medium"
          >
            <span className="text-lg font-bold">in</span>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">LinkedIn</p>
              <p className="text-xs text-[var(--text-muted)]">Connect and follow my work</p>
            </div>
            <span className="ml-auto">&#8599;</span>
          </a>

          <a
            href={`mailto:${email}`}
            className="flex items-center gap-4 rounded-xl px-4 py-3.5 border border-[var(--border)] bg-[var(--surface-hover)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-150 text-[var(--text-secondary)] text-sm font-medium"
          >
            <span className="text-lg">✉️</span>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Email</p>
              <p className="text-xs text-[var(--text-muted)]">{email}</p>
            </div>
          </a>

          <a
            href="https://github.com/stevenfackley"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-xl px-4 py-3.5 border border-[var(--border)] bg-[var(--surface-hover)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-150 text-[var(--text-secondary)] text-sm font-medium"
          >
            <span className="text-lg">&#9661;</span>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">GitHub</p>
              <p className="text-xs text-[var(--text-muted)]">stevenfackley</p>
            </div>
            <span className="ml-auto">&#8599;</span>
          </a>
        </div>
      </Section>

      <Section title="Resume">
        <p className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">
          Full work history, certifications, and references available on request.
          View the interactive version or save a PDF copy.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/resume"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-white text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
          >
            View Interactive Resume
          </Link>
        </div>
      </Section>
    </div>
  );
}
