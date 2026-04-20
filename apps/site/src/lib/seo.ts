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
