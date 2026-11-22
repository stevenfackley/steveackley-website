import type { UploadResponse } from "../types/index";
import { ALLOWED_MIME_TYPES } from "./upload-types";

interface UploadErrorResponse {
  error?: string;
}

export const IMAGE_UPLOAD_ACCEPT = ALLOWED_MIME_TYPES;

export const IMAGE_UPLOAD_ACCEPT_ATTRIBUTE = IMAGE_UPLOAD_ACCEPT.join(",");

function isUploadResponse(value: unknown): value is UploadResponse {
  return typeof value === "object" && value !== null && "url" in value && typeof value.url === "string";
}

function isUploadErrorResponse(value: unknown): value is UploadErrorResponse {
  return typeof value === "object" && value !== null && (!("error" in value) || typeof value.error === "string");
}

export async function uploadImageFile(
  file: File,
  endpoint = "/api/upload",
): Promise<string> {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  const payload: unknown = await response.json();

  if (!response.ok) {
    const message =
      isUploadErrorResponse(payload) && payload.error
        ? payload.error
        : "Upload failed";
    throw new Error(message);
  }

  if (!isUploadResponse(payload)) {
    throw new Error("Upload returned an invalid response");
  }

  return payload.url;
}
