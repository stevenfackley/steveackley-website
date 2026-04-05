import { getClientsSnapshot } from "@/lib/dashboard";
import { PortalNav } from "@/components/portal-nav";
import { adminLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const clients = await getClientsSnapshot();

  return (
    <>
      <PortalNav links={adminLinks} current="/admin/clients" />
      <section className="portal-card portal-grid-spaced">
        <div className="portal-listing-header">
          <div>
            <p className="portal-kicker">Customer Index</p>
            <h2 className="portal-section-title">Clients</h2>
          </div>
          <div className="portal-inline-metrics">
            <div className="portal-inline-metric">
              <strong>{clients.length}</strong>
              <span>active records</span>
            </div>
          </div>
        </div>
        <table className="portal-table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id}>
                <td>{client.companyName ?? "Unknown client"}</td>
                <td>{[client.contactFirstName, client.contactLastName].filter(Boolean).join(" ") || client.name || "Unknown"}</td>
                <td>{client.email}</td>
                <td>{client.createdAt?.toLocaleDateString() ?? "Unknown"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
