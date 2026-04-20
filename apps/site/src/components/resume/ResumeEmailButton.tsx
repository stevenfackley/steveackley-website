import { useEffect, useRef, useState } from "react";

const EMAIL = "stevenfackley@gmail.com";

function EmailDialog({ onClose }: { onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  function openGmail() {
    const subject = encodeURIComponent("Hello, Steve!");
    const body = encodeURIComponent("Hi Steve,\n\n");
    window.open(
      `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(EMAIL)}&su=${subject}&body=${body}`,
      "_blank",
      "noopener,noreferrer"
    );
    onClose();
  }

  function openAppleMail() {
    const subject = encodeURIComponent("Hello, Steve!");
    window.location.href = `mailto:${EMAIL}?subject=${subject}`;
    onClose();
  }

  function openDefaultEmail() {
    window.location.href = `mailto:${EMAIL}`;
    onClose();
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = EMAIL;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const options = [
    {
      id: "gmail",
      label: "Open in Gmail",
      description: "Compose in your browser",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
          <path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" fill="#EA4335" opacity=".15" />
          <path d="M2 6l10 7L22 6" stroke="#EA4335" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M2 6v12h20V6" stroke="#4285F4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M2 6l10 7 10-7" stroke="#34A853" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </svg>
      ),
      action: openGmail,
      color: "#EA4335",
    },
    {
      id: "apple",
      label: "Open in Apple Mail",
      description: "Default macOS / iOS mail",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2a8 8 0 110 16A8 8 0 0112 4zm-4 5a1 1 0 000 2h.01a1 1 0 000-2H8zm4 0a1 1 0 000 2h.01a1 1 0 000-2H12zm4 0a1 1 0 000 2h.01a1 1 0 000-2H16zm-8 4a1 1 0 000 2h8a1 1 0 000-2H8z" opacity=".2" />
          <path d="M20 8.5l-8 5.5-8-5.5V17a1 1 0 001 1h14a1 1 0 001-1V8.5zM4 7h16a1 1 0 011 1v.5l-9 6-9-6V8a1 1 0 011-1z" />
        </svg>
      ),
      action: openAppleMail,
      color: "#1d4ed8",
    },
    {
      id: "default",
      label: "Default Email App",
      description: "Opens your OS default client",
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 7l10 7 10-7" />
        </svg>
      ),
      action: openDefaultEmail,
      color: "#7c3aed",
    },
    {
      id: "copy",
      label: copied ? "Copied!" : "Copy Email Address",
      description: EMAIL,
      icon: copied ? (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      ),
      action: copyToClipboard,
      color: copied ? "#059669" : "#0891b2",
    },
  ];

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="email-dialog-title"
    >
      <div
        className="relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "var(--surface, #1e1e2e)",
          border: "1px solid var(--border, rgba(255,255,255,0.1))",
          animation: "email-dialog-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
        }}
      >
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div>
            <h3 id="email-dialog-title" className="text-base font-bold text-[var(--text-primary)]">
              Send an Email
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Choose how you'd like to get in touch</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-3 pb-5 space-y-1.5">
          {options.map((opt) => (
            <button
              key={opt.id}
              onClick={opt.action}
              className="w-full flex items-center gap-4 rounded-xl px-3 py-3 text-left transition-all duration-150 hover:bg-[var(--surface-hover)] group"
              style={{ border: "1px solid transparent" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = `${opt.color}40`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
              }}
            >
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-110"
                style={{ background: `${opt.color}18`, color: opt.color }}
              >
                {opt.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">{opt.label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{opt.description}</p>
              </div>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 shrink-0 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes email-dialog-in {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

export function ResumeEmailButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold bg-white text-blue-900 hover:bg-blue-50 transition-colors cursor-pointer"
      >
        &#9993; Send an email
      </button>
      {open && <EmailDialog onClose={() => setOpen(false)} />}
    </>
  );
}
