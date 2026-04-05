import { getRecentMessages } from "@/lib/dashboard";
import { PortalNav } from "@/components/portal-nav";
import { adminLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const messages = await getRecentMessages();

  return (
    <>
      <PortalNav links={adminLinks} current="/admin/messages" />
      <section className="portal-card">
        <table className="portal-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Type</th>
              <th>Read</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((message) => (
              <tr key={message.id}>
                <td>
                  <div style={{ fontWeight: 600 }}>{message.subject}</div>
                  <div className="portal-muted">{message.body.slice(0, 120)}</div>
                </td>
                <td>{message.type}</td>
                <td>{message.read ? "Yes" : "No"}</td>
                <td>{message.createdAt?.toLocaleString() ?? "Unknown"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
