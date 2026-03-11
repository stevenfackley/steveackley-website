import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, l as renderSlot } from './astro/server_B-1XR7Cx.mjs';
import 'piccolore';
import { $ as $$BaseLayout } from './BaseLayout_DPfsnvkC.mjs';

const $$Astro = createAstro();
const $$PublicLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$PublicLayout;
  const { title, description } = Astro2.props;
  return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, { "title": title, "description": description }, { "default": ($$result2) => renderTemplate` ${renderSlot($$result2, $$slots["default"])} ` })}`;
}, "C:/Users/steve/projects/steveackleyorg/src/layouts/PublicLayout.astro", void 0);

export { $$PublicLayout as $ };
