import Link from "next/link";
import { PortalNav } from "@/components/portal-nav";
import { clientLinks } from "@/lib/navigation";

export default function ClientDashboardPage() {
  return (
    <>
      <PortalNav links={clientLinks} current="/client/dashboard" />
      <section className="portal-card portal-callout">
        <div>
          <p className="portal-kicker">Client Overview</p>
          <h2 className="portal-section-title">A calmer project surface.</h2>
          <p className="portal-muted">
            This dashboard is structured to show status, recent communication, and account context in a much quieter
            layout than the admin side. It is ready to absorb authenticated project data as that layer comes online.
          </p>
        </div>
        <div className="portal-callout-metrics">
          <div>
            <span className="portal-mini-stat-label">Designed for</span>
            <strong>Clarity</strong>
          </div>
          <div>
            <span className="portal-mini-stat-label">Next step</span>
            <strong>Live project data</strong>
          </div>
        </div>
      </section>

      <div className="portal-grid cols-2 portal-grid-spaced">
        <section className="portal-card">
          <div className="portal-card-topline">
            <p className="portal-kicker">What belongs here</p>
            <span className="portal-chip">Primary tasks</span>
          </div>
          <ul className="portal-feature-list">
            <li>Project snapshots, milestones, and delivery checkpoints</li>
            <li>Relevant client messages and responses</li>
            <li>Account details without exposing internal admin controls</li>
          </ul>
        </section>

        <section className="portal-card">
          <div className="portal-card-topline">
            <p className="portal-kicker">Navigation</p>
            <span className="portal-chip">Current routes</span>
          </div>
          <div className="portal-actions">
            <Link href="/client/account">Open account</Link>
            <Link href="/client/messages">Open messages</Link>
          </div>
        </section>
      </div>
    </>
  );
}
