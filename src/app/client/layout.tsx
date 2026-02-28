import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: { default: "Portal", template: "%s | Client Portal" },
  robots: { index: false, follow: false },
};

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const userWithApps = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      logo: true,
      apps: {
        select: {
          app: { select: { id: true, name: true, url: true, icon: true } },
        },
      },
    },
  });

  const apps = userWithApps?.apps.map((ua) => ua.app) ?? [];

  let unreadCount = 0;
  try {
    unreadCount = await prisma.message.count({
      where: { toUserId: session.user.id, read: false },
    });
  } catch {
    // ignore
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Brand + app links */}
            <div className="flex items-center gap-6 overflow-x-auto">
              <Link
                href="/client/dashboard"
                className="text-sm font-semibold text-[var(--text-primary)] shrink-0"
              >
                My Portal
              </Link>
              {apps.map((app) => (
                <a
                  key={app.id}
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0"
                >
                  {app.icon && <span>{app.icon}</span>}
                  {app.name}
                </a>
              ))}
            </div>

            {/* Right side: logo, messages, account, sign out */}
            <div className="flex items-center gap-4 shrink-0">
              {/* Client logo */}
              {userWithApps?.logo && (
                <Image
                  src={userWithApps.logo}
                  alt="Company logo"
                  width={28}
                  height={28}
                  className="rounded object-contain"
                />
              )}

              {/* User name (hidden on small screens) */}
              <span className="text-xs text-[var(--text-muted)] hidden sm:block">
                {userWithApps?.name ?? userWithApps?.email}
              </span>

              {/* Messages link with badge */}
              <Link
                href="/client/messages"
                className="relative inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Messages
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full bg-[var(--accent)] text-white text-[10px] font-bold px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* Account link */}
              <Link
                href="/client/account"
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                Account
              </Link>

              {/* Back to main site */}
              <Link
                href="/"
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="Go back to the main website"
              >
                ← Main Site
              </Link>

              {/* Sign out */}
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
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}