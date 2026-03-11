import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, m as maybeRenderHead } from '../../chunks/astro/server_B-1XR7Cx.mjs';
import 'piccolore';
import { $ as $$PublicLayout } from '../../chunks/PublicLayout_BFjoUw8x.mjs';
import { jsxs, jsx } from 'react/jsx-runtime';
import { useState } from 'react';
import { createAuthClient } from 'better-auth/client';
import { B as Button } from '../../chunks/button_DeZP_JW1.mjs';
export { renderers } from '../../renderers.mjs';

const authClient = createAuthClient({
  // By omitting baseURL, the client will automatically use the current window origin.
  // This ensures it works on both localhost:3000 and your production domain without rebuilds.
});

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error: error2 } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/admin/dashboard"
      });
      if (error2) {
        setError(error2.message || "Invalid credentials");
      } else {
        window.location.href = "/admin/dashboard";
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-8 shadow-xl space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { class: "space-y-2", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-[var(--text-secondary)]", children: "Email Address" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "email",
          type: "email",
          value: email,
          onChange: (e) => setEmail(e.target.value),
          required: true,
          className: "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all",
          placeholder: "you@example.com"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { class: "space-y-2", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "password", id: "password-label", className: "block text-sm font-medium text-[var(--text-secondary)]", children: "Password" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "password",
          type: "password",
          value: password,
          onChange: (e) => setPassword(e.target.value),
          required: true,
          className: "w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all",
          placeholder: "••••••••"
        }
      )
    ] }),
    error && /* @__PURE__ */ jsx("div", { className: "bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-500", children: error }),
    /* @__PURE__ */ jsx(
      Button,
      {
        type: "submit",
        className: "w-full py-6 text-base font-bold shadow-lg shadow-blue-500/20",
        isLoading: loading,
        children: "Sign In"
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "pt-2 text-center", children: /* @__PURE__ */ jsx("a", { href: "/", className: "text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors", children: "← Back to public site" }) })
  ] });
}

const $$Astro = createAstro();
const $$Login = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Login;
  if (Astro2.locals.user) {
    return Astro2.redirect("/admin/dashboard");
  }
  return renderTemplate`${renderComponent($$result, "PublicLayout", $$PublicLayout, { "title": "Login | Admin", "description": "Login to the admin dashboard" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="min-h-[70vh] flex flex-col items-center justify-center px-4"> <div class="w-full max-w-md"> <div class="text-center mb-8"> <h1 class="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">Admin Portal</h1> <p class="text-[var(--text-secondary)] mt-2">Sign in to manage your site</p> </div> ${renderComponent($$result2, "LoginForm", LoginForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "@/components/admin/LoginForm", "client:component-export": "LoginForm" })} <p class="mt-8 text-center text-xs text-[var(--text-muted)]">
&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Steve Ackley. All rights reserved.
</p> </div> </div> ` })}`;
}, "C:/Users/steve/projects/steveackleyorg/src/pages/admin/login.astro", void 0);

const $$file = "C:/Users/steve/projects/steveackleyorg/src/pages/admin/login.astro";
const $$url = "/admin/login";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Login,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
