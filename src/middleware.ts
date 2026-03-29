import { auth } from "@/lib/auth";
import { defineMiddleware } from "astro:middleware";

// Content-Security-Policy applied to all responses.
// 'unsafe-eval' is required by the TipTap/ProseMirror rich-text editor
// (prosemirror-model uses new Function() for schema accessors) used in the
// admin post editor.  'unsafe-inline' is required for Astro's is:inline
// scripts and Tailwind CSS utility classes.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
].join('; ');

export const onRequest = defineMiddleware(async (context, next) => {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });

  if (session) {
    context.locals.user = session.user;
    context.locals.session = session.session;
  } else {
    context.locals.user = null;
    context.locals.session = null;
  }

  const url = new URL(context.request.url);

  // Admin routes: require ADMIN role
  if (url.pathname.startsWith("/admin") && url.pathname !== "/admin/login") {
    if (!session || session.user.role !== "ADMIN") {
      return context.redirect("/admin/login");
    }
  }

  // Client routes: require any authenticated session
  if (url.pathname.startsWith("/client") && url.pathname !== "/client/login") {
    if (!session) {
      return context.redirect("/client/login");
    }
    // Clients trying to access admin area get redirected to client portal
    if (session.user.role === "CLIENT" && url.pathname.startsWith("/admin")) {
      return context.redirect("/client/dashboard");
    }
  }

  const response = await next();
  response.headers.set('Content-Security-Policy', CSP);
  return response;
});
