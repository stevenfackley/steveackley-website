import type { ResumeContent } from '@/content/types';

const SITE_ORIGIN = 'https://steveackley.org';

export const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Steve Ackley',
  url: SITE_ORIGIN,
  jobTitle: 'Staff Software Engineer',
  image: `${SITE_ORIGIN}/avatar.png`,
  sameAs: [
    'https://github.com/stevenfackley',
    'https://www.linkedin.com/in/stevenackley',
  ],
  knowsAbout: ['.NET', 'Azure', 'C#', 'Full-Stack Development', 'Software Architecture'],
} as const;

export function resumePersonSchema(
  content: ResumeContent,
  avatarUrl: string,
): Record<string, unknown> {
  const currentJob = content.experience[0];
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Steve Ackley',
    url: SITE_ORIGIN,
    image: avatarUrl,
    email: 'stevenfackley@gmail.com',
    jobTitle: currentJob?.role ?? 'Staff Software Engineer',
    worksFor: currentJob
      ? {
          '@type': 'Organization',
          name: currentJob.company,
          address: { '@type': 'PostalAddress', addressLocality: currentJob.location },
        }
      : undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Derby',
      addressRegion: 'CT',
      addressCountry: 'US',
    },
    alumniOf: content.education.map((ed) => ({
      '@type': 'EducationalOrganization',
      name: ed.school,
      ...(ed.location && { address: { '@type': 'PostalAddress', addressLocality: ed.location } }),
    })),
    hasCredential: content.certifications.map((cert) => ({
      '@type': 'EducationalOccupationalCredential',
      name: cert.name,
      recognizedBy: { '@type': 'Organization', name: cert.issuer },
    })),
    knowsAbout: content.techTags.slice(0, 20),
    sameAs: [
      'https://github.com/stevenfackley',
      'https://www.linkedin.com/in/stevenackley',
    ],
  };
}

export function breadcrumbSchema(
  items: Array<{ name: string; url: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function blogPostingSchema(args: {
  title: string;
  slug: string;
  excerpt?: string | null;
  coverImage?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Record<string, unknown> {
  const url = `${SITE_ORIGIN}/blog/${args.slug}`;
  const image = args.coverImage ?? `${SITE_ORIGIN}/avatar.png`;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: args.title,
    description: args.excerpt ?? args.title,
    url,
    mainEntityOfPage: url,
    image,
    datePublished: args.createdAt.toISOString(),
    dateModified: args.updatedAt.toISOString(),
    author: {
      '@type': 'Person',
      name: 'Steve Ackley',
      url: SITE_ORIGIN,
    },
    publisher: {
      '@type': 'Person',
      name: 'Steve Ackley',
      url: SITE_ORIGIN,
    },
  };
}
