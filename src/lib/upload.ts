import { randomUUID } from "crypto";
import path from "path";
import fs from "fs/promises";

// Allowlisted MIME types — SVG intentionally excluded (XSS risk)
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export const MIME_TO_EXT: Record<AllowedMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Returns the upload directory path from env, defaulting to ./uploads.
 */
export function getUploadDir(): string {
  return process.env.UPLOAD_DIR ?? "./uploads";
}

/**
 * Returns the maximum file size in bytes from env, defaulting to 5MB.
 */
export function getMaxSizeBytes(): number {
  const mb = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? "5", 10);
  return mb * 1024 * 1024;
}

/**
 * Sanitize an original filename to prevent path traversal and injection.
 * Strips directory components, normalizes characters, prefixes with UUID.
 */
export function sanitizeFilename(originalName: string): string {
  // Extract only the basename — prevent path traversal
  const basename = path.basename(originalName);

  // Allow only alphanumeric characters, dots, hyphens, and underscores
  const safeName = basename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);

  // Prefix with UUID for uniqueness and unpredictability
  const uuid = randomUUID();
  return `${uuid}-${safeName}`;
}

/**
 * Returns true if the MIME type is in the allowed list.
 */
export function isAllowedMimeType(mime: string): mime is AllowedMimeType {
  return ALLOWED_MIME_TYPES.includes(mime as AllowedMimeType);
}

/**
 * Ensure the upload directory exists, creating it if necessary.
 */
export async function ensureUploadDir(): Promise<void> {
  const uploadDir = getUploadDir();
  await fs.mkdir(uploadDir, { recursive: true });
}

/**
 * Save a file buffer to the uploads directory.
 * Returns the public URL path (e.g., /uploads/uuid-filename.jpg).
 */
export async function saveUploadedFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  await ensureUploadDir();
  const uploadDir = getUploadDir();
  const filePath = path.join(uploadDir, filename);
  await fs.writeFile(filePath, buffer);
  return `/uploads/${filename}`;
}

/**
 * Delete an uploaded file by its URL path.
 * e.g., /uploads/uuid-file.jpg → removes from filesystem.
 * Silently ignores if file does not exist.
 */
export async function deleteUploadedFile(urlPath: string): Promise<void> {
  if (!urlPath.startsWith("/uploads/")) return;
  const filename = urlPath.replace("/uploads/", "");

  // Prevent path traversal
  const safeName = path.basename(filename);
  const uploadDir = getUploadDir();
  const filePath = path.join(uploadDir, safeName);

  try {
    await fs.unlink(filePath);
  } catch {
    // File may already be gone — that's fine
  }
}
