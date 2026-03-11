import type { APIRoute } from "astro";
import { 
  isAllowedMimeType, 
  saveUploadedFile, 
  sanitizeFilename,
  getMaxSizeBytes
} from "@/lib/upload";

export const POST: APIRoute = async ({ request, locals }) => {
  // Check auth
  if (!locals.user || locals.user.role !== 'ADMIN') {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
    }

    // Validate size
    if (file.size > getMaxSizeBytes()) {
      return new Response(JSON.stringify({ error: "File too large" }), { status: 400 });
    }

    // Validate type
    if (!isAllowedMimeType(file.type)) {
      return new Response(JSON.stringify({ error: "Invalid file type" }), { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeFilename = sanitizeFilename(file.name);
    
    const url = await saveUploadedFile(buffer, safeFilename, file.type);

    return new Response(JSON.stringify({ url }), { status: 200 });
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(JSON.stringify({ error: "Upload failed" }), { status: 500 });
  }
};
