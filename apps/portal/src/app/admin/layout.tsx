import type { ReactNode } from "react";
import { PortalFrame } from "@/components/portal-frame";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <PortalFrame
      title="Admin Portal"
      eyebrow="Operational Surface"
      description="Run publishing, client operations, messaging, and delivery workflows from a single control layer built for quick scanning."
      aside={
        <div className="portal-hero-metrics">
          <div className="portal-mini-stat">
            <span className="portal-mini-stat-label">Surface</span>
            <strong>Admin</strong>
          </div>
          <div className="portal-mini-stat">
            <span className="portal-mini-stat-label">Focus</span>
            <strong>Operations</strong>
          </div>
          <div className="portal-mini-stat">
            <span className="portal-mini-stat-label">Mode</span>
            <strong>Live data</strong>
          </div>
        </div>
      }
    >
      {children}
    </PortalFrame>
  );
}
