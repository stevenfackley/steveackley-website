import type { AstroGlobal } from 'astro';
import { ActionError } from 'astro:actions';
import type { ActionAPIContext } from 'astro:actions';
import { canUseClientPortal, isAdmin } from '@/lib/roles';

/**
 * Page guard for `.astro` frontmatter. Redirects to /login unless the
 * current user is authenticated with the ADMIN role.
 *
 * Usage:
 *   const guard = requireAdminPage(Astro);
 *   if (guard) return guard;
 */
export function requireAdminPage(Astro: Pick<AstroGlobal, 'locals' | 'redirect'>): Response | null {
  if (!isAdmin(Astro.locals.user)) {
    return Astro.redirect('/login');
  }
  return null;
}

/**
 * Page guard for `.astro` frontmatter. Redirects to /login unless the
 * current user is authenticated with the CLIENT or ADMIN role. Admins are
 * allowed into the client portal for support.
 *
 * Usage:
 *   const guard = requireClientPage(Astro);
 *   if (guard) return guard;
 */
export function requireClientPage(Astro: Pick<AstroGlobal, 'locals' | 'redirect'>): Response | null {
  if (!canUseClientPortal(Astro.locals.user)) {
    return Astro.redirect('/login');
  }
  return null;
}

/**
 * Action guard for `actions/index.ts` handlers. Throws an ActionError
 * (UNAUTHORIZED) unless the current user is authenticated with the ADMIN
 * role.
 *
 * Usage:
 *   requireAdminAction(context);
 */
export function requireAdminAction(context: Pick<ActionAPIContext, 'locals'>): void {
  if (!isAdmin(context.locals.user)) {
    throw new ActionError({ code: 'UNAUTHORIZED', message: 'Unauthorized' });
  }
}
