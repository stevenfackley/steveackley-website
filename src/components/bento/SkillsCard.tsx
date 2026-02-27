import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

// Top skills for the home bento card (Microsoft-first)
const skills = [
  { name: "C# / .NET",          level: 5 },
  { name: "Azure Cloud",        level: 5 },
  { name: "SQL Server",         level: 5 },
  { name: "ASP.NET / Web API",  level: 5 },
  { name: "Angular",            level: 4 },
  { name: "Docker / DevOps",    level: 4 },
];

export function SkillsCard({ className }: { className?: string }) {
  return (
    <Card className={cn("p-6", className)}>
      <CardHeader label="Skills & Stack" />
      <ul className="space-y-3 mt-2">
        {skills.map((skill) => (
          <li key={skill.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[var(--text-secondary)]">{skill.name}</span>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-4 rounded-full transition-colors"
                    style={
                      i < skill.level
                        ? { background: "linear-gradient(90deg, #2563eb, #7c3aed)" }
                        : { background: "var(--border)" }
                    }
                  />
                ))}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
