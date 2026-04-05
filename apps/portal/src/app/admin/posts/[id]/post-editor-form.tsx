"use client";

import { useActionState, useState } from "react";
import { RichTextEditor } from "./rich-text-editor";
import { UploadImageButton } from "./upload-image-button";

export type PostEditorFormState = {
  error: string | null;
};

type PostEditorFormProps = {
  action: (
    state: PostEditorFormState,
    formData: FormData,
  ) => Promise<PostEditorFormState>;
  initialPost: {
    title: string;
    content: string;
    excerpt: string | null;
    coverImage: string | null;
    published: boolean;
    scheduledAt: string;
  };
};

const initialState: PostEditorFormState = {
  error: null,
};

export function PostEditorForm({
  action,
  initialPost,
}: PostEditorFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [title, setTitle] = useState(initialPost.title);
  const [content, setContent] = useState(initialPost.content);
  const [excerpt, setExcerpt] = useState(initialPost.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(initialPost.coverImage ?? "");
  const [published, setPublished] = useState(initialPost.published);
  const [scheduledAt, setScheduledAt] = useState(initialPost.scheduledAt);

  return (
    <form action={formAction} className="portal-form-grid">
      <div className="portal-form-main">
        <label className="portal-field">
          <span>Title</span>
          <input
            className="portal-input"
            name="title"
            placeholder="Post title..."
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <div className="portal-field">
          <span>Content</span>
          <input type="hidden" name="content" value={content} />
          <RichTextEditor value={content} onChange={setContent} />
        </div>

        <label className="portal-field">
          <span>Excerpt</span>
          <textarea
            className="portal-input portal-textarea"
            name="excerpt"
            placeholder="Brief summary of the post..."
            rows={4}
            value={excerpt}
            onChange={(event) => setExcerpt(event.target.value)}
          />
        </label>
      </div>

      <aside className="portal-form-aside">
        <section className="portal-aside-card">
          <h3 className="portal-aside-title">Publish Settings</h3>
          <input type="hidden" name="published" value={String(published)} />
          <button
            type="button"
            className={`portal-toggle${published ? " is-active" : ""}`}
            onClick={() => setPublished((current) => !current)}
          >
            <span className="portal-toggle-track">
              <span className="portal-toggle-thumb" />
            </span>
            <span>{published ? "Published" : "Draft"}</span>
          </button>

          <label className="portal-field">
            <span>Schedule Publish</span>
            <input
              className="portal-input"
              name="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </label>
        </section>

        <section className="portal-aside-card">
          <h3 className="portal-aside-title">Cover Image</h3>
          <input type="hidden" name="coverImage" value={coverImage} />
          {coverImage ? (
            <div className="portal-image-preview">
              <img
                alt="Post cover"
                className="portal-image-preview-media"
                src={coverImage}
              />
              <button
                className="portal-inline-button"
                type="button"
                onClick={() => setCoverImage("")}
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="portal-image-empty">No cover image selected.</div>
          )}

          <UploadImageButton onUpload={setCoverImage} />
        </section>
      </aside>

      {state.error ? (
        <div className="portal-error-banner">{state.error}</div>
      ) : null}

      <div className="portal-form-actions">
        <button className="portal-primary-button" disabled={isPending} type="submit">
          {isPending ? "Saving..." : published ? "Save & Publish" : "Save Draft"}
        </button>
        <a className="portal-secondary-button" href="/admin/posts">
          Cancel
        </a>
      </div>
    </form>
  );
}
