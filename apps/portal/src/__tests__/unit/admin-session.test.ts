import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSession, mockHeaders, mockRedirect } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockHeaders: vi.fn(),
  mockRedirect: vi.fn(),
}));

vi.mock("@shared/index", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("next/headers", () => ({ headers: mockHeaders }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

import { getSessionFromHeaders, requireAdminSession } from "@/lib/admin-session";

const adminSession = { user: { id: "u1", role: "ADMIN", email: "admin@example.com" } };
const clientSession = { user: { id: "u2", role: "CLIENT", email: "client@example.com" } };

describe("getSessionFromHeaders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("calls auth.api.getSession with provided headers", async () => {
    mockGetSession.mockResolvedValue(adminSession);
    const fakeHeaders = new Headers({ authorization: "Bearer token" });

    const result = await getSessionFromHeaders(fakeHeaders);

    expect(mockGetSession).toHaveBeenCalledWith({ headers: fakeHeaders });
    expect(result).toEqual(adminSession);
  });

  it("returns null when no session exists", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await getSessionFromHeaders(new Headers());
    expect(result).toBeNull();
  });
});

describe("requireAdminSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns session for valid ADMIN user", async () => {
    mockHeaders.mockResolvedValue(new Headers());
    mockGetSession.mockResolvedValue(adminSession);

    const result = await requireAdminSession();

    expect(result).toEqual(adminSession);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects to /login when no session", async () => {
    mockHeaders.mockResolvedValue(new Headers());
    mockGetSession.mockResolvedValue(null);
    mockRedirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });

    await expect(requireAdminSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects clients away from admin routes", async () => {
    mockHeaders.mockResolvedValue(new Headers());
    mockGetSession.mockResolvedValue(clientSession);
    mockRedirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });

    await expect(requireAdminSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/client/dashboard");
  });
});
