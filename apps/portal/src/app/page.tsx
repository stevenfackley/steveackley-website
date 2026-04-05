import Link from "next/link";
import { PortalFrame } from "@/components/portal-frame";

export default function PortalHomePage() {
  return (
    <PortalFrame title="Portal" eyebrow="Next.js App Router">
      <div className="portal-grid cols-2">
        <section className="portal-card">
          <p className="portal-badge">Admin Surface</p>
          <h2>Operational ownership moved here</h2>
          <p className="portal-muted">
            Post management, settings, uploads, messages, users, clients, and future app workflows belong in the
            portal app instead of Astro.
          </p>
          <div className="portal-actions" style={{ marginTop: "1rem" }}>
            <Link href="/admin/dashboard">Open admin dashboard</Link>
          </div>
        </section>

        <section className="portal-card">
          <p className="portal-badge">Client Surface</p>
          <h2>Authenticated client area</h2>
          <p className="portal-muted">
            Client dashboards and account management now have a dedicated application boundary and can grow without
            pushing Astro into SPA territory.
          </p>
          <div className="portal-actions" style={{ marginTop: "1rem" }}>
            <Link href="/client/dashboard">Open client dashboard</Link>
          </div>
        </section>
      </div>
    </PortalFrame>
  );
}
