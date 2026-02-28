import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getUploadDir, isAllowedMimeType, MIME_TO_EXT } from "@/lib/upload";

export const runtime = "nodejs"; // Required for filesystem access

// Map extensions to MIME types for serving
const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * GET /api/uploads/[...path]
 *
 * Serves uploaded images from the Docker volume (UPLOAD_DIR).
 * Rewrites from /uploads/* hit this handler via next.config.ts rewrites.
 *
 * Security:
 * - Only serves files from the configured UPLOAD_DIR
 * - Path traversal is prevented via path.basename()
 * - Only serves known image MIME types
 * - Sets nosniff and cache headers
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;

  // Allow only single filename segments — no subdirectory traversal
  if (!pathSegments || pathSegments.length !== 1) {
    return new Response("Not Found", { status: 404 });
  }

  // Sanitize: extract only the basename, no path components
  const filename = path.basename(pathSegments[0]);
  if (!filename || filename.startsWith(".")) {
    return new Response("Not Found", { status: 404 });
  }

  // Determine MIME type from extension
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = EXT_TO_MIME[ext];
  if (!mimeType || !isAllowedMimeType(mimeType)) {
    return new Response("Forbidden", { status: 403 });
  }

  // Build the full file path within the upload directory
  const uploadDir = getUploadDir();
  const filePath = path.join(uploadDir, filename);

  // Read the file
  try {
    const buffer = await fs.readFile(filePath);
    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

// Suppress unused import warning
void MIME_TO_EXT;
