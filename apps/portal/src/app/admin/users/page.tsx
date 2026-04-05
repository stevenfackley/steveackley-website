import { getUsersSnapshot } from "@/lib/dashboard";
import { PortalNav } from "@/components/portal-nav";
import { adminLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await getUsersSnapshot();

  return (
    <>
      <PortalNav links={adminLinks} current="/admin/users" />
      <section className="portal-card">
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
                <td>{user.role}</td>
                <td>{user.companyName ?? "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
