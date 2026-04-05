import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetSessionFromHeaders,
  mockGetMaxSizeBytes,
  mockIsAllowedMimeType,
  mockSanitizeFilename,
  mockSaveUploadedFile,
} = vi.hoisted(() => ({
  mockGetSessionFromHeaders: vi.fn(),
  mockGetMaxSizeBytes: vi.fn(() => 5 * 1024 * 1024),
  mockIsAllowedMimeType: vi.fn(() => true),
  mockSanitizeFilename: vi.fn((name: string) => name),
  mockSaveUploadedFile: vi.fn(),
}));

vi.mock("@/lib/admin-session", () => ({
  getSessionFromHeaders: mockGetSessionFromHeaders,
}));

vi.mock("@shared/index", () => ({
  getMaxSizeBytes: mockGetMaxSizeBytes,
  isAllowedMimeType: mockIsAllowedMimeType,
  sanitizeFilename: mockSanitizeFilename,
  saveUploadedFile: mockSaveUploadedFile,
}));

import { POST } from "@/app/api/upload/route";

const adminSession = { user: { id: "u1", role: "ADMIN" } };

function makeRequest(file?: File | null): Request {
  const formData = new FormData();
  if (file) formData.append("file", file);
  return new Request("http://localhost/api/upload", { method: "POST", body: formData });
}

function makeFile(name = "test.jpg", type = "image/jpeg", size = 1024): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMaxSizeBytes.mockReturnValue(5 * 1024 * 1024);
    mockIsAllowedMimeType.mockReturnValue(true);
    mockSanitizeFilename.mockImplementation((name: string) => name);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetSessionFromHeaders.mockResolvedValue(null);

    const res = await POST(makeRequest(makeFile()));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 for non-ADMIN role", async () => {
    mockGetSessionFromHeaders.mockResolvedValue({ user: { id: "u2", role: "CLIENT" } });

    const res = await POST(makeRequest(makeFile()));

    expect(res.status).toBe(401);
  });

  it("returns 400 when no file is provided", async () => {
    mockGetSessionFromHeaders.mockResolvedValue(adminSession);

    const res = await POST(makeRequest(null));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "No file provided" });
  });

  it("returns 400 when file exceeds max size", async () => {
    mockGetSessionFromHeaders.mockResolvedValue(adminSession);
    mockGetMaxSizeBytes.mockReturnValue(1024);
    const bigFile = makeFile("big.jpg", "image/jpeg", 2048);

    const res = await POST(makeRequest(bigFile));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "File too large" });
  });

  it("returns 400 for disallowed MIME type", async () => {
    mockGetSessionFromHeaders.mockResolvedValue(adminSession);
    mockIsAllowedMimeType.mockReturnValue(false);

    const res = await POST(makeRequest(makeFile("virus.exe", "application/exe")));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid file type" });
  });

  it("returns 200 with url on successful upload", async () => {
    mockGetSessionFromHeaders.mockResolvedValue(adminSession);
    mockSaveUploadedFile.mockResolvedValue("https://cdn.example.com/test.jpg");

    const res = await POST(makeRequest(makeFile()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://cdn.example.com/test.jpg" });
    expect(mockSaveUploadedFile).toHaveBeenCalled();
  });

  it("sanitizes the filename before saving", async () => {
    mockGetSessionFromHeaders.mockResolvedValue(adminSession);
    mockSanitizeFilename.mockReturnValue("safe-name.jpg");
    mockSaveUploadedFile.mockResolvedValue("https://cdn.example.com/safe-name.jpg");

    await POST(makeRequest(makeFile("../dangerous/../name.jpg")));

    expect(mockSanitizeFilename).toHaveBeenCalledWith("../dangerous/../name.jpg");
  });

  it("returns 500 when saveUploadedFile throws", async () => {
    mockGetSessionFromHeaders.mockResolvedValue(adminSession);
    mockSaveUploadedFile.mockRejectedValue(new Error("S3 error"));

    const res = await POST(makeRequest(makeFile()));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Upload failed" });
  });
});
