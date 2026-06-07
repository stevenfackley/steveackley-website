/**
 * Integration tests for src/pages/api/cron/publish-scheduled.ts
 *
 * The Astro API route handler is called directly with a mock request.
 * The Drizzle `db` is mocked so no real database is touched. CRON_SECRET is
 * stubbed per-test via vi.stubEnv.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => {
  const selectWhere = vi.fn();
  const from = vi.fn(() => ({ where: selectWhere }));
  const select = vi.fn(() => ({ from }));

  const updateReturning = vi.fn();
  const updateWhere = vi.fn(() => ({ returning: updateReturning }));
  const updateSet = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set: updateSet }));

  return { select, from, selectWhere, update, updateSet, updateWhere, updateReturning };
});

vi.mock("@/db", () => ({
  db: { select: h.select, update: h.update },
  posts: { id: "id", scheduledAt: "scheduledAt", published: "published" },
}));

import { GET } from "@/pages/api/cron/publish-scheduled";

function ctx(authHeader?: string) {
  const headers: Record<string, string> = {};
  if (authHeader) headers["authorization"] = authHeader;
  return {
    request: new Request("http://localhost/api/cron/publish-scheduled", { headers }),
  };
}

describe("GET /api/cron/publish-scheduled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.selectWhere.mockResolvedValue([]);
    h.updateReturning.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("authorization (fail-closed)", () => {
    it("returns 401 when CRON_SECRET is not configured", async () => {
      vi.stubEnv("CRON_SECRET", "");
      const res = await GET(ctx() as any);
      expect(res.status).toBe(401);
      expect(h.update).not.toHaveBeenCalled();
    });

    it("returns 401 when the secret is set but the Authorization header is missing", async () => {
      vi.stubEnv("CRON_SECRET", "s3cret");
      const res = await GET(ctx() as any);
      expect(res.status).toBe(401);
      expect(h.update).not.toHaveBeenCalled();
    });

    it("returns 401 when the bearer token does not match", async () => {
      vi.stubEnv("CRON_SECRET", "s3cret");
      const res = await GET(ctx("Bearer wrong") as any);
      expect(res.status).toBe(401);
      expect(h.update).not.toHaveBeenCalled();
    });
  });

  describe("publishing", () => {
    it("publishes all due posts in a single batched update", async () => {
      vi.stubEnv("CRON_SECRET", "s3cret");
      h.updateReturning.mockResolvedValue([
        { id: "1", title: "A", slug: "a" },
        { id: "2", title: "B", slug: "b" },
      ]);

      const res = await GET(ctx("Bearer s3cret") as any);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.count).toBe(2);
      // The whole point of the fix: one batched UPDATE, not one per post.
      expect(h.update).toHaveBeenCalledTimes(1);
      expect(h.updateReturning).toHaveBeenCalledTimes(1);
    });

    it("returns count 0 when nothing is due", async () => {
      vi.stubEnv("CRON_SECRET", "s3cret");
      h.updateReturning.mockResolvedValue([]);

      const res = await GET(ctx("Bearer s3cret") as any);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.count).toBe(0);
    });
  });
});
