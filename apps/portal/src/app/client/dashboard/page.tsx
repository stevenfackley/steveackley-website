import { PortalNav } from "@/components/portal-nav";
import { clientLinks } from "@/lib/navigation";

export default function ClientDashboardPage() {
  return (
    <>
      <PortalNav links={clientLinks} current="/client/dashboard" />
      <section className="portal-card">
        <h2 style={{ marginTop: 0 }}>Client dashboard</h2>
        <p className="portal-muted" style={{ lineHeight: 1.7 }}>
          This route now lives in the dedicated portal app. The next pass can port the Astro dashboard behavior into
          server components and authenticated React UI without pulling the public site into app-level complexity.
        </p>
      </section>
    </>
  );
}
