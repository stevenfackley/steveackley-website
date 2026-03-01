/**
 * Integration tests for GET /api/uploads/[...path]
 *
 * fs/promises and upload helpers are mocked so no real filesystem access occurs.
 * All security-sensitive paths (traversal, dotfiles, unknown types) are tested.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock fs/promises ──────────────────────────────────────────────────────────
vi.mock("fs/promises", () => ({
  default: {
    readFile: vi.fn(),
  },
}));

// ── Mock upload helpers ───────────────────────────────────────────────────────
vi.mock("@/lib/upload", () => ({
  getUploadDir: vi.fn(() => "./uploads"),
  isAllowedMimeType: vi.fn((mime: string) =>
    ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime)
  ),
  MIME_TO_EXT: {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  },
}));

import fs from "fs/promises";
import { GET } from "@/app/api/uploads/[...path]/route";

const mockReadFile = fs.readFile as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeContext(pathSegments: string[]) {
  return { params: Promise.resolve({ path: pathSegments }) };
}

function makeRequest(segments: string[]) {
  return new NextRequest(
    `http://localhost/api/uploads/${segments.join("/")}`
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("GET /api/uploads/[...path]", () => {
  // ── Path validation ─────────────────────────────────────────────────────
  it("returns 404 when path segments are empty", async () => {
    const res = await GET(makeRequest([]), makeContext([]));
    expect(res.status).toBe(404);
  });

  it("returns 404 when there are multiple path segments (subdirectory traversal)", async () => {
    const res = await GET(makeRequest(["subdir", "file.jpg"]), makeContext(["subdir", "file.jpg"]));
    expect(res.status).toBe(404);
  });

  it("returns 404 for a dotfile (.htaccess)", async () => {
    const res = await GET(makeRequest([".htaccess"]), makeContext([".htaccess"]));
    expect(res.status).toBe(404);
  });

  it("returns 404 for a double-dot traversal segment (..)", async () => {
    const res = await GET(makeRequest([".."]), makeContext([".."]));
    expect(res.status).toBe(404);
  });

  it("returns 404 for a hidden file starting with dot (.env)", async () => {
    const res = await GET(makeRequest([".env"]), makeContext([".env"]));
    expect(res.status).toBe(404);
  });

  // ── MIME / extension validation ─────────────────────────────────────────
  it("returns 403 for an unknown file extension (.exe)", async () => {
    const res = await GET(makeRequest(["malware.exe"]), makeContext(["malware.exe"]));
    expect(res.status).toBe(403);
  });

  it("returns 403 for a .php file", async () => {
    const res = await GET(makeRequest(["shell.php"]), makeContext(["shell.php"]));
    expect(res.status).toBe(403);
  });

  it("returns 403 for a file with no extension", async () => {
    const res = await GET(makeRequest(["noextension"]), makeContext(["noextension"]));
    expect(res.status).toBe(403);
  });

  it("returns 403 when isAllowedMimeType returns false for a known extension", async () => {
    const { isAllowedMimeType } = await import("@/lib/upload");
    (isAllowedMimeType as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    // NOTE: do NOT set up mockReadFile here — the route returns 403 before
    // calling fs.readFile, so setting it up would leave a leaked unconsumed mock
    // that would corrupt subsequent test expectations.
    const res = await GET(makeRequest(["photo.jpg"]), makeContext(["photo.jpg"]));
    expect(res.status).toBe(403);
  });

  // ── Successful file serving ──────────────────────────────────────────────
  it("returns 200 with image/jpeg for a .jpg file", async () => {
    mockReadFile.mockResolvedValueOnce(Buffer.from("fake jpeg data"));
    const res = await GET(makeRequest(["photo.jpg"]), makeContext(["photo.jpg"]));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns 200 with image/jpeg for a .jpeg file", async () => {
    mockReadFile.mockResolvedValueOnce(Buffer.from("fake jpeg data"));
    const res = await GET(makeRequest(["photo.jpeg"]), makeContext(["photo.jpeg"]));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("returns 200 with image/png for a .png file", async () => {
    mockReadFile.mockResolvedValueOnce(Buffer.from("fake png data"));
    const res = await GET(makeRequest(["image.png"]), makeContext(["image.png"]));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
  });

  it("returns 200 with image/webp for a .webp file", async () => {
    mockReadFile.mockResolvedValueOnce(Buffer.from("fake webp data"));
    const res = await GET(makeRequest(["image.webp"]), makeContext(["image.webp"]));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/webp");
  });

  it("returns 200 with image/gif for a .gif file", async () => {
    mockReadFile.mockResolvedValueOnce(Buffer.from("fake gif data"));
    const res = await GET(makeRequest(["anim.gif"]), makeContext(["anim.gif"]));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/gif");
  });

  it("returns 404 when the file does not exist on disk", async () => {
    mockReadFile.mockRejectedValueOnce(
      Object.assign(new Error("ENOENT: no such file or directory"), { code: "ENOENT" })
    );
    const res = await GET(makeRequest(["missing.jpg"]), makeContext(["missing.jpg"]));
    expect(res.status).toBe(404);
  });

  // ── Security headers ─────────────────────────────────────────────────────
  it("sets Cache-Control: public, immutable on successful response", async () => {
    mockReadFile.mockResolvedValueOnce(Buffer.from("data"));
    const res = await GET(makeRequest(["photo.jpg"]), makeContext(["photo.jpg"]));
    const cc = res.headers.get("Cache-Control") ?? "";
    expect(cc).toContain("public");
    expect(cc).toContain("immutable");
  });

  it("sets X-Content-Type-Options: nosniff on successful response", async () => {
    mockReadFile.mockResolvedValueOnce(Buffer.from("data"));
    const res = await GET(makeRequest(["photo.jpg"]), makeContext(["photo.jpg"]));
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets Content-Disposition: inline on successful response", async () => {
    mockReadFile.mockResolvedValueOnce(Buffer.from("data"));
    const res = await GET(makeRequest(["photo.jpg"]), makeContext(["photo.jpg"]));
    expect(res.headers.get("Content-Disposition")).toBe("inline");
  });
});
