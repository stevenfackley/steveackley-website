import { cn } from "@/lib/utils";
import Link from "next/link";
import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

interface LinkButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href: string;
  external?: boolean;
  className?: string;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-[var(--accent)] text-white",
    "hover:bg-[var(--accent-hover)]",
    "focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
  ),
  secondary: cn(
    "bg-[var(--surface)] text-[var(--text-primary)]",
    "border border-[var(--border)]",
    "hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)]"
  ),
  ghost: cn(
    "text-[var(--text-secondary)]",
    "hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
  ),
  danger: cn(
    "bg-red-600 text-white",
    "hover:bg-red-700",
    "focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
  ),
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs font-medium rounded-lg",
  md: "px-4 py-2 text-sm font-medium rounded-xl",
  lg: "px-6 py-3 text-base font-medium rounded-xl",
};

const baseClasses = cn(
  "inline-flex items-center justify-center gap-2",
  "transition-all duration-150",
  "disabled:opacity-50 disabled:pointer-events-none",
  "cursor-pointer"
);

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <svg
          className="h-4 w-4 animate-spin"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

export function LinkButton({
  variant = "primary",
  size = "md",
  href,
  external = false,
  className,
  children,
}: LinkButtonProps) {
  const classes = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
