import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

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
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    heroName: z.string(),
    heroTitle: z.string(),
    heroSummary: z.string(),
    heroLocation: z.string(),
    availabilityLabel: z.string(),
    aboutBio: z.string(),
    interests: z.array(homeInterestSchema),
    opportunities: z.array(homeOpportunitySchema),
    contact: z.object({
      email: z.email(),
      linkedin: z.url(),
      github: z.url(),
    }),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    status: z.enum(["active", "coming-soon"]).default("active"),
    stack: z.array(z.string()),
    href: z.url().optional(),
    featured: z.boolean().default(false),
    order: z.number().int().default(100),
  }),
});

const resumeSkillItemSchema = z.object({
  name: z.string(),
  pct: z.number().int().min(0).max(100),
});

const resumeSummarySchema = z.object({
  type: z.literal("summary"),
  order: z.number().int().default(100),
});

const resumeSkillCategorySchema = z.object({
  type: z.literal("skill-category"),
  order: z.number().int().default(100),
  category: z.string(),
  items: z.array(resumeSkillItemSchema),
});

const resumeTechStackSchema = z.object({
  type: z.literal("tech-stack"),
  order: z.number().int().default(100),
  items: z.array(z.string()),
});

const resumeExperienceSchema = z.object({
  type: z.literal("experience"),
  order: z.number().int().default(100),
  company: z.string(),
  location: z.string(),
  period: z.string(),
  role: z.string(),
  tags: z.array(z.string()),
});

const resumeCertificationSchema = z.object({
  type: z.literal("certification"),
  order: z.number().int().default(100),
  role: z.string(),
  issuer: z.string(),
  color: z.string(),
  bg: z.string(),
  icon: z.string(),
});

const resumeEducationSchema = z.object({
  type: z.literal("education"),
  order: z.number().int().default(100),
  degree: z.string(),
  school: z.string(),
  year: z.string(),
  location: z.string().optional(),
  minor: z.string().optional(),
});

const resume = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/resume" }),
  schema: z.discriminatedUnion("type", [
    resumeSummarySchema,
    resumeSkillCategorySchema,
    resumeTechStackSchema,
    resumeExperienceSchema,
    resumeCertificationSchema,
    resumeEducationSchema,
  ]),
});

export const collections = { pages, projects, resume };
