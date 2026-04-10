import { auth } from "@/lib/auth";
import { withRequestId } from "@shared/lib/logger";
import { defineMiddleware } from "astro:middleware";
import { randomUUID } from "node:crypto";

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

// ── Rate Limiter (in-memory sliding window) ─────────────────
const rateBuckets = new Map<string, number[]>();

// Evict stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of rateBuckets) {
    const fresh = timestamps.filter((t) => now - t < 60_000);
    if (fresh.length === 0) rateBuckets.delete(key);
    else rateBuckets.set(key, fresh);
  }
}, 300_000);

function isRateLimited(ip: string, path: string): boolean {
  let limit: number;

  if (path.startsWith("/api/upload")) {
    limit = 10;
  } else if (path.startsWith("/api/auth")) {
    limit = 20;
  } else if (path.startsWith("/api/")) {
    limit = 60;
  } else {
    return false;
  }

  const bucket = path.startsWith("/api/upload")
    ? "/api/upload"
    : path.startsWith("/api/auth")
      ? "/api/auth"
      : "/api";
  const key = `${ip}:${bucket}`;
  const now = Date.now();
  let timestamps = rateBuckets.get(key) ?? [];

  // Sliding window: keep only timestamps within the last 60s
  timestamps = timestamps.filter((t) => now - t < 60_000);

  if (timestamps.length >= limit) {
    rateBuckets.set(key, timestamps);
    return true;
  }

  timestamps.push(now);
  rateBuckets.set(key, timestamps);
  return false;
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
// ── End Rate Limiter ────────────────────────────────────────

export const onRequest = defineMiddleware(async (context, next) => {
  const requestId =
    context.request.headers.get("x-request-id") ?? randomUUID();
  const reqLogger = withRequestId(requestId);

  const url = new URL(context.request.url);
  const portalBaseUrl = process.env.PORTAL_BASE_URL?.replace(/\/$/, "");

  if (portalBaseUrl && (url.pathname.startsWith("/admin") || url.pathname.startsWith("/client"))) {
    return context.redirect(`${portalBaseUrl}${url.pathname}${url.search}`);
  }

  reqLogger.info("incoming request", {
    method: context.request.method,
    path: url.pathname,
  });

  // Rate limiting for API routes
  if (url.pathname.startsWith("/api/")) {
    const ip = getClientIp(context.request);
    if (isRateLimited(ip, url.pathname)) {
      reqLogger.warn("rate limit exceeded", { ip, path: url.pathname });
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
          "X-Request-Id": requestId,
        },
      });
    }
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
  response.headers.set('X-Request-Id', requestId);
  return response;
});
