import { eq, type SQL } from "drizzle-orm";
import { posts } from "@/db/schema";
import { readingTimeMinutes } from "@/lib/reading-time";

/**
 * Which posts the public site shows: published ones. A scheduled post becomes
 * public when the cron route sets `published`. isPublic() is the rule as a
 * query condition; isPublicPost() is the same rule for a row already loaded.
 */
export function isPublic(): SQL {
  return eq(posts.published, true);
}

export function isPublicPost(post: { published: boolean }): boolean {
  return post.published;
}

type ReadingTimeFields = { readingTimeMinutes: number | null; content: string };

/**
 * Prefer the reading time stored at save time; fall back to computing it for
 * posts that predate the column (NULL).
 */
export function readMinutesOf(post: ReadingTimeFields): number {
  return post.readingTimeMinutes ?? readingTimeMinutes(post.content);
}

export function withReadMinutes<T extends ReadingTimeFields>(post: T): T & { readMinutes: number } {
  return { ...post, readMinutes: readMinutesOf(post) };
}
