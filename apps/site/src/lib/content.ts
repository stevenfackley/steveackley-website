import { getCollection, getEntry } from "astro:content";
import type { CollectionEntry } from "astro:content";
import type { FeaturedProjectContent, HomeContent, ResumeContent } from "@/content/types";

type ResumeEntry = CollectionEntry<"resume">;
type ResumeEntryData = ResumeEntry["data"];

// `entry.data` is a discriminated union (astro:content infers it from the
// Zod `discriminatedUnion` schema), so a plain `.filter((e) => e.data.type === x)`
// does not narrow `entry.data` for TypeScript. This factory returns a proper
// type-predicate filter so callers get the narrowed variant back.
function isResumeType<T extends ResumeEntryData["type"]>(type: T) {
  return (entry: ResumeEntry): entry is ResumeEntry & { data: Extract<ResumeEntryData, { type: T }> } =>
    entry.data.type === type;
}

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
    summary: summaryEntry.body?.trim() ?? "",
    coreSkills: byOrder
      .filter(isResumeType("skill-category"))
      .flatMap((entry) =>
        entry.data.items.map((item) => ({
          name: item.name,
          pct: item.pct,
          category: entry.data.category,
        })),
      ),
    techTags: byOrder.filter(isResumeType("tech-stack")).flatMap((entry) => entry.data.items),
    experience: byOrder
      .filter(isResumeType("experience"))
      .map((entry) => ({
        company: entry.data.company,
        location: entry.data.location,
        period: entry.data.period,
        role: entry.data.role,
        body: entry.body?.trim() ?? "",
        tags: entry.data.tags,
      })),
    certifications: byOrder
      .filter(isResumeType("certification"))
      .map((entry) => ({
        name: entry.data.role,
        issuer: entry.data.issuer,
        color: entry.data.color,
        bg: entry.data.bg,
        icon: entry.data.icon,
      })),
    education: byOrder
      .filter(isResumeType("education"))
      .map((entry) => ({
        degree: entry.data.degree,
        school: entry.data.school,
        year: entry.data.year,
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
