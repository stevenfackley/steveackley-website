"use client";
import { useState, useTransition, useEffect, lazy, Suspense } from "react";
import { actions } from "astro:actions";
import { ImageUploadButton } from "./ImageUploadButton";
import { Button } from "@/components/ui/button";

// PostEditor is dynamic to avoid SSR issues with Tiptap
const PostEditor = lazy(() => import("./PostEditor").then(m => ({ default: m.PostEditor })));

interface Props {
  mode: "create" | "update";
  postId?: string;
  defaultValues?: {
    title?: string;
    content?: string;
    excerpt?: string | null;
    coverImage?: string | null;
    published?: boolean;
    scheduledAt?: Date | null;
  };
}

export function PostForm({ mode, postId, defaultValues = {} }: Props) {
  const [title, setTitle]         = useState(defaultValues.title       ?? "");
  const [content, setContent]     = useState(defaultValues.content     ?? "");
  const [excerpt, setExcerpt]     = useState(defaultValues.excerpt     ?? "");
  const [coverImage, setCoverImage] = useState(defaultValues.coverImage ?? "");
  const [published, setPublished] = useState(defaultValues.published   ?? false);
  const [scheduledAt, setScheduledAt] = useState(
    defaultValues.scheduledAt 
      ? new Date(defaultValues.scheduledAt).toISOString().slice(0, 16)
      : ""
  );
  const [error, setError]         = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("title",       title);
      fd.set("content",     content);
      fd.set("excerpt",     excerpt);
      fd.set("coverImage",  coverImage);
      fd.set("published",   String(published));
      fd.set("scheduledAt", scheduledAt);

      let result;
      if (mode === "update" && postId) {
        fd.set("id", postId);
        result = await actions.updatePost(fd);
      } else {
        result = await actions.createPost(fd);
      }

      if (result?.error) {
        setError(String(result.error));
      } else {
        window.location.href = "/admin/dashboard";
      }
    });
  };

  const lbl = "block text-sm font-medium text-[var(--text-secondary)] mb-1.5";
  const inp = "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <label className={lbl}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={inp}
              placeholder="Post title..."
            />
          </div>
          <div>
            <label className={lbl}>Content *</label>
            {isMounted && (
              <Suspense fallback={<div className="h-64 rounded-xl border border-[var(--border)] bg-[var(--background)] animate-pulse" />}>
                <PostEditor value={content} onChange={setContent} />
              </Suspense>
            )}
          </div>
          <div>
            <label className={lbl}>
              Excerpt <span className="text-[var(--text-muted)]">(auto-generated if empty)</span>
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              className={inp + " resize-none"}
              placeholder="Brief summary of the post..."
            />
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Publish Settings</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                className={`relative h-5 w-9 rounded-full transition-colors ${published ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
                onClick={() => setPublished(!published)}
              >
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${published ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-sm text-[var(--text-secondary)]">{published ? "Published" : "Draft"}</span>
            </label>

            <div>
              <label className={lbl}>Schedule Publish</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className={inp}
              />
              {scheduledAt && (
                <p className="text-xs text-[var(--text-muted)] mt-1.5">
                  Will auto-publish on {new Date(scheduledAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cover Image</h3>
            {coverImage && (
              <div className="relative h-32 rounded-xl overflow-hidden mb-3">
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => setCoverImage("")}
                  className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg hover:bg-black/70"
                >
                  Remove
                </button>
              </div>
            )}
            <ImageUploadButton onUpload={setCoverImage} />
            {coverImage && <input type="hidden" name="coverImage" value={coverImage} />}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" variant="default" disabled={isPending}>
          {published ? "Save & Publish" : "Save Draft"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => window.history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
