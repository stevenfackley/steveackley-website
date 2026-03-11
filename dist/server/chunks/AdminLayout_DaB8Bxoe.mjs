import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, m as maybeRenderHead, l as renderSlot } from './astro/server_B-1XR7Cx.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from './BaseLayout_DPfsnvkC.mjs';

const $$Astro = createAstro();
const $$AdminLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$AdminLayout;
  const { title = "Admin" } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": title }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8"> <div class="flex gap-8"> <!-- Sidebar --> <aside class="hidden md:block w-56 shrink-0"> <nav class="space-y-1 sticky top-20"> <a href="/admin/dashboard" class="block px-3 py-2 text-sm rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors">Dashboard</a> <a href="/admin/posts/new" class="block px-3 py-2 text-sm rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors">New Post</a> <a href="/admin/apps" class="block px-3 py-2 text-sm rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors">Apps</a> <a href="/admin/messages" class="block px-3 py-2 text-sm rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors">Messages</a> <a href="/admin/settings" class="block px-3 py-2 text-sm rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors">Settings</a> <a href="/admin/account" class="block px-3 py-2 text-sm rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] transition-colors">Account</a> </nav> </aside> <!-- Main content --> <div class="flex-1 min-w-0"> ${renderSlot($$result2, $$slots["default"])} </div> </div> </div> ` })}`;
}, "C:/Users/steve/projects/steveackleyorg/src/layouts/AdminLayout.astro", void 0);

export { $$AdminLayout as $ };
