"use client";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateShort } from "@/lib/utils";
import { actions } from "astro:actions";
import type { PostSummary } from "@/types";

const PAGE_SIZE = 20;

export function AdminPostTable({ posts }: { posts: PostSummary[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSearch = (v: string) => { setSearch(v); setPage(0); };

  if (posts.length === 0) return (
    <div className="text-center py-16 text-[var(--text-muted)]">
      <p>No posts yet.</p>
      <a href="/admin/posts/new" className="mt-2 inline-block text-[var(--accent)] text-sm hover:underline">Create your first post →</a>
    </div>
  );

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Search posts…"
        className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors"
      />
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
            {paged.length > 0
              ? paged.map((post) => <PostRow key={post.id} post={post} />)
              : <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">No posts match "{search}"</td></tr>
            }
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[var(--text-muted)]">
          <span>{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-hover)] transition-colors"
            >← Prev</button>
            <span>{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-hover)] transition-colors"
            >Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PostRow({ post }: { post: PostSummary }) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleToggle = () => startTransition(async () => { 
    await actions.togglePublished({ id: post.id, published: !post.published });
    window.location.reload(); // Simple refresh for now
  });

  const handleDelete = () => {
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); return; }
    startTransition(async () => { 
      await actions.deletePost({ id: post.id });
      window.location.reload();
    });
  };

  return (
    <tr className="hover:bg-[var(--surface-hover)] transition-colors">
      <td className="px-4 py-3">
        <div>
          <a href={`/admin/posts/${post.id}/edit`} className="font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors line-clamp-1">{post.title}</a>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">/blog/{post.slug}</p>
        </div>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <Badge variant={post.published ? "default" : "secondary"}>{post.published ? "Published" : "Draft"}</Badge>
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-[var(--text-muted)]">{formatDateShort(post.updatedAt)}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleToggle} disabled={isPending}>{post.published ? "Unpublish" : "Publish"}</Button>
          <a href={`/admin/posts/${post.id}/edit`}><Button variant="secondary" size="sm">Edit</Button></a>
          <Button variant={confirmDelete ? "destructive" : "ghost"} size="sm" onClick={handleDelete} disabled={isPending}>{confirmDelete ? "Confirm?" : "Delete"}</Button>
        </div>
      </td>
    </tr>
  );
}
