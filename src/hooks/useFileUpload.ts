"use client";

import { useState } from "react";
import { uploadImageFile } from "@/lib/upload-client";

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File): Promise<string | null> {
    setError(null);
    setUploading(true);

    try {
      return await uploadImageFile(file);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      return null;
    } finally {
      setUploading(false);
    }
  }

  function clearError() {
    setError(null);
  }

  return {
    clearError,
    error,
    uploadFile,
    uploading,
  };
}
