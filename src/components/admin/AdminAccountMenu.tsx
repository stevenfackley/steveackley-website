"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function AdminAccountMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const itemCls = cn(
    "block w-full text-left px-4 py-2 text-sm",
    "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]",
    "transition-colors duration-150"
  );

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1 text-sm",
          "text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors duration-150"
        )}
      >
        Account
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className={cn("h-3 w-3 transition-transform duration-150", open && "rotate-180")}
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 min-w-[140px] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg py-1 z-50">
          <Link
            href="/admin/account"
            onClick={() => setOpen(false)}
            className={itemCls}
          >
            My Account
          </Link>
          <div className="my-1 border-t border-[var(--border)]" />
          <Link
            href="/admin/settings"
            onClick={() => setOpen(false)}
            className={itemCls}
          >
            Settings
          </Link>
        </div>
      )}
    </div>
  );
}
