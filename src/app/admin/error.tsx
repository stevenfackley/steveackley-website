"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center px-4">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">Something went wrong</h2>
      <p className="text-sm text-[var(--text-muted)]">{error.message ?? "An unexpected error occurred."}</p>
      <button
        onClick={reset}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
    </div>
  );
}
