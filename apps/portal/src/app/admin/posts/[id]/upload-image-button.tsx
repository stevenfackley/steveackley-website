"use client";

import { useId, useRef, useState, type ChangeEvent } from "react";
import {
  IMAGE_UPLOAD_ACCEPT_ATTRIBUTE,
  uploadImageFile,
} from "@shared/lib/upload-client";

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
      onUpload(await uploadImageFile(file));
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
        accept={IMAGE_UPLOAD_ACCEPT_ATTRIBUTE}
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
