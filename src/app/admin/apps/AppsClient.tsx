"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { createClientApp, updateClientApp, deleteClientApp, assignAppToUser, removeAppFromUser } from "../settings/actions";

interface App {
  id: string;
  name: string;
  productName: string | null;
  companyName: string | null;
  environment: "PRODUCTION" | "TEST" | "DEVELOPMENT";
  url: string;
  description: string | null;
  icon: string | null;
  favicon: string | null;
  ogImage: string | null;
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

interface FetchedMeta {
  title: string;
  description: string;
  ogImage: string;
  favicon: string;
}

function StatusMsg({ result }: { result: { success: boolean; error?: string } | null }) {
  if (!result) return null;
  return result.success ? (
    <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</p>
  ) : (
    <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
  );
}

const ENV_OPTIONS = ["PRODUCTION", "TEST", "DEVELOPMENT"] as const;
type AppEnvironment = (typeof ENV_OPTIONS)[number];

type AppFormValues = {
  name: string;
  url: string;
  description: string;
  icon: string;
  productName: string;
  companyName: string;
  environment: AppEnvironment;
};

function AppForm({
  initialValues,
  onSubmit,
  onCancel,
  isPending,
  result,
  submitLabel,
  title,
}: {
  initialValues: AppFormValues;
  onSubmit: (values: AppFormValues) => void;
  onCancel: () => void;
  isPending: boolean;
  result: { success: boolean; error?: string } | null;
  submitLabel: string;
  title: string;
}) {
  const [values, setValues] = useState(initialValues);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors";

  async function handleFetchMeta() {
    if (!values.url) return;
    setFetchingMeta(true);
    setMetaError(null);
    try {
      const res = await fetch("/api/fetch-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: values.url }),
      });
      const data: FetchedMeta & { error?: string } = await res.json();
      if (!res.ok || data.error) {
        setMetaError(data.error ?? "Failed to fetch metadata");
      } else {
        setValues((v) => ({
          ...v,
          name: data.title && !v.name ? data.title : v.name,
          description: data.description && !v.description ? data.description : v.description,
        }));
      }
    } catch {
      setMetaError("Failed to fetch metadata");
    } finally {
      setFetchingMeta(false);
    }
  }

