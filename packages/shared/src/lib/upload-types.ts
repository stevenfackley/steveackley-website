/**
 * Image upload allowlist shared by the server (./upload) and the browser
 * picker (./upload-client). This file is browser-safe: no node or S3 imports.
 */

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
