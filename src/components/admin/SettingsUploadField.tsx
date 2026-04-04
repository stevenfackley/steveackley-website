"use client";
import { useRef, useState, type ChangeEvent } from "react";
import { useFileUpload } from "@/hooks/useFileUpload";

interface Props {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
}

export function SettingsUploadField({ name, defaultValue = '', placeholder, label }: Props) {
  const [url, setUrl] = useState(defaultValue);
  const fileRef = useRef<HTMLInputElement>(null);
  const { clearError, error, uploadFile, uploading } = useFileUpload();

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      clearError();
      const uploadedUrl = await uploadFile(file);
      if (uploadedUrl) {
        setUrl(uploadedUrl);
      }
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        {/* Hidden real field submitted with the form */}
        <input type="hidden" name={name} value={url} />
        {/* Visible URL input (display + manual edit) */}
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={placeholder ?? "https://..."}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors"
        />
        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFile}
        />
        {/* Upload trigger button */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] px-3 py-2.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {uploading ? (
            <>
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading…
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload
            </>
          )}
        </button>
      </div>
      {url && (
        <div className="mt-2 flex items-center gap-2">
          <img
            src={url}
            alt="Preview"
            className="h-10 w-10 rounded-lg object-cover ring-1 ring-[var(--border)] shrink-0"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <span className="text-xs text-[var(--text-muted)] truncate">{url}</span>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
