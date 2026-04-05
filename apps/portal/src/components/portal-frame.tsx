import type { ReactNode } from "react";

export function PortalFrame({
  title,
  eyebrow,
  description,
  children,
  nav,
  aside,
}: {
  title: string;
  eyebrow: string;
  description?: string;
  children: ReactNode;
  nav?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <main>
      <div className="portal-shell">
        <section className="portal-hero">
          <div className="portal-hero-copy">
            <p className="portal-kicker">{eyebrow}</p>
            <h1 className="portal-hero-title">{title}</h1>
            <p className="portal-hero-description">
              {description ??
                "The authenticated experience now lives in the dedicated portal app, leaving the public site focused on publishing and presentation."}
            </p>
          </div>
          {aside ? <div className="portal-hero-aside">{aside}</div> : null}
        </section>
        {nav}
        {children}
      </div>
    </main>
  );
}
