"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { ImageUploadButton } from "@/components/admin/ImageUploadButton";
import { changeClientPassword, updateClientLogo, updateClientProfile } from "./actions";

interface Props {
  name: string | null;
  email: string;
  logoUrl: string | null;
  companyName: string | null;
  contactFirstName: string | null;
  contactLastName: string | null;
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

export function ClientAccountClient({ name, email, logoUrl, companyName, contactFirstName, contactLastName }: Props) {
  const inputCls =
    "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-colors";

  // --- Profile ---
  const [displayName, setDisplayName] = useState(name ?? "");
  const [company, setCompany] = useState(companyName ?? "");
  const [firstName, setFirstName] = useState(contactFirstName ?? "");
  const [lastName, setLastName] = useState(contactLastName ?? "");
  const [profileResult, setProfileResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [profilePending, startProfileTransition] = useTransition();

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileResult(null);
    startProfileTransition(async () => {
      const r = await updateClientProfile({
        name: displayName,
        companyName: company,
        contactFirstName: firstName,
        contactLastName: lastName,
      });
      setProfileResult(r);
    });
  }

  // --- Logo ---
  const [logo, setLogo] = useState(logoUrl ?? "");
  const [logoResult, setLogoResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [logoPending, startLogoTransition] = useTransition();

  function saveLogo(newUrl: string) {
    setLogo(newUrl);
    setLogoResult(null);
    startLogoTransition(async () => {
      const r = await updateClientLogo(newUrl);
      setLogoResult(r);
    });
  }

  // --- Password ---
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
      const r = await changeClientPassword(current, next);
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
        <p className="text-sm text-[var(--text-muted)] mt-1">{email}</p>
      </div>

      {/* Logo */}
      <Section title="Company Logo">
        <p className="text-xs text-[var(--text-muted)] -mt-2">
          Upload your company logo. It will be displayed in your portal header.
        </p>
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            {logo ? (
              <Image
                src={logo}
                alt="Company logo"
                width={72}
                height={72}
                className="rounded-xl object-contain ring-1 ring-[var(--border)] bg-white p-1"
              />
            ) : (
              <div className="w-18 h-18 w-[72px] h-[72px] rounded-xl bg-[var(--surface-hover)] flex items-center justify-center text-3xl">
                🏢
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <StatusMsg result={logoResult} />
            <div className="flex gap-2">
              <ImageUploadButton onUpload={saveLogo} />
              {logo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  isLoading={logoPending}
                  onClick={() => saveLogo("")}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Profile */}
      <Section title="Profile">
        <form onSubmit={handleProfileSave} className="space-y-3 max-w-sm">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Company name</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={inputCls}
              placeholder="Your company name"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={inputCls}
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={inputCls}
                placeholder="Last name"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className={inputCls}
              placeholder="Your name or company name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className={inputCls + " opacity-60 cursor-not-allowed"}
            />
          </div>
          <StatusMsg result={profileResult} />
          <Button type="submit" variant="primary" size="sm" isLoading={profilePending}>
            Save Profile
          </Button>
        </form>
      </Section>

      {/* Password */}
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