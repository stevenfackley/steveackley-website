import { cn } from "@/lib/utils";
import Link from "next/link";

interface CardProps {
  href?: string;
  className?: string;
  children: React.ReactNode;
  external?: boolean;
}

/**
 * Base bento card — used for all dashboard tiles.
 * Optionally navigable via href.
 */
export function Card({ href, className, children, external = false }: CardProps) {
  const base = cn(
    "bg-[var(--surface)] border border-[var(--border)] rounded-2xl",
    "transition-all duration-200",
    href && [
      "hover:border-[var(--border-hover)]",
      "hover:-translate-y-0.5 hover:shadow-sm",
      "cursor-pointer",
    ],
    className
  );

  if (href && external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={base}>
        {children}
      </a>
    );
  }

  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    );
  }

  return <div className={base}>{children}</div>;
}

interface CardHeaderProps {
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

export function CardHeader({ label, className, children }: CardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      {label && (
        <span className="text-xs font-medium tracking-widest uppercase text-[var(--text-muted)]">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}
