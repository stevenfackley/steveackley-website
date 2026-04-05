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
          <span key={link.href} className="portal-nav-item is-active">
            <span className="portal-nav-item-label">{link.label}</span>
          </span>
        ) : (
          <Link key={link.href} href={link.href} className="portal-nav-item">
            <span className="portal-nav-item-label">{link.label}</span>
          </Link>
        ),
      )}
    </nav>
  );
}
