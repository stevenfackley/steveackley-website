import Link from "next/link";
import { getPostsSnapshot } from "@/lib/dashboard";
import { PortalNav } from "@/components/portal-nav";
import { adminLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const posts = await getPostsSnapshot();
  const publishedCount = posts.filter((post) => post.published).length;

  return (
    <>
      <PortalNav links={adminLinks} current="/admin/posts" />
      <section className="portal-card portal-grid-spaced">
        <div className="portal-listing-header">
          <div>
            <p className="portal-kicker">Content Library</p>
            <h2 className="portal-section-title">Posts</h2>
          </div>
          <div className="portal-inline-metrics">
            <div className="portal-inline-metric">
              <strong>{posts.length}</strong>
              <span>total</span>
            </div>
            <div className="portal-inline-metric">
              <strong>{publishedCount}</strong>
              <span>published</span>
            </div>
          </div>
        </div>
        <table className="portal-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Slug</th>
              <th>Published</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td>
                  <Link className="portal-table-link" href={`/admin/posts/${post.id}`}>
                    {post.title}
                  </Link>
                </td>
                <td className="portal-muted">{post.slug}</td>
                <td>
                  <span className={`portal-status-pill${post.published ? " is-positive" : ""}`}>
                    {post.published ? "Published" : "Draft"}
                  </span>
                </td>
                <td>{post.updatedAt?.toLocaleString() ?? "Unknown"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
