import { e as createComponent, m as maybeRenderHead, g as addAttribute, r as renderTemplate, h as createAstro, k as renderComponent, o as Fragment } from '../chunks/astro/server_brmzxYiS.mjs';
import 'piccolore';
import { $ as $$PublicLayout } from '../chunks/PublicLayout_CMFGUKIL.mjs';
import 'clsx';
import { c as cn, f as formatDateShort } from '../chunks/utils_CPMI-xBA.mjs';
import { d as db, p as posts } from '../chunks/index_BYBdbJMu.mjs';
import { count, eq, desc } from 'drizzle-orm';
export { renderers } from '../renderers.mjs';

const $$Astro$3 = createAstro();
const $$PostCard = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$3, $$props, $$slots);
  Astro2.self = $$PostCard;
  const { post, class: className } = Astro2.props;
  return renderTemplate`${maybeRenderHead()}<article${addAttribute(cn("group bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--border-hover)] hover:-translate-y-0.5 transition-all duration-200", className), "class")}> ${post.coverImage && renderTemplate`<div class="relative h-48 overflow-hidden"> <img${addAttribute(post.coverImage, "src")}${addAttribute(post.title, "alt")} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"> </div>`} <div class="p-5"> <time class="text-xs text-[var(--text-muted)]">${formatDateShort(post.createdAt)}</time> <h2 class="mt-1.5 text-base font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors line-clamp-2"> <a${addAttribute(`/blog/${post.slug}`, "href")}>${post.title}</a> </h2> ${post.excerpt && renderTemplate`<p class="mt-2 text-sm text-[var(--text-secondary)] line-clamp-3 leading-relaxed">${post.excerpt}</p>`} <a${addAttribute(`/blog/${post.slug}`, "href")} class="mt-4 inline-flex text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">Read more →</a> </div> </article>`;
}, "/mnt/c/Users/steve/projects/steveackleyorg/src/components/blog/PostCard.astro", void 0);

const $$Astro$2 = createAstro();
const $$PostList = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$PostList;
  const { posts } = Astro2.props;
  return renderTemplate`${posts.length === 0 ? renderTemplate`${maybeRenderHead()}<div class="text-center py-20"><p class="text-[var(--text-muted)] text-lg">No posts yet. Check back soon!</p></div>` : renderTemplate`<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">${posts.map((post) => renderTemplate`${renderComponent($$result, "PostCard", $$PostCard, { "post": post })}`)}</div>`}`;
}, "/mnt/c/Users/steve/projects/steveackleyorg/src/components/blog/PostList.astro", void 0);

const $$Astro$1 = createAstro();
const $$Pagination = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$Pagination;
  const { pagination, basePath } = Astro2.props;
  const { currentPage, totalPages, hasPreviousPage, hasNextPage } = pagination;
  function cls(active, disabled) {
    return cn(
      "inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium transition-all",
      active ? "bg-[var(--accent)] text-white" : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]",
      disabled && "opacity-40 pointer-events-none"
    );
  }
  return renderTemplate`${totalPages > 1 && renderTemplate`${maybeRenderHead()}<nav class="flex items-center justify-center gap-2 mt-12">${hasPreviousPage ? renderTemplate`<a${addAttribute(`${basePath}?page=${currentPage - 1}`, "href")}${addAttribute(cls(), "class")}>&#8249;</a>` : renderTemplate`<span${addAttribute(cls(false, true), "class")}>&#8249;</span>`}${Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => renderTemplate`<a${addAttribute(`${basePath}?page=${p}`, "href")}${addAttribute(cls(p === currentPage), "class")}${addAttribute(p === currentPage ? "page" : void 0, "aria-current")}>${p}</a>`)}${hasNextPage ? renderTemplate`<a${addAttribute(`${basePath}?page=${currentPage + 1}`, "href")}${addAttribute(cls(), "class")}>&#8250;</a>` : renderTemplate`<span${addAttribute(cls(false, true), "class")}>&#8250;</span>`}</nav>`}`;
}, "/mnt/c/Users/steve/projects/steveackleyorg/src/components/blog/Pagination.astro", void 0);

const $$Astro = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const PER_PAGE = 10;
  const page = Number(Astro2.url.searchParams.get("page") ?? "1");
  const currentPage = Math.max(1, page);
  const [totalCountResult] = await db.select({ value: count() }).from(posts).where(eq(posts.published, true));
  const totalItems = totalCountResult?.value || 0;
  const totalPages = Math.ceil(totalItems / PER_PAGE);
  const posts$1 = await db.select().from(posts).where(eq(posts.published, true)).orderBy(desc(posts.createdAt)).limit(PER_PAGE).offset((currentPage - 1) * PER_PAGE);
  const pagination = {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage: PER_PAGE,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < totalPages
  };
  return renderTemplate`${renderComponent($$result, "PublicLayout", $$PublicLayout, { "title": "Blog", "description": "Thoughts on software engineering, technology, and life." }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12"> <header class="mb-12"> <h1 class="text-3xl font-bold text-[var(--text-primary)]">Blog</h1> <p class="mt-2 text-[var(--text-secondary)]">
Thoughts on software, technology, and whatever else I find interesting.
</p> </header> ${posts$1.length > 0 ? renderTemplate`${renderComponent($$result2, "Fragment", Fragment, {}, { "default": async ($$result3) => renderTemplate` ${renderComponent($$result3, "PostList", $$PostList, { "posts": posts$1 })} ${totalPages > 1 && renderTemplate`${renderComponent($$result3, "Pagination", $$Pagination, { "pagination": pagination, "basePath": "/blog" })}`}` })}` : renderTemplate`<div class="text-center py-20"> <p class="text-[var(--text-secondary)]">No posts found. Check back later!</p> </div>`} </div> ` })}`;
}, "/mnt/c/Users/steve/projects/steveackleyorg/src/pages/blog/index.astro", void 0);

const $$file = "/mnt/c/Users/steve/projects/steveackleyorg/src/pages/blog/index.astro";
const $$url = "/blog";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
