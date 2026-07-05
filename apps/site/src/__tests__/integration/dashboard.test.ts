/**
 * Integration tests for src/lib/dashboard.ts
 *
 * Drizzle db is mocked so these run without a real database. Each dashboard
 * function issues its own db.select(...) chain (from/where/orderBy/limit);
 * the mock below builds a fresh thenable "chain" per call, resolving to a
 * queued result so tests can control exactly what each query returns.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mock state accessible inside vi.mock factory ─────────────────────
const h = vi.hoisted(() => {
  const state = {
    queue: [] as any[],
    lastChain: null as any,
  };

  function makeChain(result: any): any {
    const chain: any = {};
    chain.from = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.orderBy = vi.fn(() => chain);
    chain.limit = vi.fn(() => Promise.resolve(result));
    // Make the chain itself awaitable for queries that never call `.limit()`
    // (e.g. `db.select().from(posts)` or `...orderBy(...)` used directly).
    chain.then = (onFulfilled: any, onRejected: any) =>
      Promise.resolve(result).then(onFulfilled, onRejected);
    return chain;
  }

  const select = vi.fn(() => {
    const chain = makeChain(state.queue.shift());
    state.lastChain = chain;
    return chain;
  });

  return { state, select };
});

// ── Mock @/db (re-export of @shared/db/index) ────────────────────────────────
vi.mock("@/db", () => ({
  db: { select: h.select },
  posts: { published: "published", createdAt: "createdAt" },
  users: { role: "role", createdAt: "createdAt" },
  clientApps: { createdAt: "createdAt" },
  messages: {
    id: "id",
    subject: "subject",
    body: "body",
    type: "type",
    read: "read",
    createdAt: "createdAt",
    toUserId: "toUserId",
    fromUserId: "fromUserId",
  },
  siteSettings: { key: "key" },
}));

import {
  getAdminOverview,
  getRecentMessages,
  getSettingsSnapshot,
  getUsersSnapshot,
  getClientsSnapshot,
  getAppsSnapshot,
  getPostsSnapshot,
} from "@/lib/dashboard";

beforeEach(() => {
  vi.clearAllMocks();
  h.state.queue = [];
  h.state.lastChain = null;
});

// ---------------------------------------------------------------------------
// getAdminOverview
// ---------------------------------------------------------------------------
describe("getAdminOverview", () => {
  it("maps the six parallel counts to the overview shape, in call order", async () => {
    // Order matches the source: posts, publishedPosts, users, clients, apps, messages
    h.state.queue = [
      [{ value: 12 }],
      [{ value: 4 }],
      [{ value: 20 }],
      [{ value: 6 }],
      [{ value: 9 }],
      [{ value: 15 }],
    ];

    const result = await getAdminOverview();

    expect(result).toEqual({
      posts: 12,
      publishedPosts: 4,
      users: 20,
      clients: 6,
      apps: 9,
      messages: 15,
    });
    expect(h.select).toHaveBeenCalledTimes(6);
  });

  it("falls back to 0 for every count when a query returns no rows", async () => {
    h.state.queue = [[], [], [], [], [], []];

    const result = await getAdminOverview();

    expect(result).toEqual({
      posts: 0,
      publishedPosts: 0,
      users: 0,
      clients: 0,
      apps: 0,
      messages: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// getRecentMessages
// ---------------------------------------------------------------------------
describe("getRecentMessages", () => {
  const rows = [
    {
      id: "m1",
      subject: "Hello",
      body: "Hi there",
      type: "CONTACT",
      read: false,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      toUserId: "u1",
      fromUserId: null,
    },
  ];

  it("returns the queried rows unchanged", async () => {
    h.state.queue = [rows];

    const result = await getRecentMessages();

    expect(result).toEqual(rows);
  });

  it("defaults the limit to 20", async () => {
    h.state.queue = [[]];

    await getRecentMessages();

    expect(h.state.lastChain.limit).toHaveBeenCalledWith(20);
  });

  it("forwards a custom limit", async () => {
    h.state.queue = [[]];

    await getRecentMessages(5);

    expect(h.state.lastChain.limit).toHaveBeenCalledWith(5);
  });
});

// ---------------------------------------------------------------------------
// getSettingsSnapshot
// ---------------------------------------------------------------------------
describe("getSettingsSnapshot", () => {
  it("returns all settings rows", async () => {
    const rows = [{ key: "bio_text", value: "Custom bio" }];
    h.state.queue = [rows];

    const result = await getSettingsSnapshot();

    expect(result).toEqual(rows);
  });
});

// ---------------------------------------------------------------------------
// getUsersSnapshot
// ---------------------------------------------------------------------------
describe("getUsersSnapshot", () => {
  it("returns all user rows", async () => {
    const rows = [{ id: "u1", role: "ADMIN" }];
    h.state.queue = [rows];

    const result = await getUsersSnapshot();

    expect(result).toEqual(rows);
  });
});

// ---------------------------------------------------------------------------
// getClientsSnapshot
// ---------------------------------------------------------------------------
describe("getClientsSnapshot", () => {
  it("returns rows and filters via .where()", async () => {
    const rows = [{ id: "u2", role: "CLIENT" }];
    h.state.queue = [rows];

    const result = await getClientsSnapshot();

    expect(result).toEqual(rows);
    expect(h.state.lastChain.where).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// getAppsSnapshot
// ---------------------------------------------------------------------------
describe("getAppsSnapshot", () => {
  it("returns all client-app rows", async () => {
    const rows = [{ id: "a1", name: "Widget" }];
    h.state.queue = [rows];

    const result = await getAppsSnapshot();

    expect(result).toEqual(rows);
  });
});

// ---------------------------------------------------------------------------
// getPostsSnapshot
// ---------------------------------------------------------------------------
describe("getPostsSnapshot", () => {
  it("returns all post rows, ordered via .orderBy()", async () => {
    const rows = [{ id: "p1", title: "Post One" }];
    h.state.queue = [rows];

    const result = await getPostsSnapshot();

    expect(result).toEqual(rows);
    expect(h.state.lastChain.orderBy).toHaveBeenCalledTimes(1);
  });
});
