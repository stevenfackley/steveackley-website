"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Admin Login
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Sign in to manage your blog
          </p>
        </div>

        {/* Form */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                placeholder="stevenfackley@gmail.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900 dark:bg-red-950">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isPending}
              className="w-full mt-2"
            >
              Sign In
            </Button>
          </form>
        </div>

        {/* No-index meta is handled in AdminLayout metadata */}
        <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
          This area is for site administrators only.
        </p>

        <noscript>
          <div className="mt-4 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-center dark:border-yellow-800 dark:bg-yellow-950">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Login requires JavaScript. Please enable it in your browser settings.
            </p>
          </div>
        </noscript>
      </div>
    </div>
  );
}
