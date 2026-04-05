import { PortalNav } from "@/components/portal-nav";
import { clientLinks } from "@/lib/navigation";

export default function ClientMessagesPage() {
  return (
    <>
      <PortalNav links={clientLinks} current="/client/messages" />
      <section className="portal-card">
        <h2 style={{ marginTop: 0 }}>Client messages</h2>
        <p className="portal-muted" style={{ lineHeight: 1.7 }}>
          The messaging experience now has a stable application home. Next iterations can add session-aware inbox and
          reply flows here.
        </p>
      </section>
    </>
  );
}
