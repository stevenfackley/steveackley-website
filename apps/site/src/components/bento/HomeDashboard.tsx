"use client";

import { useEffect, useRef, useState } from "react";
import { cn, formatDateShort } from "@/lib/utils";
import type { PostSummary } from "@/types";
import type { EnrichedRepo } from "@/lib/github";
import type { FeaturedProjectContent, HomeContent } from "@/content/types";

// Compact relative-time formatter ("just now", "12s ago", "3m ago", "2d ago").
// `now` is passed in so the same tick drives every render — no per-component timers.
function relTime(iso: string | undefined, now: number): string {
  if (!iso) return "";
  const diff = Math.max(0, now - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
}

function LiveIndicator({ lastSync, now }: { lastSync: number | null; now: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      </span>
      Live · refreshed {lastSync ? relTime(new Date(lastSync).toISOString(), now) : "just now"}
    </span>
  );
}

const SECTIONS = [
  { id: "about",    label: "About"    },
  { id: "skills",   label: "Skills"   },
  { id: "projects", label: "Projects" },
  { id: "blog",     label: "Blog"     },
  { id: "connect",  label: "Connect"  },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const SKIP_REPOS = new Set(["public", "public-website", "p1-opshub", "P1-OpsHub"]);

interface HomeDashboardProps {
  blogPosts: Pick<PostSummary, "id" | "title" | "slug" | "excerpt" | "createdAt">[];
  githubRepos: EnrichedRepo[];
  homeContent: HomeContent;
  featuredProjects: FeaturedProjectContent[];
}

export function HomeDashboard({
  blogPosts,
  githubRepos,
  homeContent,
  featuredProjects,
}: HomeDashboardProps) {
  // Live-refresh GitHub repos every 30s so visitors can see commits land in real time.
  // The API endpoint caches server-side for 30s so the GH API isn't pounded.
  const [repos, setRepos] = useState<EnrichedRepo[]>(githubRepos);
  const [lastSync, setLastSync] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch("/api/github/repos", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { repos: EnrichedRepo[]; fetchedAt: string };
        if (cancelled || !Array.isArray(data.repos)) return;
        setRepos(data.repos);
        setLastSync(new Date(data.fetchedAt).getTime());
      } catch {
        // Network blip — silently keep last good state and try again next tick.
      }
    }
    refresh();
    const id = window.setInterval(refresh, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // Tick every 5s so relative timestamps ("12s ago") stay current between fetches.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(id);
  }, []);

  // featuredProjects is intentionally NOT consumed below: the user explicitly wants
  // pure last-commit ordering with no manual pins. Keeping the prop in the interface
  // lets callers continue to pass it without code churn — drop it later if it stays unused.
  void featuredProjects;

  // Reveal-on-scroll for this island's [data-reveal] children. Runs post-hydration
  // so the class never lands mid-hydration (which trips React mismatch errors) —
  // the global BaseLayout observer deliberately skips astro-island content.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll("[data-reveal]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("is-revealed"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Scrollspy — middle-of-viewport band decides the active anchor.
  const [active, setActive] = useState<SectionId | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id as SectionId);
          }
        }
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  const sortedRepos = [...repos]
    .filter((r) => !SKIP_REPOS.has(r.name))
    .sort((a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime());

  return (
    <div ref={rootRef} className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <Hero homeContent={homeContent} latestRepo={sortedRepos[0]} now={now} />
      <SectionAnchorNav active={active} />

      <SectionShell id="about" kicker="01" title="About">
        <AboutSection homeContent={homeContent} />
      </SectionShell>

      <SectionShell id="skills" kicker="02" title="Skills">
        <SkillsSection />
      </SectionShell>

      <SectionShell id="projects" kicker="03" title="Projects">
        <ProjectsSection repos={sortedRepos} lastSync={lastSync} now={now} />
      </SectionShell>

      <SectionShell id="blog" kicker="04" title="Writing">
        <BlogSection posts={blogPosts} />
      </SectionShell>

      <SectionShell id="connect" kicker="05" title="Connect">
        <ConnectSection homeContent={homeContent} />
      </SectionShell>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero({
  homeContent,
  latestRepo,
  now,
}: {
  homeContent: HomeContent;
  latestRepo: EnrichedRepo | undefined;
  now: number;
}) {
  return (
    <header className="relative flex flex-col-reverse items-center gap-10 pt-14 pb-16 md:min-h-[68vh] md:flex-row md:items-center md:justify-between md:gap-12 md:pt-10 md:pb-20">
      <div className="max-w-2xl text-center md:text-left">
        <p
          data-reveal
          className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent-2)] mb-4"
        >
          {homeContent.heroTitle}
        </p>

        <h1
          id="hero-name"
          data-reveal
          style={{ "--reveal-delay": "0.08s" } as React.CSSProperties}
          className="font-display gradient-text-animated text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.02] tracking-tight pb-2"
        >
          {homeContent.heroName}
        </h1>

        <p
          data-reveal
          style={{ "--reveal-delay": "0.16s" } as React.CSSProperties}
          className="mt-5 text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed"
        >
          {homeContent.heroSummary}
        </p>

        <div
          data-reveal
          style={{ "--reveal-delay": "0.24s" } as React.CSSProperties}
          className="mt-6 flex flex-wrap items-center justify-center md:justify-start gap-3"
        >
          <span className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] glass-card rounded-full px-3.5 py-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 pulse-dot shrink-0" />
            {homeContent.availabilityLabel}
          </span>
          <span className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] glass-card rounded-full px-3.5 py-1.5">
            📍 {homeContent.heroLocation}
          </span>
        </div>

        <div
          data-reveal
          style={{ "--reveal-delay": "0.32s" } as React.CSSProperties}
          className="mt-8 flex flex-wrap items-center justify-center md:justify-start gap-3"
        >
          <a
            href="/resume"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_var(--accent-glow)]"
            style={{ background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))" }}
          >
            View Resume
          </a>
          <a
            href="#connect"
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold glass-card text-[var(--text-primary)] transition-all duration-200 hover:-translate-y-0.5"
          >
            Get in Touch
          </a>
        </div>

        {latestRepo && (
          <p
            data-reveal
            style={{ "--reveal-delay": "0.4s" } as React.CSSProperties}
            className="mt-8 inline-flex items-center gap-2 font-mono text-xs text-[var(--text-muted)]"
          >
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            last push&nbsp;
            <a
              href={latestRepo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] hover:underline underline-offset-2"
            >
              {latestRepo.name}
            </a>
            · {relTime(latestRepo.pushed_at, now)}
          </p>
        )}
      </div>

      <div
        data-reveal
        style={{ "--reveal-delay": "0.2s" } as React.CSSProperties}
        className="shrink-0"
      >
        <div className="glow-ring">
          <img
            src="/images/brookeandme.png"
            alt="Steve and Brooke"
            width={176}
            height={176}
            className="relative h-36 w-36 md:h-44 md:w-44 rounded-full object-cover ring-2 ring-[var(--glass-border)]"
          />
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Sticky anchor nav with scrollspy
// ---------------------------------------------------------------------------

