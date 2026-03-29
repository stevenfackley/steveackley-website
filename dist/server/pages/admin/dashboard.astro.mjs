import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_brmzxYiS.mjs';
import 'piccolore';
import { $ as $$AdminLayout } from '../../chunks/AdminLayout_C4y9P9UC.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import { useTransition, useState } from 'react';
import { cva } from 'class-variance-authority';
import { c as cn, f as formatDateShort } from '../../chunks/utils_CPMI-xBA.mjs';
import { B as Button } from '../../chunks/button_DeZP_JW1.mjs';
import { a as actions } from '../../chunks/virtual_Bq_Mh8Iw.mjs';
import { d as db, p as posts } from '../../chunks/index_BYBdbJMu.mjs';
import { desc } from 'drizzle-orm';
export { renderers } from '../../renderers.mjs';

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function Badge({ className, variant, ...props }) {
  return /* @__PURE__ */ jsx("div", { className: cn(badgeVariants({ variant }), className), ...props });
}

function AdminPostTable({ posts }) {
  if (posts.length === 0) return /* @__PURE__ */ jsxs("div", { className: "text-center py-16 text-[var(--text-muted)]", children: [
    /* @__PURE__ */ jsx("p", { children: "No posts yet." }),
    /* @__PURE__ */ jsx("a", { href: "/admin/posts/new", className: "mt-2 inline-block text-[var(--accent)] text-sm hover:underline", children: "Create your first post →" })
  ] });
  return /* @__PURE__ */ jsx("div", { className: "bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden", children: /* @__PURE__ */ jsxs("table", { className: "w-full text-sm", children: [
    /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { className: "border-b border-[var(--border)] bg-[var(--surface-hover)]", children: [
      /* @__PURE__ */ jsx("th", { className: "text-left px-4 py-3 font-medium text-[var(--text-muted)]", children: "Title" }),
      /* @__PURE__ */ jsx("th", { className: "text-left px-4 py-3 font-medium text-[var(--text-muted)] hidden sm:table-cell", children: "Status" }),
      /* @__PURE__ */ jsx("th", { className: "text-left px-4 py-3 font-medium text-[var(--text-muted)] hidden md:table-cell", children: "Updated" }),
      /* @__PURE__ */ jsx("th", { className: "text-right px-4 py-3 font-medium text-[var(--text-muted)]", children: "Actions" })
    ] }) }),
    /* @__PURE__ */ jsx("tbody", { className: "divide-y divide-[var(--border)]", children: posts.map((post) => /* @__PURE__ */ jsx(PostRow, { post }, post.id)) })
  ] }) });
}
function PostRow({ post }) {
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const handleToggle = () => startTransition(async () => {
    await actions.togglePublished({ id: post.id, published: !post.published });
    window.location.reload();
  });
  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3e3);
      return;
    }
    startTransition(async () => {
      await actions.deletePost({ id: post.id });
      window.location.reload();
    });
  };
  return /* @__PURE__ */ jsxs("tr", { className: "hover:bg-[var(--surface-hover)] transition-colors", children: [
    /* @__PURE__ */ jsx("td", { className: "px-4 py-3", children: /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("a", { href: `/admin/posts/${post.id}/edit`, className: "font-medium text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors line-clamp-1", children: post.title }),
      /* @__PURE__ */ jsxs("p", { className: "text-xs text-[var(--text-muted)] mt-0.5", children: [
        "/blog/",
        post.slug
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("td", { className: "px-4 py-3 hidden sm:table-cell", children: /* @__PURE__ */ jsx(Badge, { variant: post.published ? "default" : "secondary", children: post.published ? "Published" : "Draft" }) }),
    /* @__PURE__ */ jsx("td", { className: "px-4 py-3 hidden md:table-cell text-[var(--text-muted)]", children: formatDateShort(post.updatedAt) }),
    /* @__PURE__ */ jsx("td", { className: "px-4 py-3 text-right", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-end gap-2", children: [
      /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "sm", onClick: handleToggle, disabled: isPending, children: post.published ? "Unpublish" : "Publish" }),
      /* @__PURE__ */ jsx("a", { href: `/admin/posts/${post.id}/edit`, children: /* @__PURE__ */ jsx(Button, { variant: "secondary", size: "sm", children: "Edit" }) }),
      /* @__PURE__ */ jsx(Button, { variant: confirmDelete ? "destructive" : "ghost", size: "sm", onClick: handleDelete, disabled: isPending, children: confirmDelete ? "Confirm?" : "Delete" })
    ] }) })
  ] });
}

const $$Dashboard = createComponent(async ($$result, $$props, $$slots) => {
  const posts$1 = await db.select().from(posts).orderBy(desc(posts.createdAt));
  return renderTemplate`${renderComponent($$result, "AdminLayout", $$AdminLayout, { "title": "Dashboard", "description": "Admin Dashboard Overview" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-8"> <div class="flex items-center justify-between"> <div> <h1 class="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">Admin Dashboard</h1> <p class="text-[var(--text-secondary)] mt-1.5">Manage your posts and site content</p> </div> <a href="/admin/posts/new" class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all hover:-translate-y-0.5 active:translate-y-0"> <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path> </svg>
New Post
</a> </div> ${renderComponent($$result2, "AdminPostTable", AdminPostTable, { "client:load": true, "posts": posts$1, "client:component-hydration": "load", "client:component-path": "@/components/admin/AdminPostTable", "client:component-export": "AdminPostTable" })} </div> ` })}`;
}, "C:/Users/steve/projects/steveackleyorg/src/pages/admin/dashboard.astro", void 0);

const $$file = "C:/Users/steve/projects/steveackleyorg/src/pages/admin/dashboard.astro";
const $$url = "/admin/dashboard";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Dashboard,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
