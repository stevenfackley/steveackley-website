import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * Auth middleware: protects all /admin/* routes.
 *
 * - Unauthenticated requests to /admin/* (except /admin/login) → redirect to /admin/login
 * - Authenticated requests to /admin/login → redirect to /admin/dashboard
 */
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const pathname = req.nextUrl.pathname;
  const isAdminLogin = pathname === "/admin/login";

  // Redirect authenticated admin away from login page
  if (isLoggedIn && isAdminLogin) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn && !isAdminLogin) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
