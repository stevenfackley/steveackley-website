"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";

type UploadImageButtonProps = {
  onUpload: (url: string) => void;
};

export function UploadImageButton({ onUpload }: UploadImageButtonProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { error?: string; url?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Upload failed");
      }

      onUpload(payload.url);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="portal-upload-field">
      <input
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="portal-hidden-input"
        id={inputId}
        onChange={handleChange}
        ref={inputRef}
        type="file"
      />
      <label className="portal-secondary-button" htmlFor={inputId}>
        {uploading ? "Uploading..." : "Upload Image"}
      </label>
      {error ? <p className="portal-inline-error">{error}</p> : null}
    </div>
  );
}
