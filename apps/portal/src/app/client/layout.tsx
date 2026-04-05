import type { ReactNode } from "react";
import { PortalFrame } from "@/components/portal-frame";
import { requireClientSession } from "@/lib/admin-session";

export default async function ClientLayout({ children }: { children: ReactNode }) {
  await requireClientSession();

  return (
    <PortalFrame
      title="Client Portal"
      eyebrow="Authenticated Client Surface"
      description="Give clients a clean operating view for account context, project visibility, and ongoing communication without leaking admin complexity."
      aside={
        <div className="portal-hero-metrics">
          <div className="portal-mini-stat">
            <span className="portal-mini-stat-label">Surface</span>
            <strong>Client</strong>
          </div>
          <div className="portal-mini-stat">
            <span className="portal-mini-stat-label">Priority</span>
            <strong>Clarity</strong>
          </div>
          <div className="portal-mini-stat">
            <span className="portal-mini-stat-label">Access</span>
            <strong>Private</strong>
          </div>
        </div>
      }
    >
      {children}
    </PortalFrame>
  );
}
