import { HeroCard } from "./HeroCard";
import { SkillsCard } from "./SkillsCard";
import { AboutCard } from "./AboutCard";
import { ProjectsCard } from "./ProjectsCard";
import { BlogPreviewCard } from "./BlogPreviewCard";
import { CTACard } from "./CTACard";

export function BentoDashboard() {
  return (
    <div className="bg-mesh">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <HeroCard className="lg:col-span-2" />
        <SkillsCard />
        <AboutCard />
        <ProjectsCard className="lg:col-span-2" />
        <BlogPreviewCard className="lg:col-span-2" />
        <CTACard />
      </div>
    </div>
  );
}
