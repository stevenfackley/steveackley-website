import { jsxs, jsx } from 'react/jsx-runtime';
import { useRef, useState, lazy, useTransition, useEffect, Suspense } from 'react';
import { B as Button } from './button_DeZP_JW1.mjs';

function ImageUploadButton({ onUpload }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onUpload(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsx("input", { ref: inputRef, type: "file", accept: "image/jpeg,image/png,image/webp,image/gif", className: "hidden", onChange: handleFile }),
    /* @__PURE__ */ jsx(Button, { type: "button", variant: "secondary", size: "sm", isLoading: uploading, onClick: () => inputRef.current?.click(), children: "Upload Image" }),
    error && /* @__PURE__ */ jsx("p", { className: "text-xs text-red-500 mt-1", children: error })
  ] });
}

const PostEditor = lazy(() => import('./PostEditor_CQ92ZcWT.mjs').then((m) => ({ default: m.PostEditor })));
function PostForm({ action, defaultValues = {} }) {
  const [title, setTitle] = useState(defaultValues.title ?? "");
  const [content, setContent] = useState(defaultValues.content ?? "");
  const [excerpt, setExcerpt] = useState(defaultValues.excerpt ?? "");
  const [coverImage, setCoverImage] = useState(defaultValues.coverImage ?? "");
  const [published, setPublished] = useState(defaultValues.published ?? false);
  const [error, setError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("title", title);
      fd.set("content", content);
      fd.set("excerpt", excerpt);
      fd.set("coverImage", coverImage);
      fd.set("published", String(published));
      const result = await action(fd);
      if (result && !result.success) {
        setError(result.error ?? "An error occurred");
      } else {
        window.location.href = "/admin/dashboard";
      }
    });
  };
  const lbl = "block text-sm font-medium text-[var(--text-secondary)] mb-1.5";
  const inp = "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors";
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "lg:col-span-2 space-y-5", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: lbl, children: "Title *" }),
          /* @__PURE__ */ jsx("input", { type: "text", value: title, onChange: (e) => setTitle(e.target.value), required: true, className: inp, placeholder: "Post title..." })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { className: lbl, children: "Content *" }),
          isMounted && /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx("div", { className: "h-64 rounded-xl border border-[var(--border)] bg-[var(--background)] animate-pulse" }), children: /* @__PURE__ */ jsx(PostEditor, { value: content, onChange: setContent }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { className: lbl, children: [
            "Excerpt ",
            /* @__PURE__ */ jsx("span", { className: "text-[var(--text-muted)]", children: "(auto-generated if empty)" })
          ] }),
          /* @__PURE__ */ jsx("textarea", { value: excerpt, onChange: (e) => setExcerpt(e.target.value), rows: 3, className: inp + " resize-none", placeholder: "Brief summary of the post..." })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-5", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold text-[var(--text-primary)]", children: "Publish Settings" }),
          /* @__PURE__ */ jsxs("label", { className: "flex items-center gap-3 cursor-pointer", children: [
            /* @__PURE__ */ jsx(
              "div",
              {
                className: `relative h-5 w-9 rounded-full transition-colors ${published ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`,
                onClick: () => setPublished(!published),
                children: /* @__PURE__ */ jsx("div", { className: `absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${published ? "translate-x-4" : "translate-x-0.5"}` })
              }
            ),
            /* @__PURE__ */ jsx("span", { className: "text-sm text-[var(--text-secondary)]", children: published ? "Published" : "Draft" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-3", children: [
          /* @__PURE__ */ jsx("h3", { className: "text-sm font-semibold text-[var(--text-primary)]", children: "Cover Image" }),
          coverImage && /* @__PURE__ */ jsxs("div", { className: "relative h-32 rounded-xl overflow-hidden mb-3", children: [
            /* @__PURE__ */ jsx("img", { src: coverImage, alt: "Cover", className: "w-full h-full object-cover" }),
            /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setCoverImage(""), className: "absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg hover:bg-black/70", children: "Remove" })
          ] }),
          /* @__PURE__ */ jsx(ImageUploadButton, { onUpload: setCoverImage }),
          coverImage && /* @__PURE__ */ jsx("input", { type: "hidden", name: "coverImage", value: coverImage })
        ] })
      ] })
    ] }),
    error && /* @__PURE__ */ jsx("div", { className: "rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-red-700 dark:text-red-300", children: error }) }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 pt-2", children: [
      /* @__PURE__ */ jsx(Button, { type: "submit", variant: "default", disabled: isPending, children: published ? "Save & Publish" : "Save Draft" }),
      /* @__PURE__ */ jsx(Button, { type: "button", variant: "secondary", onClick: () => window.history.back(), children: "Cancel" })
    ] })
  ] });
}

export { ImageUploadButton as I, PostForm as P };
