"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateShort } from "@/lib/utils";
import { deletePost, togglePublished } from "@/app/admin/dashboard/actions";
import type { PostSummary } from "@/types";
export function AdminPostTable({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) return (
    <div className="text-center py-16 text-[var(--text-muted)]">
      <p>No posts yet.</p>
      <Link href="/admin/posts/new" className="mt-2 inline-block text-[var(--accent)] text-sm hover:underline">Create your first post →</Link>
    </div>
  );
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)]">
            <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Title</th>
            <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)] hidden sm:table-cell">Status</th>
            <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)] hidden md:table-cell">Updated</th>
            <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {posts.map((post) => <PostRow key={post.id} post={post} />)}
        </tbody>
      </table>
    </div>
  );
}
function PostRow({ post }: { post: PostSummary }) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const handleToggle = () => startTransition(async () => { await togglePublished(post.id, !post.published); });
  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); return; }
    startTransition(async () => { await deletePost(post.id); });
  };
  return (
    <tr className="hover:bg-[var(--surface-hover)] transition-colors">
      <td className="px-4 py-3">
        <div>
          <Link href={`/admin/posts/${post.id}/edit`} className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors line-clamp-1">{post.title}</Link>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">/blog/{post.slug}</p>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <Badge variant={post.published ? "success" : "default"}>{post.published ? "Published" : "Draft"}</Badge>
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-[var(--text-muted)]">{formatDateShort(post.updatedAt)}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleToggle} disabled={isPending}>{post.published ? "Unpublish" : "Publish"}</Button>
          <Link href={`/admin/posts/${post.id}/edit`}><Button variant="secondary" size="sm">Edit</Button></Link>
          <Button variant={confirmDelete ? "danger" : "ghost"} size="sm" onClick={handleDelete} disabled={isPending}>{confirmDelete ? "Confirm?" : "Delete"}</Button>
        </div>
      </td>
    </tr>
  );
}
