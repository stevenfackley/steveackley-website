import { e as createComponent, g as addAttribute, l as renderHead, k as renderComponent, r as renderTemplate, h as createAstro } from '../../chunks/astro/server_brmzxYiS.mjs';
import 'piccolore';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import { useState } from 'react';
import { createAuthClient } from 'better-auth/client';
/* empty css                                      */
/* empty css                                    */
export { renderers } from '../../renderers.mjs';

const authClient = createAuthClient({
  // By omitting baseURL, the client will automatically use the current window origin.
  // This ensures it works on both localhost:3000 and your production domain without rebuilds.
});

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: error2 } = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/admin/dashboard"
      });
      if (error2) {
        setError(error2.message || "Invalid credentials");
      } else {
        window.location.href = "/admin/dashboard";
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-5", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-blue-100/80", children: "Email Address" }),
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx("span", { className: "absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-300/60 pointer-events-none", children: /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 20 20", fill: "currentColor", className: "h-4 w-4", children: [
          /* @__PURE__ */ jsx("path", { d: "M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" }),
          /* @__PURE__ */ jsx("path", { d: "M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" })
        ] }) }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "email",
            type: "email",
            value: email,
            onChange: (e) => setEmail(e.target.value),
            required: true,
            autoComplete: "email",
            className: "w-full rounded-xl border border-white/15 bg-white/10 pl-10 pr-4 py-3 text-white placeholder:text-blue-200/40 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all backdrop-blur-sm",
            placeholder: "admin@example.com"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-1.5", children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-blue-100/80", children: "Password" }),
      /* @__PURE__ */ jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsx("span", { className: "absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-300/60 pointer-events-none", children: /* @__PURE__ */ jsx("svg", { viewBox: "0 0 20 20", fill: "currentColor", className: "h-4 w-4", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z", clipRule: "evenodd" }) }) }),
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "password",
            type: showPw ? "text" : "password",
            value: password,
            onChange: (e) => setPassword(e.target.value),
            required: true,
            autoComplete: "current-password",
            className: "w-full rounded-xl border border-white/15 bg-white/10 pl-10 pr-12 py-3 text-white placeholder:text-blue-200/40 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-all backdrop-blur-sm",
            placeholder: "••••••••"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => setShowPw((v) => !v),
            className: "absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-300/50 hover:text-blue-200 transition-colors",
            "aria-label": showPw ? "Hide password" : "Show password",
            children: showPw ? /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 20 20", fill: "currentColor", className: "h-4 w-4", children: [
              /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z", clipRule: "evenodd" }),
              /* @__PURE__ */ jsx("path", { d: "M10.748 13.93l2.523 2.523a9.987 9.987 0 01-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 010-1.186A10.007 10.007 0 012.839 6.02L6.07 9.252a4 4 0 004.678 4.678z" })
            ] }) : /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 20 20", fill: "currentColor", className: "h-4 w-4", children: [
              /* @__PURE__ */ jsx("path", { d: "M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" }),
              /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41z", clipRule: "evenodd" })
            ] })
          }
        )
      ] })
    ] }),
    error && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2.5 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm text-red-300 backdrop-blur-sm", children: [
      /* @__PURE__ */ jsx("svg", { viewBox: "0 0 20 20", fill: "currentColor", className: "h-4 w-4 shrink-0", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" }) }),
      error
    ] }),
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "submit",
        disabled: loading,
        className: "relative w-full overflow-hidden rounded-xl py-3.5 text-sm font-bold text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed",
        style: { background: "linear-gradient(135deg, #2563eb, #7c3aed)" },
        children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              className: "absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none",
              style: { background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)" }
            }
          ),
          /* @__PURE__ */ jsx("span", { className: "relative flex items-center justify-center gap-2", children: loading ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs("svg", { className: "animate-spin h-4 w-4 text-white/80", fill: "none", viewBox: "0 0 24 24", children: [
              /* @__PURE__ */ jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }),
              /* @__PURE__ */ jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })
            ] }),
            "Signing in…"
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            "Sign In",
            /* @__PURE__ */ jsx("svg", { viewBox: "0 0 20 20", fill: "currentColor", className: "h-4 w-4", children: /* @__PURE__ */ jsx("path", { fillRule: "evenodd", d: "M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z", clipRule: "evenodd" }) })
          ] }) })
        ]
      }
    ),
    /* @__PURE__ */ jsx("div", { className: "pt-1 text-center", children: /* @__PURE__ */ jsx("a", { href: "/", className: "text-xs text-blue-200/50 hover:text-blue-200 transition-colors", children: "← Back to public site" }) })
  ] });
}

