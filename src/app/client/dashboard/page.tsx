import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Dashboard" };

export default async function ClientDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/admin/login");

  const userWithApps = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      apps: {
        select: {
          app: {
            select: { id: true, name: true, url: true, icon: true, description: true },
          },
        },
      },
    },
  });

  const apps = userWithApps?.apps.map((ua) => ua.app) ?? [];
  const firstName = userWithApps?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Here are your available apps and tools.
        </p>
      </div>

      {apps.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 text-center">
          <p className="text-3xl mb-3">🚀</p>
          <p className="text-[var(--text-primary)] font-medium">No apps assigned yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Your administrator will add apps to your account shortly.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <a
              key={app.id}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 hover:border-[var(--accent)] hover:shadow-sm transition-all duration-150 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                {app.icon ? (
                  <span className="text-3xl">{app.icon}</span>
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
                    {app.name[0]}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                    {app.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate max-w-[180px]">{app.url}</p>
                </div>
              </div>
              {app.description && (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{app.description}</p>
              )}
              <div className="mt-auto flex items-center gap-1 text-xs text-[var(--accent)] font-medium">
                Open app
                <svg className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
