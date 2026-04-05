import type { ReactNode } from "react";

export function PortalFrame({
  title,
  eyebrow,
  children,
  nav,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
  nav?: ReactNode;
}) {
  return (
    <main>
      <div className="portal-shell">
        <div style={{ marginBottom: "1.5rem" }}>
          <p className="portal-kicker">{eyebrow}</p>
          <h1 style={{ fontSize: "2.2rem", margin: "0.3rem 0 0.7rem" }}>{title}</h1>
          <p className="portal-muted" style={{ maxWidth: 720, lineHeight: 1.7 }}>
            The authenticated admin and client experience now lives in the Next.js portal app. The public Astro site
            remains focused on content publishing and presentation.
          </p>
        </div>
        {nav}
        {children}
      </div>
    </main>
  );
}
