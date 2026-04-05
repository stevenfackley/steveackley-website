import { getAppsSnapshot } from "@/lib/dashboard";
import { PortalNav } from "@/components/portal-nav";
import { adminLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AdminAppsPage() {
  const apps = await getAppsSnapshot();

  return (
    <>
      <PortalNav links={adminLinks} current="/admin/apps" />
      <section className="portal-card">
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
                <td>{app.environment}</td>
                <td className="portal-muted">{app.url}</td>
                <td>{app.isLive ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
