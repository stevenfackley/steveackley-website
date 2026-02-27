import type { Metadata } from "next";
import { PostForm } from "@/components/admin/PostForm";
import { createPost } from "./actions";
export const metadata: Metadata = { title: "New Post" };
export default function NewPostPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">New Post</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Write and publish a new blog post</p>
      </div>
      <PostForm action={createPost} />
    </div>
  );
}