  function set(field: keyof typeof values) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4"
    >
      <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>

      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Project URL *</label>
        <div className="flex gap-2">
          <input
            type="url"
            value={values.url}
            onChange={set("url")}
            required
            className={inputCls}
            placeholder="https://app.example.com"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            isLoading={fetchingMeta}
            onClick={handleFetchMeta}
            className="shrink-0"
          >
            Autofill
          </Button>
        </div>
        {metaError && <p className="text-xs text-red-500 mt-1">{metaError}</p>}
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Enter the URL then click Autofill to populate name and description from the page.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Product Name</label>
          <input type="text" value={values.productName} onChange={set("productName")} className={inputCls} placeholder="P1 Ops Hub" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Company Name</label>
          <input type="text" value={values.companyName} onChange={set("companyName")} className={inputCls} placeholder="Perimeter One Solutions" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Environment</label>
          <select
            value={values.environment}
            onChange={set("environment")}
            className={inputCls}
          >
            {ENV_OPTIONS.map((env) => (
              <option key={env} value={env}>
                {env.charAt(0) + env.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Icon (emoji)</label>
          <input type="text" value={values.icon} onChange={set("icon")} className={inputCls} placeholder="🚀" maxLength={4} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Project name *</label>
          <input type="text" value={values.name} onChange={set("name")} required className={inputCls} placeholder="My Client Portal" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
          <input type="text" value={values.description} onChange={set("description")} className={inputCls} placeholder="Short description" />
        </div>
      </div>

      <StatusMsg result={result} />

      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AppsClient({ initialApps, users }: Props) {
  const [apps, setApps] = useState(initialApps);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addResult, setAddResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [editResult, setEditResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const emptyForm = {
    name: "",
    url: "",
    description: "",
    icon: "",
    productName: "",
    companyName: "",
    environment: "PRODUCTION" as const,
  };

  function handleAdd(values: AppFormValues) {
    setAddResult(null);
    startTransition(async () => {
      const r = await createClientApp(
        values.name,
        values.url,
        values.description,
        values.icon,
        values.productName,
        values.companyName,
        values.environment
      );
      setAddResult(r);
      if (r.success) {
        setApps((prev) => [
          ...prev,
          {
            id: (r.data as { id: string }).id,
            name: values.name,
            productName: values.productName || null,
            companyName: values.companyName || null,
            environment: values.environment,
            url: values.url,
            description: values.description || null,
            icon: values.icon || null,
            favicon: null,
            ogImage: null,
            userIds: [],
          },
        ]);
        setShowAdd(false);
      }
    });
  }

  function handleEdit(appId: string, values: AppFormValues) {
    setEditResult(null);
    startTransition(async () => {
      const r = await updateClientApp(appId, values);
      setEditResult(r);
      if (r.success) {
        setApps((prev) =>
          prev.map((a) =>
            a.id !== appId
              ? a
              : {
                  ...a,
                  name: values.name,
                  productName: values.productName || null,
                  companyName: values.companyName || null,
                  environment: values.environment,
                  url: values.url,
                  description: values.description || null,
                  icon: values.icon || null,
                }
          )
        );
        setEditingId(null);
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

  const clientUsers = users.filter((u) => u.role === "CLIENT");

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Live Projects</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage live projects and control which clients have access.
          </p>
        </div>
        {!showAdd && (
          <Button type="button" variant="primary" size="md" onClick={() => setShowAdd(true)}>
            + New Project
          </Button>
        )}
      </div>

      {showAdd && (
        <AppForm
          title="New Live Project"
          submitLabel="Create Project"
          initialValues={emptyForm}
          onSubmit={handleAdd}
          onCancel={() => { setShowAdd(false); setAddResult(null); }}
          isPending={isPending}
          result={addResult}
        />
      )}

      {apps.length === 0 && !showAdd ? (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 text-center">
          <p className="text-[var(--text-muted)] text-sm">No projects yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => {
            const isEditing = editingId === app.id;

            if (isEditing) {
              return (
                <AppForm
                  key={app.id}
                  title={`Edit: ${app.name}`}
                  submitLabel="Save Changes"
                  initialValues={{
                    name: app.name,
                    url: app.url,
                    description: app.description ?? "",
                    icon: app.icon ?? "",
                    productName: app.productName ?? "",
                    companyName: app.companyName ?? "",
                    environment: app.environment,
                  }}
                  onSubmit={(values) => handleEdit(app.id, values)}
                  onCancel={() => { setEditingId(null); setEditResult(null); }}
                  isPending={isPending}
                  result={editResult}
                />
              );
            }

            return (
              <div key={app.id} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {app.icon && <span className="text-2xl">{app.icon}</span>}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[var(--text-primary)]">{app.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          app.environment === "PRODUCTION"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : app.environment === "TEST"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}>
                          {app.environment === "PRODUCTION" ? "PROD" : app.environment === "TEST" ? "TEST" : "DEV"}
                        </span>
                      </div>
                      {(app.productName || app.companyName) && (
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {app.productName && <span className="font-medium">{app.productName}</span>}
                          {app.productName && app.companyName && <span> • </span>}
                          {app.companyName && <span>{app.companyName}</span>}
                        </p>
                      )}
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
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => { setEditingId(app.id); setEditResult(null); }}
                    >
                      Edit
                    </Button>
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
                </div>

                <div>
                  <p className="text-xs font-medium text-[var(--text-muted)] mb-2">Client access</p>
                  <div className="flex flex-wrap gap-2">
                    {clientUsers.map((u) => {
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
                    {clientUsers.length === 0 && (
                      <p className="text-xs text-[var(--text-muted)]">No clients yet. Add clients in Settings.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
