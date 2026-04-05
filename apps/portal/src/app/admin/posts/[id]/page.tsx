import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { PortalNav } from "@/components/portal-nav";
import { adminLinks } from "@/lib/navigation";
import { requireAdminSession } from "@/lib/admin-session";
import { db, posts } from "@shared/db";
import {
  PostEditorForm,
  type PostEditorFormState,
} from "./post-editor-form";
import { slugifyTitle } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminPostEditorPage({ params }: PageProps) {
  await requireAdminSession();

  const { id } = await params;
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

  if (!post) {
    notFound();
  }

  async function updatePost(
    _previousState: PostEditorFormState,
    formData: FormData,
  ): Promise<PostEditorFormState> {
    "use server";

    await requireAdminSession();

    const title = String(formData.get("title") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    const excerptValue = String(formData.get("excerpt") ?? "").trim();
    const coverImageValue = String(formData.get("coverImage") ?? "").trim();
    const published = String(formData.get("published") ?? "false") === "true";
    const scheduledAtValue = String(formData.get("scheduledAt") ?? "").trim();

    if (!title) {
      return { error: "Title is required." };
    }

    if (!content) {
      return { error: "Content is required." };
    }

    const scheduledAt =
      scheduledAtValue.length > 0 ? new Date(scheduledAtValue) : null;

    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      return { error: "Scheduled publish date is invalid." };
    }

    await db
      .update(posts)
      .set({
        title,
        slug: slugifyTitle(title),
        content,
        excerpt: excerptValue || null,
        coverImage: coverImageValue || null,
        published,
        scheduledAt,
        updatedAt: new Date(),
      })
      .where(eq(posts.id, id));

    revalidatePath("/admin/posts");
    revalidatePath(`/admin/posts/${id}`);
    redirect("/admin/posts");
  }

  return (
    <>
      <PortalNav links={adminLinks} current="/admin/posts" />
      <section className="portal-card">
        <div className="portal-page-header">
          <div>
            <p className="portal-kicker">Post Editor</p>
            <h2 className="portal-section-title">{post.title}</h2>
          </div>
          <div className="portal-badge">
            {post.published ? "Published" : "Draft"} · {post.slug}
          </div>
        </div>

        <PostEditorForm
          action={updatePost}
          initialPost={{
            title: post.title,
            content: post.content,
            excerpt: post.excerpt,
            coverImage: post.coverImage,
            published: post.published,
            scheduledAt: post.scheduledAt
              ? post.scheduledAt.toISOString().slice(0, 16)
              : "",
          }}
        />
      </section>
    </>
  );
}
