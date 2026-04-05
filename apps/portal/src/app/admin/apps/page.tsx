import { getAppsSnapshot } from "@/lib/dashboard";
import { PortalNav } from "@/components/portal-nav";
import { adminLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AdminAppsPage() {
  const apps = await getAppsSnapshot();
  const liveCount = apps.filter((app) => app.isLive).length;

  return (
    <>
      <PortalNav links={adminLinks} current="/admin/apps" />
      <section className="portal-card portal-grid-spaced">
        <div className="portal-listing-header">
          <div>
            <p className="portal-kicker">Delivery Inventory</p>
            <h2 className="portal-section-title">Apps</h2>
          </div>
          <div className="portal-inline-metrics">
            <div className="portal-inline-metric">
              <strong>{apps.length}</strong>
              <span>tracked</span>
            </div>
            <div className="portal-inline-metric">
              <strong>{liveCount}</strong>
              <span>live</span>
            </div>
          </div>
        </div>
        <table className="portal-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Environment</th>
              <th>URL</th>
              <th>Live</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app) => (
              <tr key={app.id}>
                <td>{app.name}</td>
                <td>
                  <span className="portal-status-pill">{app.environment}</span>
                </td>
                <td className="portal-muted">{app.url}</td>
                <td>
                  <span className={`portal-status-pill${app.isLive ? " is-positive" : ""}`}>
                    {app.isLive ? "Live" : "Offline"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
