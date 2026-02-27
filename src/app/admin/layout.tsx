import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Nav } from "@/components/ui/Nav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin — Steve Ackley" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {session ? (
        <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <div className="flex items-center gap-6">
                <Link
                  href="/admin/dashboard"
                  className="text-sm font-semibold text-[var(--text-primary)]"
                >
                  Admin
                </Link>
                <Link
                  href="/admin/posts/new"
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  New Post
                </Link>
                <Link
                  href="/"
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  target="_blank"
                >
                  View Site
                </Link>
              </div>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/admin/login" });
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </header>
      ) : (
        <Nav />
      )}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
