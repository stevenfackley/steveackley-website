import { auth } from "@/lib/auth";
import {
  isAllowedMimeType,
  sanitizeFilename,
  getMaxSizeBytes,
  saveUploadedFile,
  MIME_TO_EXT,
} from "@/lib/upload";

export const runtime = "nodejs"; // Required for filesystem access

/**
 * POST /api/upload
 *
 * Accepts multipart/form-data with a "file" field.
 * Validates MIME type and file size, saves to the uploads volume.
 * Returns { url: string } with the public path to the uploaded image.
 *
 * Authentication required (admin only).
 */
export async function POST(request: Request) {
  // 1. Verify authentication
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse multipart form data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid multipart data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json(
      { error: "No file provided — use field name 'file'" },
      { status: 400 }
    );
  }

  // 3. Validate MIME type (allowlist)
  if (!isAllowedMimeType(file.type)) {
    return Response.json(
      {
        error: `File type '${file.type}' is not allowed. Allowed types: JPEG, PNG, WebP, GIF`,
      },
      { status: 400 }
    );
  }

  // 4. Validate file size
  const maxBytes = getMaxSizeBytes();
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return Response.json(
      { error: `File too large. Maximum size is ${maxMb}MB` },
      { status: 413 }
    );
  }

  // 5. Generate safe filename with correct extension
  const ext = MIME_TO_EXT[file.type as keyof typeof MIME_TO_EXT];
  const originalName = file.name || `upload.${ext}`;
  const safeFilename = sanitizeFilename(originalName);

  // 6. Ensure the filename ends with the correct extension
  const finalFilename = safeFilename.endsWith(`.${ext}`)
    ? safeFilename
    : `${safeFilename}.${ext}`;

  // 7. Read file into buffer and save to volume
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await saveUploadedFile(buffer, finalFilename);

    return Response.json({ url }, { status: 200 });
  } catch (err) {
    console.error("[upload] Failed to save file:", err);
    return Response.json(
      { error: "Failed to save file. Please try again." },
      { status: 500 }
    );
  }
}
