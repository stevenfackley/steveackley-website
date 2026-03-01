import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

/**
 * Auth middleware: protects /admin/* and /client/* routes.
 * Uses edge-compatible authConfig (no Prisma, no Node.js-only imports).
 *
 * - /admin/* (non-login): requires ADMIN role; clients are sent to /client/dashboard
 * - /admin/login: redirects already-authenticated users based on their role
 * - /client/*: requires any authenticated user
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const session = req.auth;
  const isLoggedIn = !!session;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const pathname = req.nextUrl.pathname;

  const isAdminLogin = pathname === "/admin/login";
  const isAdminRoute = pathname.startsWith("/admin");
  const isClientRoute = pathname.startsWith("/client");

  // /admin/login
  if (isAdminLogin) {
    if (!isLoggedIn) return NextResponse.next(); // explicitly return next() instead of undefined
    const dest = role === "ADMIN" ? "/admin/dashboard" : "/client/dashboard";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // /admin/* (protected)
  if (isAdminRoute) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/client/dashboard", req.url));
    }
    return NextResponse.next(); // explicitly return next()
  }

  // /client/* (any authenticated user)
  if (isClientRoute) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next(); // explicitly return next()
  }

  // Fallback for unmatched routes (shouldn't happen with matcher config)
  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/client/:path*"],
};
