/**
 * The scheduled-publish secret, and whether scheduled publishing can run here.
 *
 * Read from process.env, at run time. `import.meta.env.CRON_SECRET` is replaced
 * with a literal when the site is built, and the image build never has the
 * secret, so a read through it is `undefined` in production: the route that
 * depended on it was built as a bare 401. scripts/check-built-routes.mjs
 * guards both this read and the route.
 */
export function cronSecret(): string | undefined {
  const value = process.env.CRON_SECRET?.trim();
  return value ? value : undefined;
}

/**
 * Whether anything can publish a scheduled post on this server. Without the
 * secret the route answers 401 to everyone and the scheduled workflow does
 * nothing, so a post saved as "Scheduled" stays unpublished.
 */
export function isSchedulerEnabled(): boolean {
  return cronSecret() !== undefined;
}
