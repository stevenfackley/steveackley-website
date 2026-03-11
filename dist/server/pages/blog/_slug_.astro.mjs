import { e as createComponent, m as maybeRenderHead, u as unescapeHTML, r as renderTemplate, h as createAstro, k as renderComponent } from '../../chunks/astro/server_B-1XR7Cx.mjs';
import 'piccolore';
import { $ as $$PublicLayout } from '../../chunks/PublicLayout_BFjoUw8x.mjs';
import 'clsx';
import { a as formatDate } from '../../chunks/utils_CPMI-xBA.mjs';
import { d as db, p as posts } from '../../chunks/index_BS2BhPuU.mjs';
import { eq } from 'drizzle-orm';
export { renderers } from '../../renderers.mjs';

const $$Astro$1 = createAstro();
const $$PostContent = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$PostContent;
  const { content } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<div class="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-[var(--accent)] prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl">${unescapeHTML(content)}</div>`;
}, "C:/Users/steve/projects/steveackleyorg/src/components/blog/PostContent.astro", void 0);

const $$Astro = createAstro();
const $$slug = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$slug;
  const { slug } = Astro2.params;
  if (!slug) {
    return Astro2.redirect("/blog");
  }
  const [post] = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
  if (!post || !post.published) {
    return Astro2.redirect("/blog");
  }
  return renderTemplate`${renderComponent($$result, "PublicLayout", $$PublicLayout, { "title": post.title, "description": post.excerpt || post.title }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mx-auto max-w-3xl px-4 sm:px-6 py-12"> <a href="/blog" class="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-8 transition-colors">
← Back to Blog
</a> <article> <header class="mb-8"> <time class="text-sm text-[var(--text-muted)]">${formatDate(post.createdAt)}</time> <h1 class="mt-2 text-3xl font-bold text-[var(--text-primary)] leading-tight"> ${post.title} </h1> ${post.excerpt && renderTemplate`<p class="mt-3 text-lg text-[var(--text-secondary)] leading-relaxed"> ${post.excerpt} </p>`} </header> ${renderComponent($$result2, "PostContent", $$PostContent, { "content": post.content })} </article> </div> ` })}`;
}, "C:/Users/steve/projects/steveackleyorg/src/pages/blog/[slug].astro", void 0);

const $$file = "C:/Users/steve/projects/steveackleyorg/src/pages/blog/[slug].astro";
const $$url = "/blog/[slug]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$slug,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
