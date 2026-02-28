"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { ImageUploadButton } from "@/components/admin/ImageUploadButton";
import { changePassword, updateSiteSetting } from "../settings/actions";
import { SETTING_KEYS } from "@/lib/settings";

interface Props {
  name: string | null;
  email: string;
  avatarUrl: string;
  couplePhotoUrl: string;
}

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

export function AdminAccountClient({ name, email, avatarUrl, couplePhotoUrl }: Props) {
  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors";

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwResult, setPwResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [pwPending, startPwTransition] = useTransition();

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwResult(null);
    if (next !== confirm) {
      setPwResult({ success: false, error: "New passwords do not match" });
      return;
    }
    startPwTransition(async () => {
      const r = await changePassword(current, next);
      setPwResult(r);
      if (r.success) {
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    });
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">My Account</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {name ? `${name} · ` : ""}{email}
        </p>
      </div>

      {/* Profile Images */}
      <Section title="Profile Images">
        <p className="text-xs text-[var(--text-muted)] -mt-2">
          Swap out your avatar and the about photo shown on the public site.
        </p>
        <div>
          <ImageSetting
            label="Your avatar"
            description="Shown in the nav bar, hero card, and about section on the public site."
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

      {/* Change Password */}
      <Section title="Change Password">
        <form onSubmit={handlePasswordSubmit} className="space-y-3 max-w-sm">
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
          <StatusMsg result={pwResult} />
          <Button type="submit" variant="primary" size="sm" isLoading={pwPending}>
            Update Password
          </Button>
        </form>
      </Section>
    </div>
  );
}