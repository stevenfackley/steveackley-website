/**
 * A post's status as the admin sees it. No database imports, so the admin
 * islands can use it in the browser.
 *
 * The site stores two columns, `published` and `scheduledAt`. An unpublished
 * post with a schedule time is waiting for the cron route
 * (/api/cron/publish-scheduled), which publishes it at its next run once the
 * time has passed. A time in the past therefore still means "scheduled".
 */
export type PostStatus = "published" | "scheduled" | "draft";

type ScheduleValue = Date | string | null | undefined;

function hasSchedule(value: ScheduleValue): boolean {
  if (!value) return false;
  return !Number.isNaN(new Date(value).getTime());
}

export function postStatus(post: { published: boolean; scheduledAt?: ScheduleValue }): PostStatus {
  if (post.published) return "published";
  return hasSchedule(post.scheduledAt) ? "scheduled" : "draft";
}

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  published: "Published",
  scheduled: "Scheduled",
  draft: "Draft",
};

/**
 * The schedule time still in force for a post, or null.
 *
 * A published post has none: whatever time the row still holds has done its
 * work, or was overtaken by a publish by hand. The edit form must not start
 * with it. Saved again on a post switched back to draft, a time that has
 * passed would make the cron route publish the post at its next run.
 */
export function pendingScheduleOf(post: { published: boolean; scheduledAt?: Date | null }): Date | null {
  return post.published ? null : post.scheduledAt ?? null;
}
