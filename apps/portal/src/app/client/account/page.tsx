import { PortalNav } from "@/components/portal-nav";
import { clientLinks } from "@/lib/navigation";

export default function ClientAccountPage() {
  return (
    <>
      <PortalNav links={clientLinks} current="/client/account" />
      <section className="portal-card">
        <h2 style={{ marginTop: 0 }}>Client account</h2>
        <p className="portal-muted" style={{ lineHeight: 1.7 }}>
          Account management now has a dedicated route boundary inside the portal app, ready for auth-aware forms and
          profile updates.
        </p>
      </section>
    </>
  );
}
