import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
export function CTACard({ className }: { className?: string }) {
  const linkedin = process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "#";
  const email = process.env.NEXT_PUBLIC_EMAIL ?? "stevenfackley@gmail.com";
  const btn = (extra: string) => cn("flex items-center gap-3 rounded-xl px-4 py-3 border text-sm font-medium transition-all duration-150", extra);
  return (
    <Card className={cn("p-6 flex flex-col justify-between", className)}>
      <div>
        <CardHeader label="Let's Connect" />
        <p className="text-sm text-[var(--text-secondary)] mb-5">Open to new opportunities, collaborations, and interesting conversations.</p>
      </div>
      <div className="space-y-2">
        <a href={linkedin} target="_blank" rel="noopener noreferrer" className={btn("bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]")}>
          LinkedIn ↗
        </a>
        <a href={`mailto:${email}`} className={btn("bg-[var(--surface-hover)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]")}>
          Send an Email
        </a>
        <a href="/resume.pdf" download="Steve-Ackley-Resume.pdf" className={btn("bg-[var(--accent)] border-[var(--accent)] text-white hover:bg-[var(--accent-hover)]")}>
          ↓ Download Resume
        </a>
      </div>
    </Card>
  );
}
