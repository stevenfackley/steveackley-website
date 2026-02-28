"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { ImageUploadButton } from "@/components/admin/ImageUploadButton";
import {
  changePassword,
  updateSiteSetting,
  createUser,
  deleteUser,
  updateUserRole,
} from "./actions";
import { SETTING_KEYS } from "@/lib/settings";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "CLIENT";
  createdAt: Date;
}

interface Props {
  users: User[];
  avatarUrl: string;
  couplePhotoUrl: string;
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
      <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
      {children}
    </section>
  );
}

function StatusMsg({ result }: { result: { success: boolean; error?: string } | null }) {
  if (!result) return null;
  return result.success ? (
    <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved successfully.</p>
  ) : (
    <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
  );
}

// ---------------------------------------------------------------------------
// Password Section
// ---------------------------------------------------------------------------
function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    if (next !== confirm) {
      setResult({ success: false, error: "New passwords do not match" });
      return;
    }
    startTransition(async () => {
      const r = await changePassword(current, next);
      setResult(r);
      if (r.success) {
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    });
  }

  return (
    <Section title="Change Password">
      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Current password</label>
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">New password</label>
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Confirm new password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" className={inputCls} />
        </div>
        <StatusMsg result={result} />
        <Button type="submit" variant="primary" size="sm" isLoading={isPending}>
          Update Password
        </Button>
      </form>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Image Setting Row
// ---------------------------------------------------------------------------
function ImageSetting({
  label,
  description,
  settingKey,
  initialUrl,
  fallbackIcon,
}: {
  label: string;
  description: string;
  settingKey: string;
  initialUrl: string;
  fallbackIcon: string;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function save(newUrl: string) {
    setUrl(newUrl);
    setResult(null);
    startTransition(async () => {
      const r = await updateSiteSetting(settingKey, newUrl);
      setResult(r);
    });
  }

  return (
    <div className="flex items-center gap-4 py-3 border-b border-[var(--border)] last:border-0">
      <div className="shrink-0">
        {url ? (
          <Image
            src={url}
            alt={label}
            width={56}
            height={56}
            className="rounded-xl object-cover ring-1 ring-[var(--border)]"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-[var(--surface-hover)] flex items-center justify-center text-2xl">
            {fallbackIcon}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
        {url && (
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 truncate font-mono">{url}</p>
        )}
        <StatusMsg result={result} />
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        <ImageUploadButton onUpload={save} />
        {url && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            isLoading={isPending}
            onClick={() => save("")}
          >
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// User Management Section
// ---------------------------------------------------------------------------
function UserManagementSection({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "CLIENT">("CLIENT");
  const [addResult, setAddResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors";
  const selectCls =
    "rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors";

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddResult(null);
    startTransition(async () => {
      const r = await createUser(email, password, name, role);
      setAddResult(r);
      if (r.success) {
        setUsers((prev) => [
          ...prev,
          { id: (r.data as { id: string }).id, email, name: name || null, role, createdAt: new Date() },
        ]);
        setEmail("");
        setName("");
        setPassword("");
        setRole("CLIENT");
        setShowAdd(false);
      }
    });
  }

  function handleDelete(userId: string) {
    setDeletingId(userId);
    startTransition(async () => {
      const r = await deleteUser(userId);
      if (r.success) setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeletingId(null);
    });
  }

  function handleRoleChange(userId: string, newRole: "ADMIN" | "CLIENT") {
    startTransition(async () => {
      const r = await updateUserRole(userId, newRole);
      if (r.success) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      }
    });
  }

  return (
    <Section title="User Management">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="pb-2 font-medium text-[var(--text-muted)] pr-4">Name / Email</th>
              <th className="pb-2 font-medium text-[var(--text-muted)] pr-4">Role</th>
              <th className="pb-2 font-medium text-[var(--text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-2.5 pr-4">
                  <p className="text-[var(--text-primary)] font-medium">{u.name ?? "—"}</p>
                  <p className="text-xs text-[var(--text-muted)]">{u.email}</p>
                </td>
                <td className="py-2.5 pr-4">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as "ADMIN" | "CLIENT")}
                    className={selectCls}
                    disabled={isPending}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="CLIENT">Client</option>
                  </select>
                </td>
                <td className="py-2.5">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    isLoading={deletingId === u.id}
                    onClick={() => handleDelete(u.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd ? (
        <form onSubmit={handleAdd} className="border border-[var(--border)] rounded-xl p-4 space-y-3 mt-2">
          <p className="text-sm font-medium text-[var(--text-primary)]">Add new user</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Display name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Password *</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Role *</label>
              <select value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "CLIENT")} className={selectCls}>
                <option value="CLIENT">Client</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>
          <StatusMsg result={addResult} />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" size="sm" isLoading={isPending}>Add User</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAdd(false); setAddResult(null); }}>Cancel</Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
          + Add User
        </Button>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Root Client Component
// ---------------------------------------------------------------------------
export function SettingsClient({ users, avatarUrl, couplePhotoUrl }: Props) {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage your account, site images, and users.</p>
      </div>

      <PasswordSection />

      <Section title="Site Images">
        <p className="text-xs text-[var(--text-muted)] -mt-2">
          Upload a new image to replace the existing one. Changes are reflected across the site immediately.
        </p>
        <div>
          <ImageSetting
            label="Profile avatar"
            description="Displayed in the navigation bar, hero card, and about section."
            settingKey={SETTING_KEYS.AVATAR_URL}
            initialUrl={avatarUrl}
            fallbackIcon="👤"
          />
          <ImageSetting
            label="About photo"
            description="The personal photo shown in the About tab on the home page."
            settingKey={SETTING_KEYS.COUPLE_PHOTO_URL}
            initialUrl={couplePhotoUrl}
            fallbackIcon="📸"
          />
        </div>
      </Section>

      <UserManagementSection initialUsers={users} />
    </div>
  );
}
