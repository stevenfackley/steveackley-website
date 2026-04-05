import { PortalNav } from "@/components/portal-nav";
import { clientLinks } from "@/lib/navigation";

export default function ClientMessagesPage() {
  return (
    <>
      <PortalNav links={clientLinks} current="/client/messages" />
      <div className="portal-grid cols-2">
        <section className="portal-card">
          <div className="portal-card-topline">
            <p className="portal-kicker">Inbox Route</p>
            <span className="portal-chip">Messages</span>
          </div>
          <h2 className="portal-section-title">A dedicated home for client communication.</h2>
          <p className="portal-muted">
            The visual shell is in place for a session-aware inbox, message threads, and reply actions. When live data
            lands, this route will not need structural redesign.
          </p>
        </section>

        <section className="portal-card">
          <div className="portal-card-topline">
            <p className="portal-kicker">Expected flow</p>
            <span className="portal-chip">Conversation view</span>
          </div>
          <ul className="portal-feature-list">
            <li>Recent conversations with unread emphasis</li>
            <li>Project-linked updates and status responses</li>
            <li>Clean thread view that keeps client context intact</li>
          </ul>
        </section>
      </div>
    </>
  );
}