const $$Astro = createAstro();
const $$Login = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Login;
  const avatarUrl = "https://github.com/stevenfackley.png";
  if (Astro2.locals.user) {
    return Astro2.redirect("/admin/dashboard");
  }
  return renderTemplate`<html lang="en" class="scroll-smooth" data-astro-cid-rf56lckb> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description" content="Sign in to the admin portal"><meta name="robots" content="noindex, nofollow"><title>Admin Login | Steve Ackley</title><link rel="icon" type="image/png"${addAttribute(avatarUrl, "href")}><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">${renderHead()}</head> <body class="min-h-screen flex items-center justify-center overflow-hidden px-4 py-16 relative" style="background: linear-gradient(135deg, #0c1445 0%, #0f0c29 40%, #1a0533 100%); font-family: 'Inter', system-ui, sans-serif;" data-astro-cid-rf56lckb> <!-- Background orbs --> <div class="absolute -top-32 -left-32 h-96 w-96 rounded-full pointer-events-none" style="opacity: 0.25; filter: blur(80px); background: radial-gradient(circle, #3b82f6, transparent);" aria-hidden="true" data-astro-cid-rf56lckb></div> <div class="absolute -bottom-20 -right-20 h-72 w-72 rounded-full pointer-events-none" style="opacity: 0.20; filter: blur(80px); background: radial-gradient(circle, #8b5cf6, transparent);" aria-hidden="true" data-astro-cid-rf56lckb></div> <div class="absolute top-1/2 left-1/2 h-[600px] w-[600px] rounded-full pointer-events-none" style="opacity: 0.10; filter: blur(100px); background: radial-gradient(circle, #1d4ed8, transparent); transform: translate(-50%, -50%);" aria-hidden="true" data-astro-cid-rf56lckb></div> <!-- Grid dots --> <div class="absolute inset-0 pointer-events-none" style="opacity: 0.07; background-image: radial-gradient(circle, #ffffff 1px, transparent 1px); background-size: 28px 28px;" aria-hidden="true" data-astro-cid-rf56lckb></div> <!-- Card wrapper --> <div class="relative z-10 w-full max-w-md" style="animation: login-in 0.45s cubic-bezier(0.34,1.2,0.64,1) both;" data-astro-cid-rf56lckb> <!-- Header --> <div class="text-center mb-8" data-astro-cid-rf56lckb> <!-- Icon badge --> <div class="inline-flex items-center justify-center mb-5" data-astro-cid-rf56lckb> <div class="h-16 w-16 rounded-2xl flex items-center justify-center" style="background: linear-gradient(135deg, #2563eb, #7c3aed); box-shadow: 0 8px 32px rgba(37,99,235,0.45);" data-astro-cid-rf56lckb> <svg viewBox="0 0 24 24" class="h-8 w-8" fill="none" stroke="white" stroke-width="1.8" data-astro-cid-rf56lckb> <rect x="3" y="11" width="18" height="11" rx="2" data-astro-cid-rf56lckb></rect> <path stroke-linecap="round" stroke-linejoin="round" d="M7 11V7a5 5 0 0110 0v4" data-astro-cid-rf56lckb></path> </svg> </div> </div> <h1 class="text-3xl font-extrabold tracking-tight leading-tight" style="color: #ffffff;" data-astro-cid-rf56lckb>
Admin Portal
</h1> <p class="mt-2 text-sm" style="color: rgba(191,219,254,0.55);" data-astro-cid-rf56lckb>
Sign in to manage your site
</p> </div> <!-- Glass card --> <div class="rounded-2xl p-8" style="background: rgba(255,255,255,0.06); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 25px 50px rgba(0,0,0,0.5);" data-astro-cid-rf56lckb> ${renderComponent($$result, "LoginForm", LoginForm, { "client:load": true, "client:component-hydration": "load", "client:component-path": "@/components/admin/LoginForm", "client:component-export": "LoginForm", "data-astro-cid-rf56lckb": true })} </div> <!-- Footer --> <p class="mt-8 text-center text-xs" style="color: rgba(191,219,254,0.22);" data-astro-cid-rf56lckb>
&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} Steve Ackley &mdash; All rights reserved
</p> </div> </body></html>`;
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
