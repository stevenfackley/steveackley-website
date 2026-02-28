import type { Metadata } from "next";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { Nav } from "@/components/ui/Nav";
import { AdminAccountMenu } from "@/components/admin/AdminAccountMenu";
import { prisma } from "@/lib/prisma";

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

  let unreadCount = 0;
  if (session?.user?.id) {
    try {
      unreadCount = await prisma.message.count({
        where: { toUserId: session.user.id, read: false },
      });
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {session ? (
        <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between">
              <div className="flex items-center gap-6 overflow-x-auto">
                <Link
                  href="/admin/dashboard"
                  className="text-sm font-semibold text-[var(--text-primary)] shrink-0"
                >
                  Admin
                </Link>
                <Link
                  href="/admin/posts/new"
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
                >
                  New Post
                </Link>
                <Link
                  href="/admin/apps"
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
                >
                  Projects
                </Link>
                <Link
                  href="/admin/messages"
                  className="relative text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0 inline-flex items-center gap-1"
                >
                  Messages
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full bg-[var(--accent)] text-white text-[10px] font-bold px-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Account + Settings dropdown */}
                <AdminAccountMenu />

                <Link
                  href="/"
                  className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
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
