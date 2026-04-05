import Link from "next/link";

export function PortalNav({
  links,
  current,
}: {
  links: readonly { href: string; label: string }[];
  current: string;
}) {
  return (
    <nav className="portal-nav" aria-label="Portal navigation">
      {links.map((link) =>
        link.href === current ? (
          <span key={link.href} style={{ color: "var(--text)", borderColor: "rgba(125, 211, 252, 0.35)" }}>
            {link.label}
          </span>
        ) : (
          <Link key={link.href} href={link.href}>
            {link.label}
          </Link>
        ),
      )}
    </nav>
  );
}
