import { defineCollection, z } from "astro:content";

const homeOverviewSkillSchema = z.object({
  name: z.string(),
  level: z.number().int().min(1).max(5),
});

const homeInterestSchema = z.object({
  icon: z.string().nullable().default(null),
  label: z.string(),
  detail: z.string().optional(),
  mason: z.boolean().optional(),
});

const homeOpportunitySchema = z.object({
  icon: z.string(),
  title: z.string(),
  body: z.string(),
});

const pages = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    heroName: z.string(),
    heroTitle: z.string(),
    heroSummary: z.string(),
    heroLocation: z.string(),
    availabilityLabel: z.string(),
    aboutSummary: z.string(),
    aboutBio: z.string(),
    overviewSkills: z.array(homeOverviewSkillSchema),
    interests: z.array(homeInterestSchema),
    featuredProjects: z.array(z.string()),
    opportunities: z.array(homeOpportunitySchema),
    contact: z.object({
      email: z.string().email(),
      linkedin: z.string().url(),
      github: z.string().url(),
    }),
  }),
});

const projects = defineCollection({
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    status: z.enum(["active", "coming-soon"]).default("active"),
    stack: z.array(z.string()),
    href: z.string().url().optional(),
    featured: z.boolean().default(false),
    order: z.number().int().default(100),
  }),
});

const blog = defineCollection({
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    publishedAt: z.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    coverImage: z.string().optional(),
  }),
});

const resume = defineCollection({
  schema: z.object({
    type: z.enum(["summary", "experience", "education", "certification", "skill-category", "tech-stack"]),
    order: z.number().int().default(100),
    company: z.string().optional(),
    location: z.string().optional(),
    period: z.string().optional(),
    role: z.string().optional(),
    degree: z.string().optional(),
    school: z.string().optional(),
    year: z.string().optional(),
    minor: z.string().optional(),
    issuer: z.string().optional(),
    color: z.string().optional(),
    bg: z.string().optional(),
    icon: z.string().optional(),
    category: z.string().optional(),
    items: z
      .array(
        z.union([
          z.string(),
          z.object({
            name: z.string(),
            pct: z.number().int().min(0).max(100),
          }),
        ]),
      )
      .optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { blog, pages, projects, resume };
