import Link from "next/link";
import { PortalFrame } from "@/components/portal-frame";

export default function PortalHomePage() {
  return (
    <PortalFrame
      title="Control Surfaces"
      eyebrow="Next.js App Router"
      description="The portal now cleanly splits internal operations from client-facing visibility. Choose the surface that matches the session context and move directly into work."
      aside={
        <div className="portal-hero-metrics">
          <div className="portal-mini-stat">
            <span className="portal-mini-stat-label">Apps</span>
            <strong>2 surfaces</strong>
          </div>
          <div className="portal-mini-stat">
            <span className="portal-mini-stat-label">Stack</span>
            <strong>Next.js 15</strong>
          </div>
          <div className="portal-mini-stat">
            <span className="portal-mini-stat-label">Boundary</span>
            <strong>Authenticated</strong>
          </div>
        </div>
      }
    >
      <section className="portal-showcase-grid">
        <article className="portal-card portal-surface-card">
          <div className="portal-card-topline">
            <p className="portal-badge">Admin Surface</p>
            <span className="portal-chip">Publishing + Ops</span>
          </div>
          <h2>Run content, settings, delivery, and client operations from one place.</h2>
          <p className="portal-muted">
            Editorial workflows, settings snapshots, client records, application inventory, and message review all stay
            inside a focused operator shell instead of spilling into the public site.
          </p>
          <ul className="portal-feature-list">
            <li>Dashboard-level operational overview</li>
            <li>Connected post editing and settings visibility</li>
            <li>Dedicated management routes for users, clients, apps, and messages</li>
          </ul>
          <div className="portal-actions">
            <Link href="/admin/dashboard">Open admin dashboard</Link>
          </div>
        </article>

        <article className="portal-card portal-surface-card">
          <div className="portal-card-topline">
            <p className="portal-badge">Client Surface</p>
            <span className="portal-chip">Account + Messages</span>
          </div>
          <h2>Present a simpler, quieter experience for client access.</h2>
          <p className="portal-muted">
            Client-facing routes now have their own boundary and can grow into authenticated dashboards, message views,
            and account management without dragging Astro into app-level complexity.
          </p>
          <ul className="portal-feature-list">
            <li>Focused dashboard for status and deliverables</li>
            <li>Dedicated account and contact routes</li>
            <li>Ready for authenticated inbox and project visibility</li>
          </ul>
          <div className="portal-actions">
            <Link href="/client/dashboard">Open client dashboard</Link>
          </div>
        </article>
      </section>
    </PortalFrame>
  );
}
