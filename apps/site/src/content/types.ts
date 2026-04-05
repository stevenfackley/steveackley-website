export interface HomeOverviewSkill {
  name: string;
  level: number;
}

export interface HomeInterest {
  icon: string | null;
  label: string;
  detail?: string;
  mason?: boolean;
}

export interface HomeOpportunity {
  icon: string;
  title: string;
  body: string;
}

export interface HomeContent {
  title: string;
  description: string;
  heroName: string;
  heroTitle: string;
  heroSummary: string;
  heroLocation: string;
  availabilityLabel: string;
  aboutSummary: string;
  aboutBio: string;
  overviewSkills: HomeOverviewSkill[];
  interests: HomeInterest[];
  featuredProjects: string[];
  opportunities: HomeOpportunity[];
  contact: {
    email: string;
    linkedin: string;
    github: string;
  };
}

export interface FeaturedProjectContent {
  slug: string;
  title: string;
  summary: string;
  status: "active" | "coming-soon";
  stack: string[];
  href?: string;
  order: number;
}

export interface ResumeSkill {
  name: string;
  pct: number;
  category: string;
}

export interface ResumeExperience {
  company: string;
  location: string;
  period: string;
  role: string;
  body: string;
  tags: string[];
}

export interface ResumeCertification {
  name: string;
  issuer: string;
  color: string;
  bg: string;
  icon: string;
}

export interface ResumeEducation {
  degree: string;
  school: string;
  year: string;
  location?: string;
  minor?: string;
}

export interface ResumeContent {
  summary: string;
  coreSkills: ResumeSkill[];
  techTags: string[];
  experience: ResumeExperience[];
  certifications: ResumeCertification[];
  education: ResumeEducation[];
}
