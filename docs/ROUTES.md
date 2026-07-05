# Route Map

All routes live in `apps/site/src/pages/`. There is no separate portal app (see ADR-001 — the admin/client portal split was accepted but never executed; `admin/*` and `client/*` are route groups within `apps/site`, not a separate Next.js app).

## Public Pages

| Route | File | Notes |
|---|---|---|
| `/` | `index.astro` | Home dashboard (SSR React island, live GitHub repos) |
| `/blog` | `blog/index.astro` | Paginated DB-backed post list |
| `/blog/[slug]` | `blog/[slug].astro` | Single post (DB) |
| `/resume` | `resume/index.astro` | File-collection-backed |
| `/resume/print` | `resume/print.astro` | Print-optimized resume layout (no nav/chrome) |
| `/login` | `login.astro` | Auth entry; not linked from public nav. Redirects to `/admin/dashboard` or `/client/dashboard` if already signed in |
| `/android/privacy` | `android/privacy.astro` | Privacy policy for the GhostCrab Android app (unrelated to the site portal) |
| `/404` | `404.astro` | Not-found page |

## Admin Portal (role=`ADMIN`)

| Route | File | Purpose |
|---|---|---|
| `/admin` | `admin/index.astro` | Redirects to `/admin/dashboard` |
| `/admin/login` | `admin/login.astro` | Legacy alias — redirects to `/login` |
| `/admin/dashboard` | `admin/dashboard.astro` | Admin dashboard (post/user/app/client stats) |
| `/admin/posts` | `admin/posts/index.astro` | Blog post list |
| `/admin/posts/new` | `admin/posts/new.astro` | TipTap editor |
| `/admin/posts/[id]/edit` | `admin/posts/[id]/edit.astro` | TipTap editor |
| `/admin/settings` | `admin/settings.astro` | Site settings |
| `/admin/account` | `admin/account.astro` | Account settings |
| `/admin/apps` | `admin/apps.astro` | Apps snapshot (portfolio/project apps) |
| `/admin/clients` | `admin/clients.astro` | Client accounts snapshot |
| `/admin/messages` | `admin/messages.astro` | Recent messages |
| `/admin/users` | `admin/users.astro` | User accounts snapshot |

## Client Portal (role=`CLIENT`)

| Route | File | Purpose |
|---|---|---|
| `/client` | `client/index.astro` | Redirects to `/client/dashboard` |
| `/client/dashboard` | `client/dashboard.astro` | Client dashboard |
| `/client/account` | `client/account.astro` | Account |
| `/client/messages` | `client/messages.astro` | Client message inbox |

## API Routes

| Route | File | Notes |
|---|---|---|
| `/api/auth/[...all]` | `api/auth/[...all].ts` | Better Auth handler — every auth flow (sign-in, sign-out, session refresh, callbacks) |
| `/api/upload` | `api/upload.ts` | Admin-only file upload to R2 |
| `/api/health` | `api/health.ts` | Health check |
| `/api/github/repos` | `api/github/repos.ts` | Cached enriched repo list (30s in-process TTL, shared with SSR). JSON response: `{ repos, fetchedAt }` |
| `/api/fetch-metadata` | `api/fetch-metadata.ts` | Server-side link-metadata fetch, SSRF-guarded (blocks private/reserved IPv4 ranges incl. cloud metadata endpoint) |
| `/api/cron/publish-scheduled` | `api/cron/publish-scheduled.ts` | Scheduled job — publishes posts whose scheduled time has passed |
| `/rss.xml` | `rss.xml.ts` | RSS feed |
| `/sitemap.xml` | `sitemap.xml.ts` | Sitemap |

## Top-Level Nav

| Label | Target |
|---|---|
| Home | `/` |
| Resume | `/resume` |
| Blog | `/blog` |
| Contact | `mailto:stevenfackley@gmail.com` |

No `Sign In` link is exposed to public visitors — `/login` is reachable directly by URL for admins and clients (`/admin/login` is a legacy alias that redirects to the same page). When a user is logged in, the nav surfaces `My Account` linking to `/admin/account` or `/client/account` based on role.
