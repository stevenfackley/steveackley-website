import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { getSiteSetting, SETTING_KEYS } from "@/lib/settings";

export async function HeroCard({ className }: { className?: string }) {
  const avatarUrl = await getSiteSetting(SETTING_KEYS.AVATAR_URL);

  return (
    <Card
      className={cn(
        "relative overflow-hidden min-h-[240px] p-0",
        className
      )}
    >
      {/* Gradient background strip */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            "linear-gradient(135deg, rgba(37,99,235,0.12) 0%, rgba(124,58,237,0.08) 60%, transparent 100%)",
        }}
      />
      {/* Decorative blurred orbs */}
      <div
        className="absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }}
        aria-hidden
      />

      <div className="relative z-10 flex flex-col justify-between h-full p-8 gap-6">
        {/* Top row — avatar + name */}
        <div className="flex items-start gap-5">
          {/* Avatar with gradient ring */}
          <div className="relative shrink-0">
            <div
              className="absolute inset-0 rounded-full blur-sm opacity-60"
              style={{
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                transform: "scale(1.12)",
              }}
              aria-hidden
            />
            <Image
              src={avatarUrl}
              alt="Steve Ackley"
              width={72}
              height={72}
              className="relative rounded-full ring-2 ring-white/20 object-cover"
              priority
            />
          </div>

          {/* Name + title */}
          <div className="pt-1 min-w-0">
            <h1
              className="text-2xl font-extrabold leading-tight tracking-tight gradient-text"
            >
              Steve Ackley
            </h1>
            <p className="text-sm font-medium text-[var(--text-secondary)] mt-0.5">
              Software Engineer · .NET · Azure · Full-Stack
            </p>
          </div>
        </div>

        {/* Bio summary */}
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-xl">
          12+ years designing and shipping enterprise-grade software. Core stack is{" "}
          <span className="text-[var(--text-primary)] font-medium">C# / .NET</span> on{" "}
          <span className="text-[var(--text-primary)] font-medium">Azure</span>, with deep experience across
          full-stack, cloud architecture, and technical leadership.
        </p>

        {/* Status row */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--surface-hover)] border border-[var(--border)] rounded-full px-3 py-1.5">
            <span
              className="h-2 w-2 rounded-full bg-emerald-500 pulse-dot shrink-0"
            />
            Available for opportunities
          </span>
          <span className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--surface-hover)] border border-[var(--border)] rounded-full px-3 py-1.5">
            📍 United States
          </span>
        </div>
      </div>
    </Card>
  );
}