function SectionAnchorNav({ active }: { active: SectionId | null }) {
  return (
    <nav
      aria-label="Page sections"
      className="sticky top-16 z-40 -mx-4 sm:mx-0 mb-4 flex justify-center"
    >
      <div className="glass-card rounded-full px-1.5 py-1.5 flex gap-0.5 overflow-x-auto max-w-full">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            aria-current={active === s.id ? "true" : undefined}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
              active === s.id
                ? "text-white shadow-md"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
            style={
              active === s.id
                ? { background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))" }
                : undefined
            }
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Shared section + card shells
// ---------------------------------------------------------------------------

function SectionShell({
  id,
  kicker,
  title,
  children,
}: {
  id: SectionId;
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-36 py-14 md:py-20">
      <div data-reveal className="mb-8 flex items-baseline gap-4">
        <span className="font-mono text-sm text-[var(--accent-2)]">{kicker}</span>
        <h2
          id={`${id}-heading`}
          className="font-display accent-bar text-3xl md:text-4xl font-bold tracking-tight text-[var(--text-primary)]"
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function GlassCard({
  children,
  className,
  delay,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      data-reveal
      style={delay ? ({ "--reveal-delay": `${delay}s` } as React.CSSProperties) : undefined}
      className={cn("glass-card spotlight-card rounded-2xl", className)}
    >
      {children}
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
      role="img"
      aria-label="Masonic square and compasses"
    >
      <path d="M12 2 L3 18 M12 2 L21 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="2" r="1.5" fill="currentColor" />
      <path d="M3 6 L12 22 L21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="12" textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="bold" fill="currentColor" fontFamily="Georgia, serif">G</text>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// About
// ---------------------------------------------------------------------------

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

function AboutSection({ homeContent }: { homeContent: HomeContent }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <GlassCard className="lg:col-span-2 p-6 md:p-8">
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="relative shrink-0">
            <div
              className="absolute inset-0 rounded-full blur-md opacity-50"
              style={{ background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))", transform: "scale(1.1)" }}
              aria-hidden
            />
            <img
              src="/images/brookeandme.png"
              alt="Steve and Brooke"
              width={128}
              height={128}
              loading="lazy"
              decoding="async"
              className="relative rounded-full ring-2 ring-[var(--glass-border)] object-cover"
            />
          </div>

          <div className="space-y-3">
            <p className="text-[var(--text-secondary)] leading-relaxed max-w-3xl">
              {homeContent.aboutBio}
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
      </GlassCard>

      <GlassCard className="p-6 md:p-8" delay={0.08}>
        <h3 className="text-xs font-medium tracking-widest uppercase text-[var(--text-muted)] mb-5">
          Career Timeline
        </h3>
        <ol className="relative space-y-6 pl-5 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-px before:bg-gradient-to-b before:from-[var(--gradient-start)] before:via-[var(--gradient-mid)] before:to-[var(--gradient-end)]">
          {timeline.map((item) => (
            <li key={item.period} className="relative">
              <span
                className="absolute -left-[1.65rem] top-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-[var(--surface)]"
                style={{ background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))" }}
                aria-hidden="true"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
              <p className="font-mono text-xs font-semibold text-[var(--accent)] mb-0.5 uppercase tracking-wide">{item.period}</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5 leading-relaxed">{item.body}</p>
            </li>
          ))}
        </ol>
      </GlassCard>

      <GlassCard className="p-6 md:p-8" delay={0.16}>
        <h3 className="text-xs font-medium tracking-widest uppercase text-[var(--text-muted)] mb-5">
          Interests & Hobbies
        </h3>
        <div className="space-y-3">
          {homeContent.interests.map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-xl p-3 bg-[var(--surface-hover)]/60">
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
      </GlassCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skills
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
    highlight: false,
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
    highlight: false,
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
    highlight: false,
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
    color: "#6366f1",
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
              ? { background: "linear-gradient(90deg, var(--gradient-start), var(--gradient-mid))" }
              : { background: "var(--border)" }
          }
        />
      ))}
    </div>
  );
}

function SkillsSection() {
  return (
    <div className="space-y-5">
      <GlassCard className="p-6 md:p-8">
        <h3 className="text-xs font-medium tracking-widest uppercase text-[var(--text-muted)] mb-5">
          Certifications
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {certifications.map((cert) => (
            <div
              key={cert.name}
              className="flex items-center gap-4 rounded-xl p-4 border border-[var(--border)] bg-[var(--surface-hover)]/60"
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: `${cert.color}20`, border: `1px solid ${cert.color}40` }}
                aria-hidden="true"
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
      </GlassCard>

      <div className="grid gap-5 lg:grid-cols-2">
        {skillCategories.map((cat, idx) => (
          <GlassCard
            key={cat.label}
            className={cn("p-6 md:p-8", cat.highlight && "gradient-border")}
            delay={(idx % 2) * 0.08}
          >
            <h3 className="text-xs font-medium tracking-widest uppercase text-[var(--text-muted)] mb-2">
              <span aria-hidden="true">{cat.icon}</span>  {cat.label}
            </h3>
            {cat.highlight && (
              <p className="text-xs text-[var(--accent)] mb-3 font-medium">Core expertise</p>
            )}
            <ul className="space-y-4 mt-3">
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
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

function ProjectsSection({
  repos,
  lastSync,
  now,
}: {
  repos: EnrichedRepo[];
  lastSync: number | null;
  now: number;
}) {
  return (
    <div className="space-y-4">
      <div data-reveal className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-[var(--text-muted)]">
            {repos.length} project{repos.length !== 1 ? "s" : ""}, ordered by last commit
          </p>
          <LiveIndicator lastSync={lastSync} now={now} />
        </div>
        <a
          href="https://github.com/stevenfackley"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-[var(--accent)] hover:underline underline-offset-2"
        >
          View GitHub profile
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {repos.map((repo, idx) => {
          // @ts-expect-error - isPrivate added dynamically during repo enrichment
          const isPrivate = repo.private || repo.isPrivate;

          return (
            <a key={repo.name} href={repo.html_url} target="_blank" rel="noopener noreferrer" className="block group">
              <GlassCard className="p-6 card-glow h-full" delay={(idx % 2) * 0.06}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 text-white"
                      style={{ background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))" }}
                    >
                      {repo.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                          {repo.name}
                        </h3>
                        {isPrivate && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-muted)] border border-[var(--border)]">
                            Private
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-[var(--text-muted)] mt-0.5">
                        {repo.language ?? "Code"} · {relTime(repo.pushed_at, now)}
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
                    {repo.badges.map((b) => (
                      <img key={b.imageUrl} src={b.imageUrl} alt={b.label} loading="lazy" className="h-5" />
                    ))}
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
              </GlassCard>
            </a>
          );
        })}
      </div>

      {repos.length === 0 && (
        <GlassCard className="p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">Unable to load GitHub repos. Check back soon.</p>
        </GlassCard>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Blog
// ---------------------------------------------------------------------------

function BlogSection({ posts }: { posts: HomeDashboardProps["blogPosts"] }) {
  return (
    <div className="space-y-4">
      <div data-reveal className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {posts.length === 0 ? "No posts yet." : "Latest from the blog"}
        </p>
        <a href="/blog" className="text-sm text-[var(--accent)] hover:underline underline-offset-2">
          View all posts
        </a>
      </div>

      {posts.length === 0 ? (
        <GlassCard className="p-8">
          <p className="text-sm text-[var(--text-muted)]">No posts yet. Check back soon!</p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {posts.map((post, idx) => (
            <a key={post.id} href={`/blog/${post.slug}`} className="block group">
              <GlassCard className="p-6 card-glow h-full" delay={idx * 0.08}>
                <time className="font-mono text-xs text-[var(--text-muted)]">
                  {formatDateShort(post.createdAt)}
                </time>
                <h3 className="mt-2 text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors leading-snug">
                  {post.title}
                </h3>
                {post.excerpt && (
                  <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                )}
                <span className="mt-4 inline-block text-xs text-[var(--accent)]">Read more →</span>
              </GlassCard>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connect
// ---------------------------------------------------------------------------

function ConnectSection({ homeContent }: { homeContent: HomeContent }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <GlassCard className="lg:col-span-2 p-6 md:p-8">
        <h3 className="text-xs font-medium tracking-widest uppercase text-[var(--text-muted)] mb-5">
          Open To
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {homeContent.opportunities.map((item) => (
            <div key={item.title} className="rounded-xl bg-[var(--surface-hover)]/60 p-4">
              <p className="text-lg mb-1" aria-hidden="true">{item.icon}</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-6 md:p-8" delay={0.08}>
        <h3 className="text-xs font-medium tracking-widest uppercase text-[var(--text-muted)] mb-5">
          Get In Touch
        </h3>
        <div className="space-y-3">
          <a
            href={homeContent.contact.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-xl px-4 py-3.5 border border-[var(--border)] bg-[var(--surface-hover)]/60 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-150 text-[var(--text-secondary)] text-sm font-medium"
          >
            <span className="text-lg font-bold" aria-hidden="true">in</span>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">LinkedIn</p>
              <p className="text-xs text-[var(--text-muted)]">Connect and follow my work</p>
            </div>
            <span className="ml-auto" aria-hidden="true">&#8599;</span>
          </a>

          <a
            href={`mailto:${homeContent.contact.email}`}
            className="flex items-center gap-4 rounded-xl px-4 py-3.5 border border-[var(--border)] bg-[var(--surface-hover)]/60 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-150 text-[var(--text-secondary)] text-sm font-medium"
          >
            <span className="text-lg" aria-hidden="true">✉️</span>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Email</p>
              <p className="text-xs text-[var(--text-muted)]">{homeContent.contact.email}</p>
            </div>
          </a>

          <a
            href={homeContent.contact.github}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 rounded-xl px-4 py-3.5 border border-[var(--border)] bg-[var(--surface-hover)]/60 hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-150 text-[var(--text-secondary)] text-sm font-medium"
          >
            <span className="text-lg" aria-hidden="true">&#9661;</span>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">GitHub</p>
              <p className="text-xs text-[var(--text-muted)]">{homeContent.contact.github.replace("https://github.com/", "")}</p>
            </div>
            <span className="ml-auto" aria-hidden="true">&#8599;</span>
          </a>
        </div>
      </GlassCard>

      <GlassCard className="p-6 md:p-8" delay={0.16}>
        <h3 className="text-xs font-medium tracking-widest uppercase text-[var(--text-muted)] mb-5">
          Resume
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">
          Full work history, certifications, and references available on request.
          View the interactive version or save a PDF copy.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="/resume"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-white text-sm font-semibold transition-all duration-150 hover:opacity-90 hover:-translate-y-0.5"
            style={{ background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-mid))" }}
          >
            View Interactive Resume
          </a>
        </div>
      </GlassCard>
    </div>
  );
}
