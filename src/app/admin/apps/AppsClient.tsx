"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { createClientApp, deleteClientApp, assignAppToUser, removeAppFromUser } from "../settings/actions";

interface App {
  id: string;
  name: string;
  url: string;
  description: string | null;
  icon: string | null;
  userIds: string[];
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "CLIENT";
}

interface Props {
  initialApps: App[];
  users: User[];
}

function StatusMsg({ result }: { result: { success: boolean; error?: string } | null }) {
  if (!result) return null;
  return result.success ? (
    <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>
  ) : (
    <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
  );
}

export function AppsClient({ initialApps, users }: Props) {
  const [apps, setApps] = useState(initialApps);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [addResult, setAddResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors";

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddResult(null);
    startTransition(async () => {
      const r = await createClientApp(name, url, description, icon);
      setAddResult(r);
      if (r.success) {
        setApps((prev) => [
          ...prev,
          { id: (r.data as { id: string }).id, name, url, description: description || null, icon: icon || null, userIds: [] },
        ]);
        setName("");
        setUrl("");
        setDescription("");
        setIcon("");
        setShowAdd(false);
      }
    });
  }

  function handleDelete(appId: string) {
    setDeletingId(appId);
    startTransition(async () => {
      const r = await deleteClientApp(appId);
      if (r.success) setApps((prev) => prev.filter((a) => a.id !== appId));
      setDeletingId(null);
    });
  }

  function handleToggleUser(appId: string, userId: string, currently: boolean) {
    startTransition(async () => {
      const r = currently
        ? await removeAppFromUser(userId, appId)
        : await assignAppToUser(userId, appId);
      if (r.success) {
        setApps((prev) =>
          prev.map((a) =>
            a.id !== appId
              ? a
              : {
                  ...a,
                  userIds: currently
                    ? a.userIds.filter((id) => id !== userId)
                    : [...a.userIds, userId],
                }
          )
        );
      }
    });
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Client Apps</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage apps and control which users have access.
          </p>
        </div>
        {!showAdd && (
          <Button type="button" variant="primary" size="md" onClick={() => setShowAdd(true)}>
            + New App
          </Button>
        )}
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-[var(--text-primary)]">New App</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">App name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} placeholder="My Client Portal" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">URL *</label>
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required className={inputCls} placeholder="https://app.example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="Short description" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Icon (emoji)</label>
              <input type="text" value={icon} onChange={(e) => setIcon(e.target.value)} className={inputCls} placeholder="🚀" maxLength={4} />
            </div>
          </div>
          <StatusMsg result={addResult} />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" isLoading={isPending}>Create App</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAdd(false); setAddResult(null); }}>Cancel</Button>
          </div>
        </form>
      )}

      {apps.length === 0 && !showAdd ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center">
          <p className="text-[var(--text-muted)] text-sm">No apps yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => (
            <div key={app.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
              {/* App header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {app.icon && <span className="text-2xl">{app.icon}</span>}
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{app.name}</p>
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--accent)] hover:underline"
                    >
                      {app.url}
                    </a>
                    {app.description && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{app.description}</p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  isLoading={deletingId === app.id}
                  onClick={() => handleDelete(app.id)}
                >
                  Delete
                </Button>
              </div>

              {/* User access */}
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)] mb-2">User access</p>
                <div className="flex flex-wrap gap-2">
                  {users.map((u) => {
                    const has = app.userIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        disabled={isPending}
                        onClick={() => handleToggleUser(app.id, u.id, has)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all duration-150 ${
                          has
                            ? "bg-[var(--accent)] text-white border-[var(--accent)]"
                            : "bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        }`}
                      >
                        {has ? "✓ " : "+ "}
                        {u.name ?? u.email}
                      </button>
                    );
                  })}
                  {users.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)]">No users yet. Add users in Settings.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
