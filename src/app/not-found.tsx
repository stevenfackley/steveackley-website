import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-4xl font-bold text-[var(--text-primary)]">404</h1>
      <p className="text-[var(--text-muted)]">This page doesn&apos;t exist.</p>
      <Link
        href="/"
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
      >
        Go home
      </Link>
    </div>
  );
}
