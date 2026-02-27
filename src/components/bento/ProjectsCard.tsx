import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  getPublicRepos,
  enrichRepos,
  PRIVATE_PROJECTS,
  type EnrichedRepo,
  type TechBadge,
} from "@/lib/github";

// Repos to highlight (in order of preference)
const FEATURED_NAMES = ["OmniSift", "axon-main", "TrustLog", "steveackley-website", "SortCompare"];

export async function ProjectsCard({ className }: { className?: string }) {
  const rawRepos = await getPublicRepos();
  const enriched = await enrichRepos(rawRepos);

  // Sort: featured names first, then by updated date
  const sorted = [...enriched].sort((a, b) => {
    const ai = FEATURED_NAMES.indexOf(a.name);
    const bi = FEATURED_NAMES.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const publicToShow = sorted.slice(0, 4);

  return (
    <Card className={cn("p-6", className)}>
      <CardHeader label="Projects & Portfolio" />
      <div className="space-y-1.5 mt-1">
        {/* P1 Ops Hub — private, always first */}
        {PRIVATE_PROJECTS.map((p) => (
          <PrivateProjectItem key={p.name} project={p} />
        ))}
        {/* Public GitHub repos */}
        {publicToShow.map((repo) => (
          <PublicProjectItem key={repo.name} repo={repo} />
        ))}
      </div>
    </Card>
  );
}

function TechBadges({ badges }: { badges: TechBadge[] }) {
  if (!badges.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2 ml-10">
      {badges.map((b) =>
        b.href ? (
          <a key={b.imageUrl} href={b.href} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.imageUrl} alt={b.label} className="h-5" />
          </a>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={b.imageUrl} src={b.imageUrl} alt={b.label} className="h-5" />
        )
      )}
    </div>
  );
}

function PrivateProjectItem({ project }: { project: (typeof PRIVATE_PROJECTS)[0] }) {
  const inner = (
    <div className="rounded-xl px-3 py-2.5 border border-transparent transition-all duration-150 hover:bg-[var(--surface-hover)] hover:border-[var(--border)] cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 text-white"
            style={{ background: "linear-gradient(135deg, #2563eb, #7c3aed)" }}
          >
            P
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">{project.name}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">Private repository</p>
          </div>
        </div>
        <Badge variant="success">Active</Badge>
      </div>
      <TechBadges badges={project.badges} />
    </div>
  );

  if (project.html_url && project.html_url !== "#") {
    return (
      <a href={project.html_url} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    );
  }
  return inner;
}

function PublicProjectItem({ repo }: { repo: EnrichedRepo }) {
  const year = new Date(repo.created_at).getFullYear();
  return (
    <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
      <div className="rounded-xl px-3 py-2.5 border border-transparent transition-all duration-150 hover:bg-[var(--surface-hover)] hover:border-[var(--border)] cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 bg-[var(--surface-hover)] text-[var(--text-secondary)]">
              {repo.name[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">{repo.name}</p>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {repo.language ?? "Code"} &middot; {year}
              </p>
            </div>
          </div>
          <Badge variant="info">GitHub</Badge>
        </div>
        <TechBadges badges={repo.badges} />
      </div>
    </a>
  );
}
