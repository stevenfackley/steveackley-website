import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getSiteSetting, SETTING_KEYS } from "@/lib/settings";
import { auth } from "@/lib/auth";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/resume", label: "Resume" },
  { href: "/blog", label: "Blog" },
];

export async function Nav() {
  const [avatarUrl, session] = await Promise.all([
    getSiteSetting(SETTING_KEYS.AVATAR_URL),
    auth(),
  ]);

  const role = session?.user?.role;

  // Determine the portal button based on auth state
  const portalHref =
    role === "ADMIN"
      ? "/admin/dashboard"
      : role === "CLIENT"
        ? "/client/dashboard"
        : "/admin/login";

  const portalLabel =
    role === "ADMIN"
      ? "Admin Portal"
      : role === "CLIENT"
        ? "Client Portal"
        : "Sign In";

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">

          {/* Logo / Name with avatar */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
          >
            <Image
              src={avatarUrl}
              alt="Steve Ackley"
              width={28}
              height={28}
              className="rounded-full ring-1 ring-[var(--border)] group-hover:ring-[var(--accent)] transition-all duration-150 object-cover"
            />
            <span className={cn(
              "text-sm font-semibold tracking-tight",
              "text-[var(--text-primary)] group-hover:text-[var(--accent)]",
              "transition-colors duration-150"
            )}>
              Steve Ackley
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm px-3 py-1.5 rounded-lg",
                  "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]",
                  "transition-colors duration-150"
                )}
              >
                {link.label}
              </Link>
            ))}

            {/* Portal button — context-aware based on auth role */}
            <Link
              href={portalHref}
              className={cn(
                "ml-2 text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5",
                "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
                "border border-[var(--border)] hover:border-[var(--border-hover)]",
                "transition-all duration-150"
              )}
              title={portalLabel}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="h-3.5 w-3.5"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1ZM6 4.5a2 2 0 1 1 4 0V6H6V4.5Z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs hidden sm:inline">{portalLabel}</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
