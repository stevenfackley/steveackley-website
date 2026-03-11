import { e as createComponent, m as maybeRenderHead, g as addAttribute, r as renderTemplate, o as renderScript, h as createAstro, n as renderHead, k as renderComponent, p as renderSlot } from './astro/server_dRnksWFu.mjs';
import 'piccolore';
import 'clsx';
/* empty css                          */

const $$Astro$2 = createAstro();
const $$Nav = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$2, $$props, $$slots);
  Astro2.self = $$Nav;
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/resume", label: "Resume" },
    { href: "/blog", label: "Blog" }
  ];
  const currentPath = Astro2.url.pathname;
  const placeholderAvatar = "https://avatars.githubusercontent.com/u/stevenfackley";
  return renderTemplate`${maybeRenderHead()}<nav class="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur-md"> <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"> <div class="flex h-14 items-center justify-between gap-4"> <!-- Logo / Name --> <a href="/" class="flex items-center gap-2.5 group"> <img${addAttribute(placeholderAvatar, "src")} alt="Steve Ackley" width="28" height="28" class="rounded-full ring-1 ring-[var(--border)] group-hover:ring-[var(--accent)] transition-all duration-150 object-cover"> <span class="text-sm font-semibold tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors duration-150">
Steve Ackley
</span> </a> <!-- Desktop Nav Links --> <div class="hidden sm:flex items-center gap-1"> ${navLinks.map((link) => renderTemplate`<a${addAttribute(link.href, "href")}${addAttribute([
    "text-sm px-3 py-1.5 rounded-lg transition-colors duration-150",
    currentPath === link.href ? "text-[var(--accent)] bg-[var(--surface-hover)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
  ], "class:list")}> ${link.label} </a>`)} <a href="/admin/login" class="ml-2 text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--border-hover)] transition-all duration-150" title="Sign In"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="h-3.5 w-3.5" aria-hidden="true"> <path fill-rule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1ZM6 4.5a2 2 0 1 1 4 0V6H6V4.5Z" clip-rule="evenodd"></path> </svg> <span class="text-xs hidden sm:inline">Sign In</span> </a> </div> <!-- Mobile menu button --> <button id="mobile-menu-btn" class="sm:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]" aria-label="Toggle menu"> <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"> <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"></path> </svg> </button> </div> <!-- Mobile menu --> <div id="mobile-menu" class="sm:hidden hidden pb-4 border-t border-[var(--border)] mt-2 pt-2"> ${navLinks.map((link) => renderTemplate`<a${addAttribute(link.href, "href")}${addAttribute([
    "block px-3 py-2 text-sm rounded-lg transition-colors",
    currentPath === link.href ? "text-[var(--accent)] bg-[var(--surface-hover)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
  ], "class:list")}> ${link.label} </a>`)} <a href="/admin/login" class="block px-3 py-2 text-sm rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
Sign In
</a> </div> </div> </nav> ${renderScript($$result, "C:/Users/steve/projects/steveackleyorg/src/components/ui/Nav.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/Users/steve/projects/steveackleyorg/src/components/ui/Nav.astro", void 0);

const $$Footer = createComponent(($$result, $$props, $$slots) => {
  const linkedin = "https://www.linkedin.com/in/stevenackley";
  const email = "stevenfackley@gmail.com";
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  return renderTemplate`${maybeRenderHead()}<footer class="border-t border-[var(--border)] py-8 mt-auto"> <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"> <div class="flex flex-col sm:flex-row items-center justify-between gap-4"> <p class="text-sm text-[var(--text-muted)]">
&copy; ${year} Steve Ackley. All rights reserved.
</p> <div class="flex items-center gap-4"> <a${addAttribute(linkedin, "href")} target="_blank" rel="noopener noreferrer" class="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
LinkedIn
</a> <a${addAttribute(`mailto:${email}`, "href")} class="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
Email
</a> </div> </div> </div> </footer>`;
}, "C:/Users/steve/projects/steveackleyorg/src/components/ui/Footer.astro", void 0);

const $$Astro$1 = createAstro();
const $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro$1, $$props, $$slots);
  Astro2.self = $$BaseLayout;
  const { title = "Steve Ackley", description = "Staff Software Engineer - .NET, Azure, Full-Stack" } = Astro2.props;
  const fullTitle = title === "Steve Ackley" ? title : `${title} | Steve Ackley`;
  return renderTemplate`<html lang="en"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description"${addAttribute(description, "content")}><title>${fullTitle}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">${renderHead()}</head> <body class="min-h-screen flex flex-col"> ${renderComponent($$result, "Nav", $$Nav, {})} <main class="flex-1"> ${renderSlot($$result, $$slots["default"])} </main> ${renderComponent($$result, "Footer", $$Footer, {})} </body></html>`;
}, "C:/Users/steve/projects/steveackleyorg/src/layouts/BaseLayout.astro", void 0);

const $$Astro = createAstro();
const $$PublicLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$PublicLayout;
  const { title, description } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": title, "description": description }, { "default": ($$result2) => renderTemplate` ${renderSlot($$result2, $$slots["default"])} ` })}`;
}, "C:/Users/steve/projects/steveackleyorg/src/layouts/PublicLayout.astro", void 0);

export { $$PublicLayout as $ };
