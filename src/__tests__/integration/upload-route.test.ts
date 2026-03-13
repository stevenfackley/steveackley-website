/**
 * Integration tests for src/pages/api/upload.ts
 *
 * The Astro API route handler is called directly with mock context objects.
 * No real S3/R2 calls or file system operations occur — @/lib/upload is mocked.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist mock functions so they're available inside vi.mock factory ──────────
const { mockSaveUploadedFile, mockIsAllowedMimeType, mockSanitizeFilename, mockGetMaxSizeBytes } =
  vi.hoisted(() => ({
    mockSaveUploadedFile: vi.fn().mockResolvedValue("https://pub.test.dev/uuid-photo.jpg"),
    mockIsAllowedMimeType: vi.fn().mockReturnValue(true),
    mockSanitizeFilename: vi.fn((name: string) => `uuid-${name}`),
    mockGetMaxSizeBytes: vi.fn().mockReturnValue(5 * 1024 * 1024), // 5 MB default
  }));

vi.mock("@/lib/upload", () => ({
  saveUploadedFile: mockSaveUploadedFile,
  isAllowedMimeType: mockIsAllowedMimeType,
  sanitizeFilename: mockSanitizeFilename,
  getMaxSizeBytes: mockGetMaxSizeBytes,
}));

// Import the handler AFTER mocks are registered
import { POST } from "@/pages/api/upload";

// ── Helper: build a minimal Astro-like context ────────────────────────────────
function makeContext(options: {
  user?: { role: string } | null;
  formData?: FormData;
}) {
  const formData = options.formData ?? new FormData();
  const request = new Request("http://localhost/api/upload", {
    method: "POST",
    body: formData,
  });
  return {
    request,
    locals: {
      user: options.user ?? null,
      session: null,
    },
  };
}

// ── Helper: build a minimal JPEG File for FormData ────────────────────────────
function makeImageFile(name = "photo.jpg", type = "image/jpeg", content = "fake-image"): File {
  return new File([content], name, { type });
}

// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore sensible defaults after each test
    mockIsAllowedMimeType.mockReturnValue(true);
    mockGetMaxSizeBytes.mockReturnValue(5 * 1024 * 1024);
    mockSaveUploadedFile.mockResolvedValue("https://pub.test.dev/uuid-photo.jpg");
  });

  // ── Authentication ──────────────────────────────────────────────────────────
  describe("authentication", () => {
    it("returns 401 when user is null", async () => {
      const res = await POST(makeContext({ user: null }) as any);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 when user has CLIENT role", async () => {
      const res = await POST(makeContext({ user: { role: "CLIENT" } }) as any);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("does not call saveUploadedFile when unauthorized", async () => {
      await POST(makeContext({ user: null }) as any);
      expect(mockSaveUploadedFile).not.toHaveBeenCalled();
    });
  });

  // ── File validation ─────────────────────────────────────────────────────────
  describe("file validation", () => {
    it("returns 400 when no file field is present in FormData", async () => {
      const res = await POST(makeContext({ user: { role: "ADMIN" } }) as any);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("No file provided");
    });

    it("returns 400 when file exceeds getMaxSizeBytes()", async () => {
      // Simulate a 10-byte size limit
      mockGetMaxSizeBytes.mockReturnValue(10);

      const formData = new FormData();
      // Create a file larger than 10 bytes
      formData.append("file", new File([new Uint8Array(100)], "big.jpg", { type: "image/jpeg" }));

      const res = await POST(makeContext({ user: { role: "ADMIN" }, formData }) as any);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("File too large");
    });

    it("returns 400 when MIME type is not allowed", async () => {
      mockIsAllowedMimeType.mockReturnValue(false);

      const formData = new FormData();
      formData.append("file", makeImageFile("evil.svg", "image/svg+xml", "<svg/>"));

      const res = await POST(makeContext({ user: { role: "ADMIN" }, formData }) as any);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Invalid file type");
    });
  });

  // ── Successful upload ───────────────────────────────────────────────────────
  describe("successful upload", () => {
    it("returns 200 with the public URL on a valid JPEG upload", async () => {
      const formData = new FormData();
      formData.append("file", makeImageFile());

      const res = await POST(makeContext({ user: { role: "ADMIN" }, formData }) as any);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.url).toBe("https://pub.test.dev/uuid-photo.jpg");
    });

    it("calls sanitizeFilename with the original filename", async () => {
      const formData = new FormData();
      formData.append("file", makeImageFile("my image.png", "image/png"));

      await POST(makeContext({ user: { role: "ADMIN" }, formData }) as any);
      expect(mockSanitizeFilename).toHaveBeenCalledWith("my image.png");
    });

    it("calls saveUploadedFile with the sanitized filename and correct MIME type", async () => {
      const formData = new FormData();
      formData.append("file", makeImageFile("photo.jpg", "image/jpeg"));

      await POST(makeContext({ user: { role: "ADMIN" }, formData }) as any);
      expect(mockSaveUploadedFile).toHaveBeenCalledWith(
        expect.any(Buffer),
        "uuid-photo.jpg",
        "image/jpeg"
      );
    });
  });

  // ── Internal error handling ─────────────────────────────────────────────────
  describe("error handling", () => {
    it("returns 500 when saveUploadedFile throws", async () => {
      mockSaveUploadedFile.mockRejectedValueOnce(new Error("R2 outage"));

      const formData = new FormData();
      formData.append("file", makeImageFile());

      const res = await POST(makeContext({ user: { role: "ADMIN" }, formData }) as any);
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe("Upload failed");
    });
  });
});
