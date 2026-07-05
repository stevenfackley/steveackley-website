"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { ImageUploadButton } from "./ImageUploadButton";
interface Props { value: string; onChange: (html: string) => void; ariaLabelledBy?: string; }
export function PostEditor({ value, onChange, ariaLabelledBy }: Props) {
  const editor = useEditor({
    extensions: [
      // StarterKit v3 bundles Link (and Underline/List/etc). Configure Link through
      // StarterKit instead of adding @tiptap/extension-link again — a duplicate mark
      // corrupts the schema and makes editor.getHTML() throw.
      StarterKit.configure({
        link: { openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer" } },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: "Start writing your post..." }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "tiptap-editor focus:outline-none",
        role: "textbox",
        "aria-multiline": "true",
        ...(ariaLabelledBy ? { "aria-labelledby": ariaLabelledBy } : {}),
      },
    },
  });
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value);
  }, [editor, value]);
  const addImage = (url: string) => editor?.chain().focus().setImage({ src: url }).run();
  const btn = (active: boolean) => cn("px-2 py-1 text-xs rounded font-medium transition-colors", active ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]");
  if (!editor) return null;
  return (
    <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-[var(--surface)]">
      <div className="flex flex-wrap gap-1 p-3 border-b border-[var(--border)] bg-[var(--surface-hover)]">
        <button type="button" aria-label="Bold" aria-pressed={editor.isActive("bold")} className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
        <button type="button" aria-label="Italic" aria-pressed={editor.isActive("italic")} className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>
        <button type="button" aria-label="Inline code" aria-pressed={editor.isActive("code")} className={btn(editor.isActive("code"))} onClick={() => editor.chain().focus().toggleCode().run()}>{"<>"}</button>
        <button type="button" aria-label="Heading 2" aria-pressed={editor.isActive("heading", { level: 2 })} className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" aria-label="Heading 3" aria-pressed={editor.isActive("heading", { level: 3 })} className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button type="button" aria-label="Bullet list" aria-pressed={editor.isActive("bulletList")} className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</button>
        <button type="button" aria-label="Numbered list" aria-pressed={editor.isActive("orderedList")} className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</button>
        <button type="button" aria-label="Blockquote" aria-pressed={editor.isActive("blockquote")} className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</button>
        <button type="button" aria-label="Code block" aria-pressed={editor.isActive("codeBlock")} className={btn(editor.isActive("codeBlock"))} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>Code</button>
        <button type="button" aria-label="Insert link" className={btn(false)} onClick={() => { const url = window.prompt("URL:"); if (url) editor.chain().focus().setLink({ href: url }).run(); }}>Link</button>
        <ImageUploadButton onUpload={addImage} />
      </div>
      <EditorContent editor={editor} className="min-h-[400px] p-4 prose prose-neutral dark:prose-invert max-w-none text-[var(--text-primary)]" />
    </div>
  );
}
