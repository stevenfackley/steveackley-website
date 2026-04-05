import Link from "next/link";
import { getAdminOverview } from "@/lib/dashboard";
import { PortalNav } from "@/components/portal-nav";
import { adminLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const overview = await getAdminOverview();

  return (
    <>
      <PortalNav links={adminLinks} current="/admin/dashboard" />
      <div className="portal-grid cols-2">
        {[
          { label: "Posts", value: overview.posts, helper: `${overview.publishedPosts} published` },
          { label: "Users", value: overview.users, helper: `${overview.clients} client accounts` },
          { label: "Apps", value: overview.apps, helper: "Managed client applications" },
          { label: "Messages", value: overview.messages, helper: "Recent communication records" },
        ].map((card) => (
          <section key={card.label} className="portal-card">
            <p className="portal-kicker">{card.label}</p>
            <p style={{ fontSize: "2rem", margin: "0.2rem 0" }}>{card.value}</p>
            <p className="portal-muted">{card.helper}</p>
          </section>
        ))}
      </div>
      <section className="portal-card" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Migration Status</h2>
        <p className="portal-muted" style={{ lineHeight: 1.7 }}>
          The portal app now owns the route map and shared server-side data access. The next phase is swapping the
          placeholder/read-only pages for full interactive auth, editing, and workflow components.
        </p>
        <div className="portal-actions" style={{ marginTop: "1rem" }}>
          <Link href="/admin/posts">Review posts</Link>
          <Link href="/admin/settings">Review site settings</Link>
          <Link href="/admin/messages">Review messages</Link>
        </div>
      </section>
    </>
  );
}
