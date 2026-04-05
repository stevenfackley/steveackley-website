import Link from "next/link";
import { getPostsSnapshot } from "@/lib/dashboard";
import { PortalNav } from "@/components/portal-nav";
import { adminLinks } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const posts = await getPostsSnapshot();

  return (
    <>
      <PortalNav links={adminLinks} current="/admin/posts" />
      <section className="portal-card">
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
                  <Link href={`/admin/posts/${post.id}`}>{post.title}</Link>
                </td>
                <td className="portal-muted">{post.slug}</td>
                <td>{post.published ? "Yes" : "No"}</td>
                <td>{post.updatedAt?.toLocaleString() ?? "Unknown"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
