ALTER TABLE "Post" ADD COLUMN "tags" text[];--> statement-breakpoint
ALTER TABLE "Post" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "Post" ADD COLUMN "readingTimeMinutes" integer;--> statement-breakpoint
-- Backfill reading time for posts that predate this column. Idempotent: only
-- rows still NULL are touched, so re-running (or running after new posts have
-- self-populated via the app) is a no-op. Mirrors readingTimeMinutes() in
-- src/lib/reading-time.ts: strip HTML tags, count whitespace-delimited words,
-- divide by 200 wpm, clamp to a minimum of 1 minute.
UPDATE "Post"
SET "readingTimeMinutes" = GREATEST(
  1,
  ROUND(
    COALESCE(
      array_length(
        NULLIF(
          regexp_split_to_array(btrim(regexp_replace("content", '<[^>]+>', ' ', 'g')), '\s+'),
          ARRAY['']::text[]
        ),
        1
      ),
      0
    )::numeric / 200.0
  )
)::integer
WHERE "readingTimeMinutes" IS NULL;