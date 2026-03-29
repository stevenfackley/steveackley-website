import { randomUUID } from 'crypto';
import path from 'path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
export { renderers } from '../../renderers.mjs';

const getR2Config = () => ({
  ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  BUCKET: process.env.R2_BUCKET,
  PUBLIC_URL: process.env.R2_PUBLIC_URL
});
const createS3Client = () => {
  const config = getR2Config();
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.ACCESS_KEY_ID || "",
      secretAccessKey: config.SECRET_ACCESS_KEY || ""
    }
  });
};
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
];
function getMaxSizeBytes() {
  const mb = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? "5", 10);
  return mb * 1024 * 1024;
}
function sanitizeFilename(originalName) {
  const basename = path.basename(originalName);
  const safeName = basename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  const uuid = randomUUID();
  return `${uuid}-${safeName}`;
}
function isAllowedMimeType(mime) {
  return ALLOWED_MIME_TYPES.includes(mime);
}
async function saveUploadedFile(buffer, filename, contentType) {
  const config = getR2Config();
  if (!config.BUCKET) throw new Error("R2_BUCKET not configured");
  const s3 = createS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: config.BUCKET,
      Key: filename,
      Body: buffer,
      ContentType: contentType
    })
  );
  const baseUrl = config.PUBLIC_URL?.replace(/\/$/, "") || "";
  return `${baseUrl}/${filename}`;
}

const POST = async ({ request, locals }) => {
  if (!locals.user || locals.user.role !== "ADMIN") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), { status: 400 });
    }
    if (file.size > getMaxSizeBytes()) {
      return new Response(JSON.stringify({ error: "File too large" }), { status: 400 });
    }
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

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
