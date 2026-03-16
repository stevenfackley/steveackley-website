import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, m as maybeRenderHead } from '../../../../chunks/astro/server_brmzxYiS.mjs';
import 'piccolore';
import { $ as $$AdminLayout } from '../../../../chunks/AdminLayout_C4y9P9UC.mjs';
import { P as PostForm } from '../../../../chunks/PostForm_B5828eWI.mjs';
import { d as db, p as posts } from '../../../../chunks/index_BYBdbJMu.mjs';
import { eq } from 'drizzle-orm';
export { renderers } from '../../../../renderers.mjs';

const $$Astro = createAstro();
const $$Edit = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Edit;
  const { id } = Astro2.params;
  if (!id) {
    return Astro2.redirect("/admin/dashboard");
  }
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!post) {
    return Astro2.redirect("/admin/dashboard");
  }
  return renderTemplate`${renderComponent($$result, "AdminLayout", $$AdminLayout, { "title": "Edit Post" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="max-w-4xl mx-auto"> <div class="mb-8"> <a href="/admin/dashboard" class="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
&larr; Back to Dashboard
</a> <h1 class="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] mt-4">Edit Post</h1> </div> ${renderComponent($$result2, "PostForm", PostForm, { "client:load": true, "mode": "update", "postId": id, "defaultValues": {
    title: post.title,
    content: post.content,
    excerpt: post.excerpt,
    coverImage: post.coverImage,
    published: post.published
  }, "client:component-hydration": "load", "client:component-path": "@/components/admin/PostForm", "client:component-export": "PostForm" })} </div> ` })}`;
}, "C:/Users/steve/projects/steveackleyorg/src/pages/admin/posts/[id]/edit.astro", void 0);

const $$file = "C:/Users/steve/projects/steveackleyorg/src/pages/admin/posts/[id]/edit.astro";
const $$url = "/admin/posts/[id]/edit";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Edit,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
