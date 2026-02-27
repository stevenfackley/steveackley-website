import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PaginationInfo } from "@/types";
export function Pagination({ pagination, basePath }: { pagination: PaginationInfo; basePath: string }) {
  const { currentPage, totalPages, hasPreviousPage, hasNextPage } = pagination;
  if (totalPages <= 1) return null;
  const cls = (active?: boolean, disabled?: boolean) => cn("inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium transition-all", active ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]", disabled && "opacity-40 pointer-events-none");
  return (
    <nav className="flex items-center justify-center gap-2 mt-12">
      {hasPreviousPage ? <Link href={`${basePath}?page=${currentPage - 1}`} className={cls()}>‹</Link> : <span className={cls(false, true)}>‹</span>}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Link key={p} href={`${basePath}?page=${p}`} className={cls(p === currentPage)} aria-current={p === currentPage ? "page" : undefined}>{p}</Link>
      ))}
      {hasNextPage ? <Link href={`${basePath}?page=${currentPage + 1}`} className={cls()}>›</Link> : <span className={cls(false, true)}>›</span>}
    </nav>
  );
}
