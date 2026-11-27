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
 * Once a post is published and its schedule time has passed, the time is used
 * up. The edit form must not start with it: saved again on a post switched
 * back to draft, it would make the cron route publish the post at its next
 * run. A time still ahead is kept, so a post published early by hand can go
 * back to waiting for it.
 */
export function pendingScheduleOf(
  post: { published: boolean; scheduledAt?: Date | null },
  now: Date,
): Date | null {
  const at = post.scheduledAt ?? null;
  if (!at) return null;
  return post.published && at.getTime() <= now.getTime() ? null : at;
}
