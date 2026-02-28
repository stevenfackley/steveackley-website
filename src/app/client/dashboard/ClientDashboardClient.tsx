"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { sendProjectRequest } from "@/app/admin/messages/actions";

interface App {
  id: string;
  name: string;
  productName: string | null;
  companyName: string | null;
  environment: "PRODUCTION" | "TEST" | "DEVELOPMENT";
  url: string;
  icon: string | null;
  description: string | null;
}

interface Props {
  firstName: string;
  apps: App[];
  adminId: string | null;
}

export function ClientDashboardClient({ firstName, apps, adminId }: Props) {
  const [showRequest, setShowRequest] = useState(false);
  const [requestBody, setRequestBody] = useState("");
  const [requestResult, setRequestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors";

  function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setRequestResult(null);
    startTransition(async () => {
      const r = await sendProjectRequest(requestBody);
      setRequestResult(r);
      if (r.success) {
        setRequestBody("");
        setShowRequest(false);
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Welcome back, {firstName}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Here are your available projects and tools.
        </p>
      </div>

      {apps.length === 0 ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-12 text-center space-y-4">
          <p className="text-3xl mb-3">🚀</p>
          <p className="text-[var(--text-primary)] font-medium">No projects assigned yet</p>
          <p className="text-sm text-[var(--text-muted)]">
            Your projects will appear here once they&apos;re ready. In the meantime, you can request a project below.
          </p>

          {adminId && !requestResult?.success && (
            <>
              {!showRequest ? (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => setShowRequest(true)}
                >
                  Request a Project
                </Button>
              ) : (
                <form
                  onSubmit={handleRequest}
                  className="max-w-md mx-auto text-left space-y-3 mt-4"
                >
                  <p className="text-sm font-medium text-[var(--text-primary)]">Tell us about your project</p>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    required
                    rows={4}
                    className={inputCls + " resize-y"}
                    placeholder="Describe what you're looking for — type of project, goals, timeline, etc."
                  />
                  {requestResult && !requestResult.success && (
                    <p className="text-sm text-red-600">{requestResult.error}</p>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
                      Send Request
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowRequest(false); setRequestResult(null); }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </>
          )}

          {requestResult?.success && (
            <div className="max-w-md mx-auto mt-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 px-4 py-3">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                ✓ Request sent! Steve will be in touch soon.
              </p>
            </div>
          )}
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                      {app.name}
                    </p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-semibold uppercase ${
                      app.environment === "PRODUCTION" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                      app.environment === "TEST" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {app.environment === "PRODUCTION" ? "Prod" : app.environment === "TEST" ? "Test" : "Dev"}
                    </span>
                  </div>
                  {(app.productName || app.companyName) && (
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                      {app.productName && <span className="font-medium">{app.productName}</span>}
                      {app.productName && app.companyName && <span> • </span>}
                      {app.companyName && <span>{app.companyName}</span>}
                    </p>
                  )}
                  <p className="text-xs text-[var(--text-muted)] truncate max-w-[180px]">{app.url}</p>
                </div>
              </div>
              {app.description && (
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{app.description}</p>
              )}
              <div className="mt-auto flex items-center gap-1 text-xs text-[var(--accent)] font-medium">
                Open project
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