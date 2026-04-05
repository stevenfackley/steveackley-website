import { getCollection, getEntry } from "astro:content";
import type { FeaturedProjectContent, HomeContent, ResumeContent } from "@/content/types";

export async function getHomeContent(): Promise<HomeContent> {
  const entry = await getEntry("pages", "home");
  if (!entry) {
    throw new Error("Missing pages/home content entry");
  }

  return entry.data;
}

export async function getResumeContent(): Promise<ResumeContent> {
  const entries = await getCollection("resume");
  const byOrder = [...entries].sort((a, b) => a.data.order - b.data.order);

  const summaryEntry = byOrder.find((entry) => entry.data.type === "summary");
  if (!summaryEntry) {
    throw new Error("Missing resume summary content entry");
  }

  return {
    summary: summaryEntry.body.trim(),
    coreSkills: byOrder
      .filter((entry) => entry.data.type === "skill-category")
      .flatMap((entry) =>
        (entry.data.items ?? []).map((item) => ({
          name: typeof item === "string" ? item : item.name,
          pct: typeof item === "string" ? 0 : item.pct,
          category: entry.data.category ?? "General",
        })),
      ),
    techTags: byOrder
      .filter((entry) => entry.data.type === "tech-stack")
      .flatMap((entry) => (entry.data.items ?? []).filter((item): item is string => typeof item === "string")),
    experience: byOrder
      .filter((entry) => entry.data.type === "experience")
      .map((entry) => ({
        company: entry.data.company ?? "",
        location: entry.data.location ?? "",
        period: entry.data.period ?? "",
        role: entry.data.role ?? "",
        body: entry.body.trim(),
        tags: entry.data.tags ?? [],
      })),
    certifications: byOrder
      .filter((entry) => entry.data.type === "certification")
      .map((entry) => ({
        name: entry.data.role ?? entry.id,
        issuer: entry.data.issuer ?? "",
        color: entry.data.color ?? "#2563eb",
        bg: entry.data.bg ?? "rgba(37,99,235,0.1)",
        icon: entry.data.icon ?? "🏅",
      })),
    education: byOrder
      .filter((entry) => entry.data.type === "education")
      .map((entry) => ({
        degree: entry.data.degree ?? "",
        school: entry.data.school ?? "",
        year: entry.data.year ?? "",
        location: entry.data.location,
        minor: entry.data.minor,
      })),
  };
}

export async function getFeaturedProjects(): Promise<FeaturedProjectContent[]> {
  const entries = await getCollection("projects", ({ data }) => data.featured);
  return entries
    .sort((a, b) => a.data.order - b.data.order)
    .map((entry) => ({
      slug: entry.id,
      title: entry.data.title,
      summary: entry.data.summary,
      status: entry.data.status,
      stack: entry.data.stack,
      href: entry.data.href,
      order: entry.data.order,
    }));
}
