import { a as auth } from './chunks/auth_DmKPFpWl.mjs';
import { d as defineMiddleware, s as sequence } from './chunks/index_T92e_VwJ.mjs';
import 'es-module-lexer';
import './chunks/astro-designed-error-pages_BrOPlBF3.mjs';
import 'piccolore';
import './chunks/astro/server_B-1XR7Cx.mjs';
import 'clsx';

const onRequest$1 = defineMiddleware(async (context, next) => {
  const session = await auth.api.getSession({
    headers: context.request.headers
  });
  if (session) {
    context.locals.user = session.user;
    context.locals.session = session.session;
  } else {
    context.locals.user = null;
    context.locals.session = null;
  }
  const url = new URL(context.request.url);
  if (url.pathname.startsWith("/admin") && url.pathname !== "/admin/login") {
    if (!session || session.user.role !== "ADMIN") {
      return context.redirect("/admin/login");
    }
  }
  if (url.pathname.startsWith("/client")) {
    if (!session) {
      return context.redirect("/admin/login");
    }
  }
  return next();
});

const onRequest = sequence(
	
	onRequest$1
	
);

export { onRequest };
