import type { UploadResponse } from "@/types";

interface ErrorResponse {
  error?: string;
}

function isUploadResponse(value: unknown): value is UploadResponse {
  return typeof value === "object" && value !== null && "url" in value && typeof value.url === "string";
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  return typeof value === "object" && value !== null && (!("error" in value) || typeof value.error === "string");
}

export async function uploadImageFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  const payload: unknown = await response.json();

  if (!response.ok) {
    const message =
      isErrorResponse(payload) && payload.error
        ? payload.error
        : "Upload failed";
    throw new Error(message);
  }

  if (!isUploadResponse(payload)) {
    throw new Error("Upload returned an invalid response");
  }

  return payload.url;
}
