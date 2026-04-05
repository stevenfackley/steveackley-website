import Link from "next/link";
import { getAdminOverview } from "@/lib/dashboard";
import { PortalNav } from "@/components/portal-nav";
import { adminLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const overview = await getAdminOverview();
  const publishedRate =
    overview.posts === 0
      ? "0%"
      : `${Math.round((overview.publishedPosts / overview.posts) * 100)}%`;
  const clientCoverage =
    overview.users === 0 ? "0%" : `${Math.round((overview.clients / overview.users) * 100)}%`;

  return (
    <>
      <PortalNav links={adminLinks} current="/admin/dashboard" />
      <section className="portal-card portal-callout">
        <div>
          <p className="portal-kicker">Live Overview</p>
          <h2 className="portal-section-title">Operational pulse</h2>
          <p className="portal-muted">
            The portal is now carrying real counts from posts, users, apps, and messages. This dashboard surfaces the
            fastest scan path before you jump into the detailed management views.
          </p>
        </div>
        <div className="portal-callout-metrics">
          <div>
            <span className="portal-mini-stat-label">Published rate</span>
            <strong>{publishedRate}</strong>
          </div>
          <div>
            <span className="portal-mini-stat-label">Client share</span>
            <strong>{clientCoverage}</strong>
          </div>
        </div>
      </section>

      <div className="portal-grid cols-2 portal-stat-grid">
        {[
          { label: "Posts", value: overview.posts, helper: `${overview.publishedPosts} published` },
          { label: "Users", value: overview.users, helper: `${overview.clients} client accounts` },
          { label: "Apps", value: overview.apps, helper: "Managed client applications" },
          { label: "Messages", value: overview.messages, helper: "Recent communication records" },
        ].map((card) => (
          <section key={card.label} className="portal-card portal-stat-card">
            <p className="portal-kicker">{card.label}</p>
            <p className="portal-stat-value">{card.value}</p>
            <p className="portal-muted">{card.helper}</p>
          </section>
        ))}
      </div>

      <section className="portal-grid cols-2 portal-grid-spaced">
        <article className="portal-card">
          <div className="portal-card-topline">
            <p className="portal-kicker">Quick Actions</p>
            <span className="portal-chip">High-traffic routes</span>
          </div>
          <h3 className="portal-subtitle">Move directly into the main operating screens.</h3>
          <div className="portal-actions">
            <Link href="/admin/posts">Review posts</Link>
            <Link href="/admin/settings">Review site settings</Link>
            <Link href="/admin/messages">Review messages</Link>
          </div>
        </article>

        <article className="portal-card">
          <div className="portal-card-topline">
            <p className="portal-kicker">Current State</p>
            <span className="portal-chip">UI polish pass</span>
          </div>
          <h3 className="portal-subtitle">The route map is established and visually unified.</h3>
          <p className="portal-muted">
            This pass turns the portal into a coherent product surface instead of a migration staging area, while
            keeping the editing routes and server-side data access intact.
          </p>
        </article>
      </section>

      <section className="portal-card portal-grid-spaced">
        <div className="portal-card-topline">
          <p className="portal-kicker">Coverage</p>
          <span className="portal-chip">Admin sections</span>
        </div>
        <div className="portal-inline-metrics">
          <div className="portal-inline-metric">
            <strong>{overview.posts}</strong>
            <span>posts indexed</span>
          </div>
          <div className="portal-inline-metric">
            <strong>{overview.messages}</strong>
            <span>messages tracked</span>
          </div>
          <div className="portal-inline-metric">
            <strong>{overview.apps}</strong>
            <span>apps cataloged</span>
          </div>
        </div>
        <div className="portal-actions">
          <Link href="/admin/posts">Review posts</Link>
          <Link href="/admin/users">Review users</Link>
          <Link href="/admin/apps">Review apps</Link>
        </div>
      </section>
    </>
  );
}
