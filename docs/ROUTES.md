# Route Map

All routes live in `apps/site/src/pages/`. There is no separate portal app.

## Public Pages

| Route | File | Notes |
|---|---|---|
| `/` | `index.astro` | Home dashboard (SSR React island, live GitHub repos) |
| `/blog` | `blog/index.astro` | Paginated DB-backed post list |
| `/blog/[slug]` | `blog/[slug].astro` | Single post (DB) |
| `/resume` | `resume.astro` | File-collection-backed |
| `/login` | `login.astro` | Auth entry; not linked from public nav |

## Admin Portal (role=`admin`)

| Route | File | Purpose |
|---|---|---|
| `/admin` | `admin/index.astro` | Admin dashboard |
| `/admin/posts` | `admin/posts/index.astro` | Blog post list |
| `/admin/posts/new` | `admin/posts/new.astro` | TipTap editor |
| `/admin/posts/[id]/edit` | `admin/posts/[id]/edit.astro` | TipTap editor |
| `/admin/settings` | `admin/settings.astro` | Site settings |
| `/admin/account` | `admin/account.astro` | Account settings |

## Client Portal (role=`client`)

| Route | File | Purpose |
|---|---|---|
| `/client` | `client/index.astro` | Client dashboard |
| `/client/account` | `client/account.astro` | Account |

## API Routes

| Route | File | Notes |
|---|---|---|
| `/api/auth/[...all]` | `api/auth/[...all].ts` | Better Auth handler — every auth flow (sign-in, sign-out, session refresh, callbacks) |
| `/api/github/repos` | `api/github/repos.ts` | Cached enriched repo list (30s in-process TTL, shared with SSR). JSON response: `{ repos, fetchedAt }` |
| `/api/cron/*` | `api/cron/*.ts` | Scheduled jobs |

## Top-Level Nav

| Label | Target |
|---|---|
| Home | `/` |
| Resume | `/resume` |
| Blog | `/blog` |
| Contact | `mailto:stevenfackley@gmail.com` |

No `Sign In` link is exposed to public visitors — `/login` is reachable directly by URL for admins. When a user is logged in, the nav surfaces `My Account` linking to `/admin/account` or `/client/account` based on role.
