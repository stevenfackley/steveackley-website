import { PortalNav } from "@/components/portal-nav";
import { clientLinks } from "@/lib/navigation";

export default function ClientAccountPage() {
  return (
    <>
      <PortalNav links={clientLinks} current="/client/account" />
      <div className="portal-grid cols-2">
        <section className="portal-card">
          <div className="portal-card-topline">
            <p className="portal-kicker">Profile Surface</p>
            <span className="portal-chip">Account</span>
          </div>
          <h2 className="portal-section-title">Account details belong in a focused route.</h2>
          <p className="portal-muted">
            This screen is laid out for authenticated company profile details, billing contacts, and account-level
            preferences without mixing those concerns into the dashboard.
          </p>
        </section>

        <section className="portal-card">
          <div className="portal-card-topline">
            <p className="portal-kicker">Planned modules</p>
            <span className="portal-chip">Ready slots</span>
          </div>
          <ul className="portal-feature-list">
            <li>Company and primary contact information</li>
            <li>Communication preferences and notification controls</li>
            <li>Secure profile maintenance and audit visibility</li>
          </ul>
        </section>
      </div>
    </>
  );
}
