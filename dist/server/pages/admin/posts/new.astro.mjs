import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../../chunks/astro/server_brmzxYiS.mjs';
import 'piccolore';
import { $ as $$AdminLayout } from '../../../chunks/AdminLayout_BLErPWt7.mjs';
import { P as PostForm } from '../../../chunks/PostForm_B5J5FCyy.mjs';
export { renderers } from '../../../renderers.mjs';

const $$New = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "AdminLayout", $$AdminLayout, { "title": "New Post" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="max-w-4xl mx-auto"> <div class="mb-8"> <a href="/admin/dashboard" class="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
&larr; Back to Dashboard
</a> <h1 class="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] mt-4">Create New Post</h1> </div> ${renderComponent($$result2, "PostForm", PostForm, { "client:load": true, "mode": "create", "client:component-hydration": "load", "client:component-path": "@/components/admin/PostForm", "client:component-export": "PostForm" })} </div> ` })}`;
}, "/mnt/c/Users/steve/projects/steveackleyorg/src/pages/admin/posts/new.astro", void 0);

const $$file = "/mnt/c/Users/steve/projects/steveackleyorg/src/pages/admin/posts/new.astro";
const $$url = "/admin/posts/new";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$New,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
