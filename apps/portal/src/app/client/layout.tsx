import type { ReactNode } from "react";
import { PortalFrame } from "@/components/portal-frame";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return <PortalFrame title="Client Portal" eyebrow="Authenticated Client Surface">{children}</PortalFrame>;
}
