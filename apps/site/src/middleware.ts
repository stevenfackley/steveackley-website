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
  const url = new URL(context.request.url);
  const portalBaseUrl = process.env.PORTAL_BASE_URL?.replace(/\/$/, "");

  if (portalBaseUrl && (url.pathname.startsWith("/admin") || url.pathname.startsWith("/client"))) {
    return context.redirect(`${portalBaseUrl}${url.pathname}${url.search}`);
  }

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

  const response = await next();
  response.headers.set('Content-Security-Policy', CSP);
  return response;
});
