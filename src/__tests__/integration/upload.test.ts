/**
 * Integration tests for POST /api/upload
 *
 * Auth and filesystem helpers are mocked so no real I/O occurs.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock auth before importing the route ─────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

// ── Mock upload helpers ───────────────────────────────────────────────────────
vi.mock("@/lib/upload", () => ({
  isAllowedMimeType: vi.fn(),
  sanitizeFilename: vi.fn((name: string) => name),
  getMaxSizeBytes: vi.fn(() => 5 * 1024 * 1024), // 5 MB
  saveUploadedFile: vi.fn(),
  MIME_TO_EXT: {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  },
}));

import { POST } from "@/app/api/upload/route";
import { auth } from "@/lib/auth";
import { isAllowedMimeType, saveUploadedFile } from "@/lib/upload";

const mockAuth = auth as ReturnType<typeof vi.fn>;
const mockIsAllowed = isAllowedMimeType as ReturnType<typeof vi.fn>;
const mockSave = saveUploadedFile as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeImageFile(
  name = "photo.jpg",
  type = "image/jpeg",
  sizeBytes = 1024
): File {
  const content = new Uint8Array(sizeBytes).fill(0xff);
  return new File([content], name, { type });
}

function makeUploadRequest(file?: File): Request {
  const formData = new FormData();
  if (file) formData.append("file", file);
  return new Request("http://localhost/api/upload", {
    method: "POST",
    body: formData,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/upload", () => {
  it("returns 401 when the user is not authenticated", async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeUploadRequest(makeImageFile()));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/unauthorized/i);
  });

  it("returns 400 when no file is attached", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "ADMIN" } });
    const res = await POST(makeUploadRequest()); // no file
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/no file/i);
  });

  it("returns 400 when the MIME type is not allowed", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "ADMIN" } });
    mockIsAllowed.mockReturnValueOnce(false);

    const file = makeImageFile("doc.pdf", "application/pdf");
    const res = await POST(makeUploadRequest(file));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/not allowed/i);
  });

  it("returns 413 when the file exceeds the size limit", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "ADMIN" } });
    mockIsAllowed.mockReturnValueOnce(true);

    // 6 MB — over the mocked 5 MB limit
    const bigFile = makeImageFile("big.jpg", "image/jpeg", 6 * 1024 * 1024);
    const res = await POST(makeUploadRequest(bigFile));
    expect(res.status).toBe(413);
    const json = await res.json();
    expect(json.error).toMatch(/too large/i);
  });

  it("returns 200 with a url on successful upload", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "ADMIN" } });
    mockIsAllowed.mockReturnValueOnce(true);
    mockSave.mockResolvedValueOnce("/uploads/photo.jpg");

    const res = await POST(makeUploadRequest(makeImageFile()));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.url).toBe("/uploads/photo.jpg");
  });

  it("returns 500 when saveUploadedFile throws", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "ADMIN" } });
    mockIsAllowed.mockReturnValueOnce(true);
    mockSave.mockRejectedValueOnce(new Error("Disk full"));

    const res = await POST(makeUploadRequest(makeImageFile()));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to save/i);
  });

  it("appends the correct extension when the filename lacks one", async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: "1", role: "ADMIN" } });
    mockIsAllowed.mockReturnValueOnce(true);
    mockSave.mockResolvedValueOnce("/uploads/photonoext.png");

    // File with no extension
    const file = makeImageFile("photonoext", "image/png");
    const res = await POST(makeUploadRequest(file));
    expect(res.status).toBe(200);

    // saveUploadedFile should have been called with a .png filename
    const [, savedName] = mockSave.mock.calls[0] as [Buffer, string];
    expect(savedName).toMatch(/\.png$/);
  });
});
