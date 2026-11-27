import { describe, it, expect, afterEach, vi } from "vitest";
import { cronSecret, isSchedulerEnabled } from "@/lib/scheduler";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cronSecret", () => {
  it("is the configured value", () => {
    vi.stubEnv("CRON_SECRET", "0123abcd");
    expect(cronSecret()).toBe("0123abcd");
    expect(isSchedulerEnabled()).toBe(true);
  });

  it("drops surrounding whitespace, which an env file line can carry", () => {
    vi.stubEnv("CRON_SECRET", "  0123abcd \n");
    expect(cronSecret()).toBe("0123abcd");
  });

  it.each([
    ["empty", ""],
    ["blank", "   "],
  ])("is absent when the value is %s", (_name, value) => {
    vi.stubEnv("CRON_SECRET", value);
    expect(cronSecret()).toBeUndefined();
    expect(isSchedulerEnabled()).toBe(false);
  });

  it("is absent when the variable is not set at all", () => {
    vi.stubEnv("CRON_SECRET", undefined);
    expect(cronSecret()).toBeUndefined();
    expect(isSchedulerEnabled()).toBe(false);
  });

  it("is read on every call, not captured when the module loads", () => {
    vi.stubEnv("CRON_SECRET", "first");
    expect(cronSecret()).toBe("first");
    vi.stubEnv("CRON_SECRET", "second");
    expect(cronSecret()).toBe("second");
  });
});
