import type { ReactNode } from "react";
import { PortalFrame } from "@/components/portal-frame";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <PortalFrame title="Admin Portal" eyebrow="Operational Surface">{children}</PortalFrame>;
}
