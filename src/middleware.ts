import { auth } from "@/lib/auth";
import { defineMiddleware } from "astro:middleware";

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

  return next();
});
