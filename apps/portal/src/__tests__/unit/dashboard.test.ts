import { describe, it, expect, vi, beforeEach } from "vitest";

// Build a thenable drizzle-like query chain so `await db.select().from()...` works
function makeChain(resolveWith: unknown) {
  const chain: Record<string, unknown> & { then: (r: (v: unknown) => unknown) => Promise<unknown> } = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolveWith).then(resolve),
  };
  (chain.from as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  (chain.where as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  (chain.orderBy as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  (chain.limit as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  return chain;
}

const { mockSelect } = vi.hoisted(() => ({ mockSelect: vi.fn() }));

vi.mock("@shared/index", () => ({
  db: { select: mockSelect },
  posts: {},
  users: {},
  messages: {},
  siteSettings: {},
  clientApps: {},
  count: vi.fn(() => "count()"),
  desc: vi.fn((col: unknown) => col),
  eq: vi.fn(),
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

describe("getAdminOverview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns counts from six parallel queries", async () => {
    const counts = [5, 3, 10, 4, 2, 7];
    let i = 0;
    mockSelect.mockImplementation(() => makeChain([{ value: counts[i++] }]));

    const result = await getAdminOverview();

    expect(result).toEqual({
      posts: 5,
      publishedPosts: 3,
      users: 10,
      clients: 4,
      apps: 2,
      messages: 7,
    });
    expect(mockSelect).toHaveBeenCalledTimes(6);
  });

  it("defaults to 0 when query returns empty array", async () => {
    mockSelect.mockImplementation(() => makeChain([]));

    const result = await getAdminOverview();

    expect(result.posts).toBe(0);
    expect(result.publishedPosts).toBe(0);
  });
});

describe("getRecentMessages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns query result", async () => {
    const rows = [{ id: "1", subject: "hi" }];
    mockSelect.mockReturnValue(makeChain(rows));

    const result = await getRecentMessages();
    expect(result).toEqual(rows);
  });

  it("applies default limit of 20", async () => {
    const chain = makeChain([]);
    mockSelect.mockReturnValue(chain);

    await getRecentMessages();
    expect(chain.limit).toHaveBeenCalledWith(20);
  });

  it("accepts custom limit", async () => {
    const chain = makeChain([]);
    mockSelect.mockReturnValue(chain);

    await getRecentMessages(5);
    expect(chain.limit).toHaveBeenCalledWith(5);
  });
});

describe("snapshot queries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getSettingsSnapshot returns db result", async () => {
    const rows = [{ key: "foo", value: "bar" }];
    mockSelect.mockReturnValue(makeChain(rows));
    expect(await getSettingsSnapshot()).toEqual(rows);
  });

  it("getUsersSnapshot returns db result", async () => {
    const rows = [{ id: "u1" }];
    mockSelect.mockReturnValue(makeChain(rows));
    expect(await getUsersSnapshot()).toEqual(rows);
  });

  it("getClientsSnapshot filters by CLIENT role", async () => {
    const chain = makeChain([]);
    mockSelect.mockReturnValue(chain);

    await getClientsSnapshot();

    expect(chain.where).toHaveBeenCalled();
  });

  it("getAppsSnapshot returns db result", async () => {
    const rows = [{ id: "a1" }];
    mockSelect.mockReturnValue(makeChain(rows));
    expect(await getAppsSnapshot()).toEqual(rows);
  });

  it("getPostsSnapshot returns db result", async () => {
    const rows = [{ id: "p1" }];
    mockSelect.mockReturnValue(makeChain(rows));
    expect(await getPostsSnapshot()).toEqual(rows);
  });
});
