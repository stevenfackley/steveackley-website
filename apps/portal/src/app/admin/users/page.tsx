import { getUsersSnapshot } from "@/lib/dashboard";
import { PortalNav } from "@/components/portal-nav";
import { adminLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await getUsersSnapshot();
  const clientCount = users.filter((user) => user.role === "CLIENT").length;

  return (
    <>
      <PortalNav links={adminLinks} current="/admin/users" />
      <section className="portal-card portal-grid-spaced">
        <div className="portal-listing-header">
          <div>
            <p className="portal-kicker">Identity Layer</p>
            <h2 className="portal-section-title">Users</h2>
          </div>
          <div className="portal-inline-metrics">
            <div className="portal-inline-metric">
              <strong>{users.length}</strong>
              <span>accounts</span>
            </div>
            <div className="portal-inline-metric">
              <strong>{clientCount}</strong>
              <span>clients</span>
            </div>
          </div>
        </div>
        <table className="portal-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Company</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name ?? "Unnamed user"}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`portal-status-pill${user.role === "CLIENT" ? " is-positive" : ""}`}>
                    {user.role}
                  </span>
                </td>
                <td>{user.companyName ?? "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
