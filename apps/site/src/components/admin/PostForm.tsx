"use client";
import { useState, useTransition, useEffect, lazy, Suspense } from "react";
import { actions } from "astro:actions";
import { ImageUploadButton } from "./ImageUploadButton";
import { Button } from "@/components/ui/button";
import { POST_STATUS_LABEL, postStatus } from "@/lib/post-status";

const SUBMIT_LABEL = { published: "Save & Publish", scheduled: "Save & Schedule", draft: "Save Draft" } as const;

// PostEditor is dynamic to avoid SSR issues with Tiptap
const PostEditor = lazy(() => import("./PostEditor").then(m => ({ default: m.PostEditor })));

/** A Date as a datetime-local value ("YYYY-MM-DDTHH:mm") in the browser's zone. */
function toLocalDateTimeInput(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

interface Props {
  mode: "create" | "update";
  postId?: string;
  defaultValues?: {
    title?: string;
    content?: string;
    excerpt?: string | null;
    coverImage?: string | null;
    category?: string | null;
    tags?: string[] | null;
    published?: boolean;
    scheduledAt?: Date | null;
  };
  /**
   * Whether anything on this server publishes a scheduled post (lib/scheduler.ts).
   * When it is false the form says so instead of promising a publish time.
   */
  schedulerEnabled?: boolean;
}

export function PostForm({ mode, postId, defaultValues = {}, schedulerEnabled = true }: Props) {
  const [title, setTitle]         = useState(defaultValues.title       ?? "");
  const [content, setContent]     = useState(defaultValues.content     ?? "");
  const [excerpt, setExcerpt]     = useState(defaultValues.excerpt     ?? "");
  const [coverImage, setCoverImage] = useState(defaultValues.coverImage ?? "");
  const [category, setCategory]   = useState(defaultValues.category    ?? "");
  const [tags, setTags]           = useState((defaultValues.tags ?? []).join(", "));
  const [published, setPublished] = useState(defaultValues.published   ?? false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError]         = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // datetime-local carries no timezone, so show the stored instant in the
  // admin's own zone. Filled after mount: the server render runs in the
  // server's zone, not the browser's.
  useEffect(() => {
    if (defaultValues.scheduledAt) {
      setScheduledAt(toLocalDateTimeInput(new Date(defaultValues.scheduledAt)));
    }
  }, []);

  // What saving the form as it stands will do. Before mount the schedule field
  // is still empty (it is filled above, in the browser's zone), so the first
  // render reads the stored time.
  const scheduleForStatus = isMounted ? scheduledAt : defaultValues.scheduledAt ?? null;
  const status = postStatus({ published, scheduledAt: scheduleForStatus || null });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("title",       title);
      fd.set("content",     content);
      fd.set("excerpt",     excerpt);
      fd.set("coverImage",  coverImage);
      fd.set("category",    category);
      fd.set("tags",        tags);
      fd.set("published",   String(published));
      // Send an absolute instant; the server would read a bare local time in its own zone.
      fd.set("scheduledAt", scheduledAt ? new Date(scheduledAt).toISOString() : "");

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
            <label htmlFor="post-title" className={lbl}>Title *</label>
            <input
              id="post-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className={inp}
              placeholder="Post title..."
            />
          </div>
          <div>
            <label id="post-content-label" className={lbl}>Content *</label>
            {isMounted && (
              <Suspense fallback={<div className="h-64 rounded-xl border border-[var(--border)] bg-[var(--background)] animate-pulse" />}>
                <PostEditor value={content} onChange={setContent} ariaLabelledBy="post-content-label" />
              </Suspense>
            )}
          </div>
          <div>
            <label htmlFor="post-excerpt" className={lbl}>
              Excerpt <span className="text-[var(--text-muted)]">(auto-generated if empty)</span>
            </label>
            <textarea
              id="post-excerpt"
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
            <button
              type="button"
              role="switch"
              aria-checked={published}
              aria-label="Published"
              aria-describedby="post-status-text"
              onClick={() => setPublished(!published)}
              className="flex items-center gap-3 cursor-pointer border-0 bg-transparent p-0 text-left"
            >
              <span
                className={`relative block h-5 w-9 rounded-full transition-colors ${published ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${published ? "translate-x-4" : "translate-x-0.5"}`} />
              </span>
              <span id="post-status-text" className="text-sm text-[var(--text-secondary)]">{POST_STATUS_LABEL[status]}</span>
            </button>

            <div>
              <label htmlFor="post-scheduledAt" className={lbl}>Schedule Publish</label>
              <input
                id="post-scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className={inp}
              />
              {scheduledAt && status === "scheduled" && (
                <p className="text-xs text-[var(--text-muted)] mt-1.5">
                  {!schedulerEnabled
                    ? "Scheduled publishing is switched off on this server, so this post will not be published automatically."
                    : new Date(scheduledAt).getTime() <= Date.now()
                      ? "This time has passed. The post is published when the scheduler next runs."
                      : `Will auto-publish on ${new Date(scheduledAt).toLocaleString()}`}
                </p>
              )}
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Metadata</h3>
            <div>
              <label htmlFor="post-category" className={lbl}>Category</label>
              <input
                id="post-category"
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inp}
                placeholder="e.g. Engineering"
              />
            </div>
            <div>
              <label htmlFor="post-tags" className={lbl}>
                Tags <span className="text-[var(--text-muted)]">(comma-separated)</span>
              </label>
              <input
                id="post-tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className={inp}
                placeholder="dotnet, azure, architecture"
              />
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
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" variant="default" disabled={isPending}>
          {SUBMIT_LABEL[status]}
        </Button>
        <Button type="button" variant="secondary" onClick={() => window.history.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
