import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Use vi.hoisted to ensure the mock function is available during module evaluation
const { mockSend } = vi.hoisted(() => {
  return { mockSend: vi.fn() };
});

vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: class {
      constructor(public input: any) {}
    },
    DeleteObjectCommand: class {
      constructor(public input: any) {}
    },
  };
});

import { 
  getMaxSizeBytes, 
  sanitizeFilename, 
  isAllowedMimeType, 
  saveUploadedFile, 
  deleteUploadedFile,
  ALLOWED_MIME_TYPES,
  MIME_TO_EXT
} from "../../lib/upload";

describe("upload utilities (R2)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Set required env vars for tests
    process.env.R2_BUCKET = "test-bucket";
    process.env.R2_PUBLIC_URL = "https://pub.test.dev";
    mockSend.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getMaxSizeBytes", () => {
    it("returns 5MB (in bytes) by default", () => {
      delete process.env.MAX_UPLOAD_SIZE_MB;
      expect(getMaxSizeBytes()).toBe(5 * 1024 * 1024);
    });

    it("uses MAX_UPLOAD_SIZE_MB env var when set", () => {
      process.env.MAX_UPLOAD_SIZE_MB = "10";
      expect(getMaxSizeBytes()).toBe(10 * 1024 * 1024);
    });
  });

  describe("sanitizeFilename", () => {
    it("prefixes with a UUID and removes path traversal characters", () => {
      const result = sanitizeFilename("../../../secret.txt");
      expect(result).toMatch(/^[a-f0-9-]{36}-secret.txt$/);
    });

    it("replaces special characters with underscores", () => {
      const result = sanitizeFilename("hello world! @#$%^&*().png");
      // Current regex replace(/[^a-zA-Z0-9._-]/g, "_") results in underscores
      expect(result).toMatch(/^[a-f0-9-]{36}-hello_world___________.png$/);
    });
  });

  describe("isAllowedMimeType", () => {
    it("returns true for allowed types", () => {
      ALLOWED_MIME_TYPES.forEach(type => {
        expect(isAllowedMimeType(type)).toBe(true);
      });
    });

    it("returns false for disallowed types", () => {
      expect(isAllowedMimeType("image/svg+xml")).toBe(false);
      expect(isAllowedMimeType("application/pdf")).toBe(false);
      expect(isAllowedMimeType("text/plain")).toBe(false);
    });
  });

  describe("saveUploadedFile", () => {
    it("throws if R2_BUCKET is not configured", async () => {
      delete process.env.R2_BUCKET;
      const buffer = Buffer.from("test");
      await expect(saveUploadedFile(buffer, "test.jpg", "image/jpeg")).rejects.toThrow("R2_BUCKET not configured");
    });

    it("sends PutObjectCommand to S3 and returns the public URL", async () => {
      mockSend.mockResolvedValueOnce({});
      const buffer = Buffer.from("fake-image-data");
      const filename = "unique-uuid-test.jpg";
      
      const url = await saveUploadedFile(buffer, filename, "image/jpeg");
      
      expect(mockSend).toHaveBeenCalled();
      const command = mockSend.mock.calls[0][0];
      expect(command.input.Bucket).toBe("test-bucket");
      expect(command.input.Key).toBe(filename);
      expect(url).toBe(`https://pub.test.dev/${filename}`);
    });
  });

  describe("deleteUploadedFile", () => {
    it("sends DeleteObjectCommand to S3", async () => {
      mockSend.mockResolvedValueOnce({});
      await deleteUploadedFile("https://pub.test.dev/my-image.jpg");
      
      expect(mockSend).toHaveBeenCalled();
      const command = mockSend.mock.calls[0][0];
      expect(command.input.Bucket).toBe("test-bucket");
      expect(command.input.Key).toBe("my-image.jpg");
    });

    it("handles full URLs and path-only strings", async () => {
      mockSend.mockResolvedValue({}).mockClear();
      
      await deleteUploadedFile("some-image.png");
      const command = mockSend.mock.calls[0][0];
      expect(command.input.Key).toBe("some-image.png");
    });

    it("silently ignores if R2_BUCKET is missing", async () => {
      delete process.env.R2_BUCKET;
      await deleteUploadedFile("test.jpg");
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe("MIME_TO_EXT", () => {
    it("maps standard types to extensions", () => {
      expect(MIME_TO_EXT["image/jpeg"]).toBe("jpg");
      expect(MIME_TO_EXT["image/png"]).toBe("png");
      expect(MIME_TO_EXT["image/webp"]).toBe("webp");
    });
  });
});
