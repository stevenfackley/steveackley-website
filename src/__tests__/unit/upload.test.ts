/**
 * Unit tests for src/lib/upload.ts
 *
 * fs/promises and crypto are mocked so no real I/O or UUID generation occurs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock fs/promises before importing upload ──────────────────────────────────
vi.mock("fs/promises", () => ({
  default: {
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
  },
}));

// ── Mock crypto.randomUUID for deterministic filenames ────────────────────────
vi.mock("crypto", async (importOriginal) => {
  const original = await importOriginal<typeof import("crypto")>();
  return { ...original, randomUUID: vi.fn(() => "test-uuid-1234-5678") };
});

import fs from "fs/promises";
import {
  getUploadDir,
  getMaxSizeBytes,
  sanitizeFilename,
  isAllowedMimeType,
  ensureUploadDir,
  saveUploadedFile,
  deleteUploadedFile,
  ALLOWED_MIME_TYPES,
  MIME_TO_EXT,
} from "@/lib/upload";

const mockMkdir = fs.mkdir as ReturnType<typeof vi.fn>;
const mockWriteFile = fs.writeFile as ReturnType<typeof vi.fn>;
const mockUnlink = fs.unlink as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.UPLOAD_DIR;
  delete process.env.MAX_UPLOAD_SIZE_MB;
});

afterEach(() => {
  delete process.env.UPLOAD_DIR;
  delete process.env.MAX_UPLOAD_SIZE_MB;
});

// ---------------------------------------------------------------------------
// getUploadDir
// ---------------------------------------------------------------------------
describe("getUploadDir", () => {
  it("returns ./uploads by default", () => {
    expect(getUploadDir()).toBe("./uploads");
  });

  it("returns UPLOAD_DIR env var when set", () => {
    process.env.UPLOAD_DIR = "/mnt/uploads";
    expect(getUploadDir()).toBe("/mnt/uploads");
  });
});

// ---------------------------------------------------------------------------
// getMaxSizeBytes
// ---------------------------------------------------------------------------
describe("getMaxSizeBytes", () => {
  it("returns 5 MB (5242880 bytes) by default", () => {
    expect(getMaxSizeBytes()).toBe(5 * 1024 * 1024);
  });

  it("returns custom size from MAX_UPLOAD_SIZE_MB env var", () => {
    process.env.MAX_UPLOAD_SIZE_MB = "10";
    expect(getMaxSizeBytes()).toBe(10 * 1024 * 1024);
  });

  it("returns 1 MB when MAX_UPLOAD_SIZE_MB is set to 1", () => {
    process.env.MAX_UPLOAD_SIZE_MB = "1";
    expect(getMaxSizeBytes()).toBe(1 * 1024 * 1024);
  });
});

// ---------------------------------------------------------------------------
// sanitizeFilename
// ---------------------------------------------------------------------------
describe("sanitizeFilename", () => {
  it("prefixes the result with a UUID", () => {
    const result = sanitizeFilename("photo.jpg");
    expect(result).toMatch(/^test-uuid-1234-5678-/);
  });

  it("preserves alphanumeric characters, dots, hyphens, and underscores", () => {
    const result = sanitizeFilename("my-photo_2024.jpg");
    expect(result).toContain("my-photo_2024.jpg");
  });

  it("replaces spaces and unsafe characters with underscores", () => {
    const result = sanitizeFilename("my photo & file!.jpg");
    const basename = result.replace(/^test-uuid-1234-5678-/, "");
    expect(basename).not.toContain(" ");
    expect(basename).not.toContain("&");
    expect(basename).not.toContain("!");
  });

  it("prevents path traversal by extracting only the basename", () => {
    const result = sanitizeFilename("../../etc/passwd");
    // path.basename strips directory components
    expect(result).not.toContain("..");
    expect(result).not.toContain("/");
    expect(result).toContain("passwd");
  });

  it("truncates the sanitized basename to at most 100 characters", () => {
    const longName = "a".repeat(200) + ".jpg";
    const result = sanitizeFilename(longName);
    const basename = result.replace(/^test-uuid-1234-5678-/, "");
    expect(basename.length).toBeLessThanOrEqual(100);
  });

  it("handles filenames with only safe characters", () => {
    const result = sanitizeFilename("simple.png");
    expect(result).toContain("simple.png");
  });
});

// ---------------------------------------------------------------------------
// isAllowedMimeType
// ---------------------------------------------------------------------------
describe("isAllowedMimeType", () => {
  it("returns true for all entries in ALLOWED_MIME_TYPES", () => {
    for (const mime of ALLOWED_MIME_TYPES) {
      expect(isAllowedMimeType(mime)).toBe(true);
    }
  });

  it("returns true for image/jpeg", () => {
    expect(isAllowedMimeType("image/jpeg")).toBe(true);
  });

  it("returns true for image/png", () => {
    expect(isAllowedMimeType("image/png")).toBe(true);
  });

  it("returns true for image/webp", () => {
    expect(isAllowedMimeType("image/webp")).toBe(true);
  });

  it("returns true for image/gif", () => {
    expect(isAllowedMimeType("image/gif")).toBe(true);
  });

  it("returns false for image/svg+xml (intentionally excluded)", () => {
    expect(isAllowedMimeType("image/svg+xml")).toBe(false);
  });

  it("returns false for application/pdf", () => {
    expect(isAllowedMimeType("application/pdf")).toBe(false);
  });

  it("returns false for text/html", () => {
    expect(isAllowedMimeType("text/html")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isAllowedMimeType("")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ensureUploadDir
// ---------------------------------------------------------------------------
describe("ensureUploadDir", () => {
  it("calls fs.mkdir with the default upload dir and recursive: true", async () => {
    mockMkdir.mockResolvedValueOnce(undefined);
    await ensureUploadDir();
    expect(mockMkdir).toHaveBeenCalledWith("./uploads", { recursive: true });
  });

  it("uses UPLOAD_DIR env var when set", async () => {
    process.env.UPLOAD_DIR = "/custom/uploads";
    mockMkdir.mockResolvedValueOnce(undefined);
    await ensureUploadDir();
    expect(mockMkdir).toHaveBeenCalledWith("/custom/uploads", { recursive: true });
  });
});

// ---------------------------------------------------------------------------
// saveUploadedFile
// ---------------------------------------------------------------------------
describe("saveUploadedFile", () => {
  it("saves the buffer to the upload directory and returns the public URL", async () => {
    mockMkdir.mockResolvedValueOnce(undefined);
    mockWriteFile.mockResolvedValueOnce(undefined);

    const buffer = Buffer.from("fake image data");
    const url = await saveUploadedFile(buffer, "test-file.jpg");

    expect(url).toBe("/uploads/test-file.jpg");
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("test-file.jpg"),
      buffer
    );
  });

  it("calls ensureUploadDir (mkdir) before writing the file", async () => {
    mockMkdir.mockResolvedValueOnce(undefined);
    mockWriteFile.mockResolvedValueOnce(undefined);

    await saveUploadedFile(Buffer.from("data"), "image.png");

    expect(mockMkdir).toHaveBeenCalledOnce();
    expect(mockWriteFile).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// deleteUploadedFile
// ---------------------------------------------------------------------------
describe("deleteUploadedFile", () => {
  it("unlinks the file when the URL path starts with /uploads/", async () => {
    mockUnlink.mockResolvedValueOnce(undefined);
    await deleteUploadedFile("/uploads/test-file.jpg");
    expect(mockUnlink).toHaveBeenCalledOnce();
    const [calledPath] = mockUnlink.mock.calls[0] as [string];
    expect(calledPath).toContain("test-file.jpg");
  });

  it("does nothing when the URL path does not start with /uploads/", async () => {
    await deleteUploadedFile("/other/path/file.jpg");
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it("does nothing for an empty string", async () => {
    await deleteUploadedFile("");
    expect(mockUnlink).not.toHaveBeenCalled();
  });

  it("silently ignores ENOENT when the file does not exist", async () => {
    mockUnlink.mockRejectedValueOnce(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
    await expect(deleteUploadedFile("/uploads/missing.jpg")).resolves.toBeUndefined();
  });

  it("silently ignores any unlink error", async () => {
    mockUnlink.mockRejectedValueOnce(new Error("Permission denied"));
    await expect(deleteUploadedFile("/uploads/locked.jpg")).resolves.toBeUndefined();
  });

  it("prevents path traversal via path.basename sanitization", async () => {
    mockUnlink.mockResolvedValueOnce(undefined);
    await deleteUploadedFile("/uploads/../../../etc/passwd");
    const [calledPath] = mockUnlink.mock.calls[0] as [string];
    // Should resolve to just "passwd" inside the upload dir, not escape it
    expect(calledPath).not.toMatch(/\.\./);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
describe("MIME_TO_EXT", () => {
  it("maps image/jpeg to jpg", () => {
    expect(MIME_TO_EXT["image/jpeg"]).toBe("jpg");
  });

  it("maps image/png to png", () => {
    expect(MIME_TO_EXT["image/png"]).toBe("png");
  });

  it("maps image/webp to webp", () => {
    expect(MIME_TO_EXT["image/webp"]).toBe("webp");
  });

  it("maps image/gif to gif", () => {
    expect(MIME_TO_EXT["image/gif"]).toBe("gif");
  });

  it("has an extension for every allowed MIME type", () => {
    for (const mime of ALLOWED_MIME_TYPES) {
      expect(MIME_TO_EXT[mime]).toBeDefined();
    }
  });
});
