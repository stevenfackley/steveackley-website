import Link from "next/link";
import { PortalFrame } from "@/components/portal-frame";

export default function LoginPage() {
  return (
    <PortalFrame title="Portal Login" eyebrow="Authentication Entry">
      <section className="portal-card">
        <p className="portal-muted" style={{ lineHeight: 1.7 }}>
          Better Auth is now exposed through the portal app so future login UX and session enforcement can live in the
          same framework as the rest of the authenticated experience.
        </p>
        <div className="portal-actions" style={{ marginTop: "1rem" }}>
          <Link href="/admin/dashboard">Continue to admin routes</Link>
          <Link href="/client/dashboard">Continue to client routes</Link>
        </div>
      </section>
    </PortalFrame>
  );
}
