import { getSettingsSnapshot } from "@/lib/dashboard";
import { PortalNav } from "@/components/portal-nav";
import { adminLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettingsSnapshot();

  return (
    <>
      <PortalNav links={adminLinks} current="/admin/settings" />
      <section className="portal-card portal-grid-spaced">
        <div className="portal-listing-header">
          <div>
            <p className="portal-kicker">Configuration Snapshot</p>
            <h2 className="portal-section-title">Settings</h2>
          </div>
          <div className="portal-inline-metrics">
            <div className="portal-inline-metric">
              <strong>{settings.length}</strong>
              <span>keys</span>
            </div>
          </div>
        </div>
        <table className="portal-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <tr key={setting.key}>
                <td>{setting.key}</td>
                <td className="portal-muted">{setting.value}</td>
                <td>{setting.updatedAt?.toLocaleString() ?? "Unknown"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
