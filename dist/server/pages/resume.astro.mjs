import { e as createComponent, k as renderComponent, r as renderTemplate } from '../chunks/astro/server_B-1XR7Cx.mjs';
import 'piccolore';
import { $ as $$PublicLayout } from '../chunks/PublicLayout_BFjoUw8x.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useRef, useState, useEffect } from 'react';
export { renderers } from '../renderers.mjs';

function useIntersectionVisible(threshold = 0.1) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, visible];
}

const EMAIL = "stevenfackley@gmail.com";
const LINKEDIN = "https://www.linkedin.com/in/stevenackley";
const GITHUB_URL = "https://github.com/stevenfackley";
const coreSkills = [
  { name: "C# / .NET", pct: 98, category: "Microsoft" },
  { name: "ASP.NET Core / Web API", pct: 96, category: "Microsoft" },
  { name: "SQL Server", pct: 95, category: "Microsoft" },
  { name: "Entity Framework Core", pct: 95, category: "Microsoft" },
  { name: "WPF / XAML", pct: 90, category: "Microsoft" },
  { name: "Azure Cloud", pct: 93, category: "Microsoft" },
  { name: "Azure DevOps", pct: 90, category: "Microsoft" },
  { name: "Angular", pct: 92, category: "Frontend" },
  { name: "TypeScript", pct: 90, category: "Frontend" },
  { name: "React / Next.js", pct: 76, category: "Frontend" },
  { name: "CSS / SCSS / Bootstrap", pct: 85, category: "Frontend" },
  { name: "SSIS / SSAS", pct: 82, category: "Data" },
  { name: "Tableau", pct: 78, category: "Data" },
  { name: "Docker / Containers", pct: 85, category: "DevOps" },
  { name: "Jenkins / GitLab CI", pct: 82, category: "DevOps" }
];
const techTags = [
  "C#",
  ".NET 10",
  "ASP.NET Core",
  "Azure",
  "Azure DevOps",
  "SQL Server",
  "Entity Framework Core",
  "Angular",
  "TypeScript",
  "React",
  "Next.js",
  "WPF",
  "XAML",
  "SSIS",
  "SSAS",
  "SSRS",
  "Tableau",
  "ML.NET",
  "Docker",
  "Kubernetes",
  "Jenkins",
  "GitLab",
  "GitHub Actions",
  "Microservices",
  "SOA",
  "REST APIs",
  "SignalR",
  "Service Bus",
  "Key Vault",
  "Bootstrap",
  "Tailwind CSS",
  "SCSS",
  "xUnit",
  "NUnit",
  "Playwright",
  "PostgreSQL",
  "SQLite",
  "Prisma",
  "Node.js",
  "AWS",
  "C++",
  "WCF",
  "SymmetricDS",
  "Clean Architecture",
  "DDD"
];
const experience = [
  {
    company: "Lockheed Martin",
    location: "Shelton, CT",
    period: "May 2022 - Present",
    role: "Staff Software Engineer",
    body: "Spearheaded ground-up development of a web-based IETM platform for the F-16 fighter aircraft, replacing legacy documentation workflows with a browser-native, containerized solution. Maintained a 95% on-schedule delivery rate while meeting defense-grade quality thresholds. Drove a 50% reduction in post-merge defects through structured code review practices.",
    tags: ["Angular", "ASP.NET Core", "C#", "AWS", "Node.js", "SQLite", "PostgreSQL", "Docker", "GitLab", "YAML"]
  },
  {
    company: "Lockheed Martin",
    location: "Shelton, CT",
    period: "Dec 2020 - May 2022",
    role: "Senior Software Engineer",
    body: "Architected a disconnected desktop IETM for the HH-60W Combat Rescue Helicopter with real-time bidirectional sync to cloud-hosted USAF IMDS via SymmetricDS. Led a cross-functional team of 10 engineers, driving a 20% productivity gain. Authored coding standards adopted across a 30-engineer shared monorepo.",
    tags: ["WPF", "C#", "XAML", "SQL Server", "SQLite", "SymmetricDS", "Jenkins", "Bitbucket", "Azure"]
  },
  {
    company: "Flexi Software",
    location: "Shelton, CT",
    period: "Jul 2020 - Dec 2020",
    role: "Software Architect",
    body: "Sole principal engineer on a cloud-hosted SaaS license authorization and distribution platform, taking the system from concept to production. Produced complete technical specifications and coordinated a distributed team of 15+ engineers across 3 locations, 2 countries, and 2 time zones.",
    tags: ["ASP.NET Core", "C#", "Azure", "Azure DevOps", "C++", "WPF"]
  },
  {
    company: "Sila Solutions Group",
    location: "Shelton, CT",
    period: "Sep 2016 - Jul 2020",
    role: "Sr. Specialist, Software Engineering & Integration, DevOps",
    body: "Embedded consulting engineer at Lockheed Martin / Sikorsky Aircraft on the HH-60W Combat Rescue Helicopter IETM across a 4-year engagement. Introduced agile development practices that delivered a measurable 15% improvement in team throughput and delivery predictability.",
    tags: ["WPF", "C#", "XAML", "SQL Server", "SQLite", "SymmetricDS", "Jenkins", "GitLab"]
  },
  {
    company: "Emerson Process Management",
    location: "Watertown, CT",
    period: "May 2014 - Sep 2016",
    role: ".NET Developer",
    body: "Owned feature development and maintenance of Catapult, a proprietary EAM platform serving oil and gas reliability clients. Engineered a RESTful Web API layer deployed to every installation, and architected a KPI analytics web application using MVC5, Entity Framework, and n-tier architecture patterns.",
    tags: ["C#", "ASP.NET MVC", "Web API", "SQL Server", "WinForms", "Entity Framework", "jQuery", "Bootstrap"]
  },
  {
    company: "SMC Partners, LLC",
    location: "Healthcare Consulting",
    period: "Jan 2013 - Jun 2014",
    role: "Computer Programmer / Analyst",
    body: "Led development of a C# / ASP.NET web application replacing an end-of-life VB6 QA auditing system at Connecticare (CT), with role-based security and stored procedure-driven data access. Supported data warehouse implementation and SSRS report rationalization at Hometown Health (NV), consolidating a fragmented reporting estate by 40%.",
    tags: ["C#", "ASP.NET", "WCF", "SQL Server", "SSRS", "jQuery", "AJAX"]
  }
];
const certifications = [
  {
    name: "Arcitura Certified SOA Architect",
    issuer: "Arcitura Education",
    color: "#2563eb",
    bg: "rgba(37,99,235,0.1)",
    icon: "🏗"
  },
  {
    name: "Microsoft Technology Associate",
    issuer: "Microsoft (MCPS - Software Development)",
    color: "#0078d4",
    bg: "rgba(0,120,212,0.1)",
    icon: "🪟"
  }
];
const education = [
  {
    degree: "Bachelor of Science, Computer Science",
    minor: "Minor: Management Information Systems",
    school: "Central Connecticut State University",
    location: "New Britain, CT",
    year: "2016"
  },
  {
    degree: "Associate of Science, Computer Science",
    school: "Naugatuck Valley Community College",
    year: "2012"
  }
];
function AnimatedSkillBar({
  name,
  pct,
  category,
  delay,
  visible
}) {
  const categoryColors = {
    Microsoft: "from-blue-600 to-blue-500",
    Frontend: "from-purple-600 to-blue-500",
    Data: "from-emerald-600 to-teal-500",
    DevOps: "from-orange-500 to-amber-500"
  };
  const gradient = categoryColors[category] ?? "from-blue-600 to-purple-600";
  return /* @__PURE__ */ jsxs("div", { className: "group", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-1.5", children: [
      /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-[var(--text-primary)]", children: name }),
      /* @__PURE__ */ jsxs("span", { className: "text-xs font-semibold text-[var(--text-muted)] tabular-nums", children: [
        pct,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "h-2 w-full rounded-full bg-[var(--border)] overflow-hidden", children: /* @__PURE__ */ jsx(
      "div",
      {
        className: `h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-1000 ease-out`,
        style: {
          width: visible ? `${pct}%` : "0%",
          transitionDelay: visible ? `${delay}ms` : "0ms"
        }
      }
    ) })
  ] });
}
function FadeSection({
  children,
  className,
  delay = 0
}) {
  const [ref, visible] = useIntersectionVisible();
  return /* @__PURE__ */ jsx(
    "div",
    {
      ref,
      className,
      style: {
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`
      },
      children
    }
  );
}
function SkillsSection() {
  const [ref, visible] = useIntersectionVisible();
  const microsoft = coreSkills.filter((s) => s.category === "Microsoft");
  const frontend = coreSkills.filter((s) => s.category === "Frontend");
  const data = coreSkills.filter((s) => s.category === "Data");
  const devops = coreSkills.filter((s) => s.category === "DevOps");
  return /* @__PURE__ */ jsx("div", { ref, children: /* @__PURE__ */ jsx("div", { className: "grid gap-6 md:grid-cols-2", children: [
    { label: "🪟 Microsoft Stack", skills: microsoft, base: 0 },
    { label: "🖥 Frontend", skills: frontend, base: microsoft.length * 80 },
    { label: "📊 Data & BI", skills: data, base: (microsoft.length + frontend.length) * 80 },
    { label: "⚙ DevOps & Cloud Tools", skills: devops, base: (microsoft.length + frontend.length + data.length) * 80 }
  ].map(({ label, skills, base }) => /* @__PURE__ */ jsxs("div", { className: "bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6", children: [
    /* @__PURE__ */ jsx("h3", { className: "text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4", children: label }),
    /* @__PURE__ */ jsx("div", { className: "space-y-4", children: skills.map((s, i) => /* @__PURE__ */ jsx(AnimatedSkillBar, { ...s, delay: base + i * 80, visible }, s.name)) })
  ] }, label)) }) });
}
function ResumeClient({ avatarUrl }) {
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);
  function handlePrint() {
    window.print();
  }
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen", children: [
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: "resume-hero relative overflow-hidden",
        style: { background: "linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 50%, #4a1d96 100%)" },
        children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "absolute -top-20 -right-20 h-80 w-80 rounded-full opacity-20 blur-3xl pointer-events-none",
              style: { background: "radial-gradient(circle, #60a5fa, transparent)" },
              "aria-hidden": true
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "absolute -bottom-10 -left-10 h-60 w-60 rounded-full opacity-15 blur-3xl pointer-events-none",
              style: { background: "radial-gradient(circle, #a78bfa, transparent)" },
              "aria-hidden": true
            }
          ),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "absolute inset-0 opacity-10 pointer-events-none",
              style: {
                backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                backgroundSize: "28px 28px"
              },
              "aria-hidden": true
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "relative z-10 mx-auto max-w-5xl px-6 py-14 sm:py-20", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row items-start sm:items-center gap-7", children: [
            /* @__PURE__ */ jsxs(
              "div",
              {
                className: "relative shrink-0",
                style: {
                  opacity: heroVisible ? 1 : 0,
                  transform: heroVisible ? "scale(1)" : "scale(0.85)",
                  transition: "opacity 0.6s ease, transform 0.6s ease"
                },
                children: [
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: "absolute inset-0 rounded-full blur-md opacity-70",
                      style: { background: "linear-gradient(135deg, #60a5fa, #a78bfa)", transform: "scale(1.15)" },
                      "aria-hidden": true
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "img",
                    {
                      src: avatarUrl,
                      alt: "Steve Ackley",
                      width: 96,
                      height: 96,
                      className: "relative rounded-full ring-4 ring-white/20 object-cover"
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
              /* @__PURE__ */ jsxs(
                "div",
                {
                  style: {
                    opacity: heroVisible ? 1 : 0,
                    transform: heroVisible ? "translateY(0)" : "translateY(12px)",
                    transition: "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s"
                  },
                  children: [
                    /* @__PURE__ */ jsx("h1", { className: "text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-none", children: "Steve Ackley" }),
                    /* @__PURE__ */ jsx("p", { className: "mt-2 text-lg text-blue-200 font-medium", children: "Staff Software Engineer  ·  .NET  ·  Azure  ·  Full-Stack" }),
                    /* @__PURE__ */ jsxs("div", { className: "mt-4 flex flex-wrap gap-2", children: [
                      certifications.map((c) => /* @__PURE__ */ jsxs(
                        "span",
                        {
                          className: "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white border border-white/20",
                          style: { background: "rgba(255,255,255,0.12)" },
                          children: [
                            /* @__PURE__ */ jsx("span", { children: c.icon }),
                            c.name
                          ]
                        },
                        c.name
                      )),
                      /* @__PURE__ */ jsxs(
                        "span",
                        {
                          className: "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white border border-white/20",
                          style: { background: "rgba(255,255,255,0.12)" },
                          children: [
                            /* @__PURE__ */ jsx("span", { className: "h-2 w-2 rounded-full bg-emerald-400 pulse-dot inline-block" }),
                            "Open to consulting & side projects"
                          ]
                        }
                      )
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs(
                "div",
                {
                  className: "mt-6 flex flex-wrap items-center gap-4",
                  style: {
                    opacity: heroVisible ? 1 : 0,
                    transform: heroVisible ? "translateY(0)" : "translateY(8px)",
                    transition: "opacity 0.6s ease 0.25s, transform 0.6s ease 0.25s"
                  },
                  children: [
                    /* @__PURE__ */ jsxs("a", { href: `mailto:${EMAIL}`, className: "text-sm text-blue-200 hover:text-white transition-colors flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsx("span", { children: "✉" }),
                      " ",
                      EMAIL
                    ] }),
                    /* @__PURE__ */ jsxs("a", { href: LINKEDIN, target: "_blank", rel: "noopener noreferrer", className: "text-sm text-blue-200 hover:text-white transition-colors flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsx("span", { className: "font-bold", children: "in" }),
                      " LinkedIn"
                    ] }),
                    /* @__PURE__ */ jsxs("a", { href: GITHUB_URL, target: "_blank", rel: "noopener noreferrer", className: "text-sm text-blue-200 hover:text-white transition-colors flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsx("span", { children: "▽" }),
                      " GitHub"
                    ] }),
                    /* @__PURE__ */ jsxs("span", { className: "text-sm text-blue-200 flex items-center gap-1.5", children: [
                      /* @__PURE__ */ jsx("span", { children: "📍" }),
                      " Derby, CT"
                    ] })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsx(
              "div",
              {
                className: "shrink-0 no-print",
                style: {
                  opacity: heroVisible ? 1 : 0,
                  transform: heroVisible ? "translateY(0)" : "translateY(8px)",
                  transition: "opacity 0.6s ease 0.35s, transform 0.6s ease 0.35s"
                },
                children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
                  /* @__PURE__ */ jsxs(
                    "a",
                    {
                      href: "/resume/print",
                      target: "_blank",
                      className: "inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 transition-all duration-200 backdrop-blur-sm border border-white/30",
                      children: [
                        /* @__PURE__ */ jsx("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" }) }),
                        "Download Resume"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsx("p", { className: "text-xs text-blue-200 text-center", children: "Opens print-ready document" })
                ] })
              }
            )
          ] }) })
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "mx-auto max-w-5xl px-6 py-12 space-y-12", children: [
      /* @__PURE__ */ jsx(FadeSection, { delay: 0, children: /* @__PURE__ */ jsxs("div", { className: "bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-7 card-glow", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4", children: "Professional Summary" }),
        /* @__PURE__ */ jsxs("p", { className: "text-[var(--text-secondary)] leading-relaxed text-base", children: [
          "Staff Software Engineer at",
          " ",
          /* @__PURE__ */ jsx("strong", { className: "text-[var(--text-primary)]", children: "Lockheed Martin" }),
          " with",
          " ",
          /* @__PURE__ */ jsx("strong", { className: "text-[var(--text-primary)]", children: "12+ years of enterprise experience" }),
          " specializing in the Microsoft technology stack. I have built production systems across the full Microsoft ecosystem: C# / .NET back-ends, ASP.NET Core REST APIs, SQL Server databases, Azure cloud services, WPF desktop applications, Angular front-ends, and SSIS / SSAS data pipelines. Most of my professional career has been in Angular and ASP.NET shops, serving as a lead engineer and architect on complex defense and enterprise systems. I hold an",
          " ",
          /* @__PURE__ */ jsx("strong", { className: "text-[var(--text-primary)]", children: "Arcitura Certified SOA Architect" }),
          " certification and a",
          " ",
          /* @__PURE__ */ jsx("strong", { className: "text-[var(--text-primary)]", children: "Microsoft Technology Associate" }),
          " credential. Clean architecture, well-structured data, and systems built to last are what I care about most."
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs(FadeSection, { delay: 100, children: [
        /* @__PURE__ */ jsx("h2", { className: "text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-5 accent-bar", children: "Technical Skills" }),
        /* @__PURE__ */ jsx(SkillsSection, {})
      ] }),
      /* @__PURE__ */ jsxs(FadeSection, { delay: 150, children: [
        /* @__PURE__ */ jsx("h2", { className: "text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-5 accent-bar", children: "Work Experience" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx("div", { className: "absolute left-5 top-2 bottom-2 w-px bg-[var(--border)]", "aria-hidden": true }),
          /* @__PURE__ */ jsx("div", { className: "space-y-0", children: experience.map((item, i) => /* @__PURE__ */ jsxs(FadeSection, { delay: i * 80, className: "relative flex gap-6 pb-8", children: [
            /* @__PURE__ */ jsx("div", { className: "relative z-10 mt-1 shrink-0", children: /* @__PURE__ */ jsx(
              "div",
              {
                className: "h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ring-4 ring-[var(--background)]",
                style: { background: "linear-gradient(135deg, #2563eb, #7c3aed)" },
                children: i + 1
              }
            ) }),
            /* @__PURE__ */ jsxs("div", { className: "flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--border-hover)] transition-colors", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-2", children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("h3", { className: "text-base font-semibold text-[var(--text-primary)]", children: item.role }),
                  /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-[var(--accent)]", children: item.company }),
                  /* @__PURE__ */ jsx("p", { className: "text-xs text-[var(--text-muted)]", children: item.location })
                ] }),
                /* @__PURE__ */ jsx(
                  "span",
                  {
                    className: "text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 text-white",
                    style: { background: "linear-gradient(135deg, #2563eb, #7c3aed)" },
                    children: item.period
                  }
                )
              ] }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-[var(--text-secondary)] leading-relaxed mt-2", children: item.body }),
              /* @__PURE__ */ jsx("div", { className: "mt-3 flex flex-wrap gap-1.5", children: item.tags.map((t) => /* @__PURE__ */ jsx(
                "span",
                {
                  className: "text-xs px-2 py-0.5 rounded-md bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text-secondary)]",
                  children: t
                },
                t
              )) })
            ] })
          ] }, `${item.company}-${item.period}`)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(FadeSection, { delay: 200, children: [
        /* @__PURE__ */ jsx("h2", { className: "text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-5 accent-bar", children: "Education" }),
        /* @__PURE__ */ jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: education.map((ed) => /* @__PURE__ */ jsxs(
          "div",
          {
            className: "bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 card-glow",
            children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-[var(--text-primary)]", children: ed.degree }),
              ed.minor && /* @__PURE__ */ jsx("p", { className: "text-xs text-[var(--text-muted)] mt-0.5", children: ed.minor }),
              /* @__PURE__ */ jsx("p", { className: "text-sm text-[var(--accent)] mt-1", children: ed.school }),
              /* @__PURE__ */ jsxs("p", { className: "text-xs text-[var(--text-muted)] mt-0.5", children: [
                ed.year,
                ed.location ? ` · ${ed.location}` : ""
              ] })
            ]
          },
          ed.school
        )) })
      ] }),
      /* @__PURE__ */ jsxs(FadeSection, { delay: 220, children: [
        /* @__PURE__ */ jsx("h2", { className: "text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-5 accent-bar", children: "Certifications" }),
        /* @__PURE__ */ jsx("div", { className: "grid gap-4 sm:grid-cols-2", children: certifications.map((cert) => /* @__PURE__ */ jsxs(
          "div",
          {
            className: "flex items-center gap-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 card-glow",
            children: [
              /* @__PURE__ */ jsx(
                "div",
                {
                  className: "h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shrink-0",
                  style: { background: cert.bg, border: `1px solid ${cert.color}30` },
                  children: cert.icon
                }
              ),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("p", { className: "text-sm font-bold text-[var(--text-primary)]", children: cert.name }),
                /* @__PURE__ */ jsx("p", { className: "text-xs text-[var(--text-muted)] mt-0.5", children: cert.issuer }),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    className: "mt-2 h-1 w-16 rounded-full",
                    style: { background: `linear-gradient(90deg, ${cert.color}, transparent)` }
                  }
                )
              ] })
            ]
          },
          cert.name
        )) })
      ] }),
      /* @__PURE__ */ jsxs(FadeSection, { delay: 250, children: [
        /* @__PURE__ */ jsx("h2", { className: "text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-5 accent-bar", children: "Full Tech Stack" }),
        /* @__PURE__ */ jsx("div", { className: "bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6", children: /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: techTags.map((tag) => /* @__PURE__ */ jsx(
          "span",
          {
            className: "text-sm px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors duration-150 cursor-default",
            children: tag
          },
          tag
        )) }) })
      ] }),
      /* @__PURE__ */ jsx(FadeSection, { delay: 300, children: /* @__PURE__ */ jsxs(
        "div",
        {
          className: "relative rounded-2xl overflow-hidden p-8 text-center",
          style: { background: "linear-gradient(135deg, #1e3a8a, #4a1d96)" },
          children: [
            /* @__PURE__ */ jsx(
              "div",
              {
                className: "absolute inset-0 opacity-10 pointer-events-none",
                style: {
                  backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                  backgroundSize: "24px 24px"
                },
                "aria-hidden": true
              }
            ),
            /* @__PURE__ */ jsxs("div", { className: "relative z-10", children: [
              /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold text-blue-200 uppercase tracking-widest mb-2", children: "Get In Touch" }),
              /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold text-white mb-3", children: "Open to consulting and side projects" }),
              /* @__PURE__ */ jsx("p", { className: "text-blue-200 text-sm max-w-md mx-auto mb-6 leading-relaxed", children: "Currently a Staff Software Engineer at Lockheed Martin. Available for contract consulting, freelance .NET / Azure architecture work, and technically interesting side projects." }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-3 justify-center no-print", children: [
                /* @__PURE__ */ jsx(
                  "a",
                  {
                    href: `mailto:${EMAIL}`,
                    className: "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-white text-blue-900 hover:bg-blue-50 transition-colors",
                    children: "✉ Send an email"
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "a",
                  {
                    href: LINKEDIN,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold border-2 border-white/30 text-white hover:bg-white/10 transition-colors",
                    children: [
                      /* @__PURE__ */ jsx("span", { className: "font-bold", children: "in" }),
                      " Connect on LinkedIn"
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs(
                  "button",
                  {
                    onClick: handlePrint,
                    className: "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold border-2 border-white/30 text-white hover:bg-white/10 transition-colors cursor-pointer",
                    children: [
                      /* @__PURE__ */ jsx("svg", { className: "h-4 w-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 2, children: /* @__PURE__ */ jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" }) }),
                      "Save as PDF"
                    ]
                  }
                )
              ] })
            ] })
          ]
        }
      ) }),
      /* @__PURE__ */ jsx("div", { className: "text-center pb-4 no-print", children: /* @__PURE__ */ jsx(
        "a",
        {
          href: "/",
          className: "text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors",
          children: "← Back to home"
        }
      ) })
    ] })
  ] });
}

const $$Index = createComponent(($$result, $$props, $$slots) => {
  const avatarUrl = "https://avatars.githubusercontent.com/u/stevenfackley";
  return renderTemplate`${renderComponent($$result, "PublicLayout", $$PublicLayout, { "title": "Resume", "description": "Steve Ackley - Staff Software Engineer resume" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "ResumeClient", ResumeClient, { "client:load": true, "avatarUrl": avatarUrl, "client:component-hydration": "load", "client:component-path": "@/components/ResumeClient", "client:component-export": "ResumeClient" })} ` })}`;
}, "C:/Users/steve/projects/steveackleyorg/src/pages/resume/index.astro", void 0);

const $$file = "C:/Users/steve/projects/steveackleyorg/src/pages/resume/index.astro";
const $$url = "/resume";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
