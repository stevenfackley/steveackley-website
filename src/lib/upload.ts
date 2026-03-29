import { randomUUID } from "crypto";
import path from "path";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Cloudflare R2 Config from Env (wrapped in functions to allow test overrides)
const getR2Config = () => ({
  ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  BUCKET: process.env.R2_BUCKET,
  PUBLIC_URL: process.env.R2_PUBLIC_URL,
});

const createS3Client = () => {
  const config = getR2Config();
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.ACCESS_KEY_ID || "",
      secretAccessKey: config.SECRET_ACCESS_KEY || "",
    },
  });
};

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
 * Save a file buffer to Cloudflare R2.
 * Returns the public URL of the uploaded object.
 */
export async function saveUploadedFile(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const config = getR2Config();
  if (!config.BUCKET) throw new Error("R2_BUCKET not configured");

  const s3 = createS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: config.BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // Ensure R2_PUBLIC_URL doesn't end with a slash for clean concatenation
  const baseUrl = config.PUBLIC_URL?.replace(/\/$/, "") || "";
  return `${baseUrl}/${filename}`;
}

/**
 * Delete an uploaded file by its URL path or full URL.
 * Silently ignores if deletion fails.
 */
export async function deleteUploadedFile(url: string): Promise<void> {
  const config = getR2Config();
  if (!config.BUCKET) return;

  // Extract key from URL
  const filename = url.split("/").pop();
  if (!filename) return;

  try {
    const s3 = createS3Client();
    await s3.send(
      new DeleteObjectCommand({
        Bucket: config.BUCKET,
        Key: filename,
      })
    );
  } catch {
    // Fail silently
  }
}
