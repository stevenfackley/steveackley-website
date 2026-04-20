import { useIntersectionVisible } from "@/hooks/useIntersectionVisible";
import type { ResumeSkill } from "@/content/types";

const CATEGORY_COLORS: Record<string, string> = {
  Microsoft: "from-blue-600 to-blue-500",
  Frontend: "from-purple-600 to-blue-500",
  Data: "from-emerald-600 to-teal-500",
  DevOps: "from-orange-500 to-amber-500",
};

function SkillBar({
  name,
  pct,
  category,
  delay,
  visible,
}: {
  name: string;
  pct: number;
  category: string;
  delay: number;
  visible: boolean;
}) {
  const gradient = CATEGORY_COLORS[category] ?? "from-blue-600 to-purple-600";
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-[var(--text-primary)]">{name}</span>
        <span className="text-xs font-semibold text-[var(--text-muted)] tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-[var(--border)] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-1000 ease-out`}
          style={{
            width: visible ? `${pct}%` : "0%",
            transitionDelay: visible ? `${delay}ms` : "0ms",
          }}
        />
      </div>
    </div>
  );
}

export function ResumeSkills({ coreSkills }: { coreSkills: ResumeSkill[] }) {
  const [ref, visible] = useIntersectionVisible();

  const microsoft = coreSkills.filter((s) => s.category === "Microsoft");
  const frontend = coreSkills.filter((s) => s.category === "Frontend");
  const data = coreSkills.filter((s) => s.category === "Data");
  const devops = coreSkills.filter((s) => s.category === "DevOps");

  const groups: Array<{ label: string; skills: ResumeSkill[]; base: number }> = [
    { label: "🪟 Microsoft Stack", skills: microsoft, base: 0 },
    { label: "🖥 Frontend", skills: frontend, base: microsoft.length * 80 },
    { label: "📊 Data & BI", skills: data, base: (microsoft.length + frontend.length) * 80 },
    {
      label: "⚙ DevOps & Cloud Tools",
      skills: devops,
      base: (microsoft.length + frontend.length + data.length) * 80,
    },
  ];

  return (
    <div ref={ref}>
      <div className="grid gap-6 md:grid-cols-2">
        {groups.map(({ label, skills, base }) => (
          <div key={label} className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-xs font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-4">
              {label}
            </h3>
            <div className="space-y-4">
              {skills.map((s, i) => (
                <SkillBar key={s.name} {...s} delay={base + i * 80} visible={visible} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
