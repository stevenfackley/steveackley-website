import { stripHtml } from "@/lib/utils";

/**
 * Average adult silent-reading speed for prose, in words per minute.
 * The conventional range is ~200–250 wpm; 200 is a deliberately conservative
 * default so estimates skew slightly generous rather than rushed.
 */
export const WORDS_PER_MINUTE = 200;

/**
 * Count whitespace-delimited words in a plain-text string.
 * Empty / whitespace-only input counts as zero words.
 */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed === "") return 0;
  return trimmed.split(/\s+/).length;
}

/**
 * Estimate reading time in whole minutes for a blog post body.
 *
 * HTML tags are stripped first (post bodies are stored as HTML), then words are
 * counted and divided by `wpm`. The result is clamped to a minimum of 1 minute
 * so even a one-line post never reads as "0 min".
 *
 * Pure and DOM-free — safe to call at render time or when persisting a post.
 */
export function readingTimeMinutes(
  content: string | null | undefined,
  wpm: number = WORDS_PER_MINUTE,
): number {
  const words = countWords(stripHtml(content ?? ""));
  return Math.max(1, Math.round(words / wpm));
}
