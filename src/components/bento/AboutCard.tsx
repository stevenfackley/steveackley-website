import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

function MasonIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4", className)}
      aria-label="Masonic square and compasses"
    >
      <path d="M12 2 L3 18 M12 2 L21 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="2" r="1.5" fill="currentColor" />
      <path d="M3 6 L12 22 L21 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="12" textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="bold" fill="currentColor" fontFamily="Georgia, serif">G</text>
    </svg>
  );
}

const interests = [
  { icon: "🔧", label: "Tinkering & Tech" },
  { icon: "🌲", label: "Camping & Hiking" },
  { icon: "🎬", label: "Movies" },
  { icon: "👽", label: "Aliens & The Unknown" },
  { icon: null,  label: "Freemasonry", mason: true },
  { icon: "⌚",  label: "Fitness (WHOOP)" },
  { icon: "🚗",  label: "Cars" },
  { icon: "☕",  label: "Craft Coffee" },
  { icon: "🌿",  label: "Fragrances" },
];

export function AboutCard({ className }: { className?: string }) {
  return (
    <Card className={cn("p-6", className)}>
      <CardHeader label="About" />
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
        Staff Software Engineer at{" "}
        <span className="text-[var(--text-primary)] font-medium">Lockheed Martin</span>{" "}
        with <span className="text-[var(--text-primary)] font-medium">12+ years</span> in the
        Microsoft ecosystem. C#, .NET, Azure, Angular, and SQL Server.
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {interests.map((interest) => (
          <div
            key={interest.label}
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 bg-[var(--surface-hover)] text-xs text-[var(--text-secondary)]"
          >
            {interest.mason ? (
              <MasonIcon className="text-[var(--accent)] shrink-0" />
            ) : (
              <span>{interest.icon}</span>
            )}
            <span>{interest.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
