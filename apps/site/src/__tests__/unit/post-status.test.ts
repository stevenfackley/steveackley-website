import { describe, it, expect } from "vitest";
import { POST_STATUS_LABEL, pendingScheduleOf, postStatus } from "@/lib/post-status";

const past = new Date("2026-01-01T09:00:00Z");
const now = new Date("2026-06-01T12:00:00Z");
const future = new Date("2099-01-01T09:00:00Z");

describe("postStatus", () => {
  it("is published whenever the post is published, whatever its schedule time", () => {
    expect(postStatus({ published: true })).toBe("published");
    expect(postStatus({ published: true, scheduledAt: null })).toBe("published");
    expect(postStatus({ published: true, scheduledAt: past })).toBe("published");
    expect(postStatus({ published: true, scheduledAt: future })).toBe("published");
  });

  it("is scheduled for an unpublished post with a schedule time", () => {
    expect(postStatus({ published: false, scheduledAt: future })).toBe("scheduled");
  });

  it("is still scheduled when the time has passed: the cron publishes it at its next run", () => {
    expect(postStatus({ published: false, scheduledAt: past })).toBe("scheduled");
  });

  it("reads a time that arrives as a string", () => {
    expect(postStatus({ published: false, scheduledAt: "2099-01-01T09:00:00.000Z" })).toBe("scheduled");
    expect(postStatus({ published: false, scheduledAt: "2099-01-01T09:00" })).toBe("scheduled");
  });

  it("is draft for an unpublished post with no usable schedule time", () => {
    expect(postStatus({ published: false })).toBe("draft");
    expect(postStatus({ published: false, scheduledAt: null })).toBe("draft");
    expect(postStatus({ published: false, scheduledAt: "" })).toBe("draft");
    expect(postStatus({ published: false, scheduledAt: "not a date" })).toBe("draft");
  });
});

describe("POST_STATUS_LABEL", () => {
  it("names each status", () => {
    expect(POST_STATUS_LABEL).toEqual({ published: "Published", scheduled: "Scheduled", draft: "Draft" });
  });
});

describe("pendingScheduleOf", () => {
  it("keeps the time of a post that is still waiting for it", () => {
    expect(pendingScheduleOf({ published: false, scheduledAt: future }, now)).toBe(future);
  });

  it("keeps a passed time on an unpublished post: the cron has not run yet", () => {
    expect(pendingScheduleOf({ published: false, scheduledAt: past }, now)).toBe(past);
  });

  it("drops a passed time once the post is published: it is used up", () => {
    expect(pendingScheduleOf({ published: true, scheduledAt: past }, now)).toBeNull();
    expect(pendingScheduleOf({ published: true, scheduledAt: now }, now)).toBeNull();
  });

  it("keeps a time still ahead on a post published early by hand", () => {
    expect(pendingScheduleOf({ published: true, scheduledAt: future }, now)).toBe(future);
  });

  it("is null when there is no schedule time", () => {
    expect(pendingScheduleOf({ published: false, scheduledAt: null }, now)).toBeNull();
    expect(pendingScheduleOf({ published: true }, now)).toBeNull();
  });
});
