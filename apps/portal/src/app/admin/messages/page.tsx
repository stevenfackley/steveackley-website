import { getRecentMessages } from "@/lib/dashboard";
import { PortalNav } from "@/components/portal-nav";
import { adminLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const messages = await getRecentMessages();
  const unreadCount = messages.filter((message) => !message.read).length;

  return (
    <>
      <PortalNav links={adminLinks} current="/admin/messages" />
      <section className="portal-card portal-grid-spaced">
        <div className="portal-listing-header">
          <div>
            <p className="portal-kicker">Inbox Snapshot</p>
            <h2 className="portal-section-title">Messages</h2>
          </div>
          <div className="portal-inline-metrics">
            <div className="portal-inline-metric">
              <strong>{messages.length}</strong>
              <span>recent</span>
            </div>
            <div className="portal-inline-metric">
              <strong>{unreadCount}</strong>
              <span>unread</span>
            </div>
          </div>
        </div>
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
                <td>
                  <span className="portal-status-pill">{message.type}</span>
                </td>
                <td>
                  <span className={`portal-status-pill${message.read ? "" : " is-attention"}`}>
                    {message.read ? "Read" : "Unread"}
                  </span>
                </td>
                <td>{message.createdAt?.toLocaleString() ?? "Unknown"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
