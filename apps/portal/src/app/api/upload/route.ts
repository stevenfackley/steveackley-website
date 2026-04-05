import {
  getMaxSizeBytes,
  isAllowedMimeType,
  sanitizeFilename,
  saveUploadedFile,
} from "@shared/index";
import { getSessionFromHeaders } from "@/lib/admin-session";

export async function POST(request: Request) {
  const session = await getSessionFromHeaders(request.headers);

  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > getMaxSizeBytes()) {
      return Response.json({ error: "File too large" }, { status: 400 });
    }

    if (!isAllowedMimeType(file.type)) {
      return Response.json({ error: "Invalid file type" }, { status: 400 });
    }

    const safeFilename = sanitizeFilename(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await saveUploadedFile(buffer, safeFilename, file.type);

    return Response.json({ url });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
