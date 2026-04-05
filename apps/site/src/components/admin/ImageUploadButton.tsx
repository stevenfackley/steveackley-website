"use client";
import { useRef, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { useFileUpload } from "@/hooks/useFileUpload";
interface Props { onUpload: (url: string) => void; }
export function ImageUploadButton({ onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { clearError, error, uploadFile, uploading } = useFileUpload();
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      clearError();
      const url = await uploadFile(file);
      if (url) {
        onUpload(url);
      }
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return (
    <div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFile} />
      <Button type="button" variant="secondary" size="sm" isLoading={uploading} onClick={() => inputRef.current?.click()}>
        Upload Image
      </Button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
