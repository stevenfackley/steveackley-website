# Routes

> Last updated: March 2026 — reflects current Astro 5 implementation.

## Public

| Route | Description |
|---|---|
| `/` | Homepage (tabbed bento dashboard) |
| `/blog` | Blog post listing with pagination |
| `/blog/[slug]` | Individual blog post |
| `/resume` | Interactive resume page |
| `/resume/print` | Print-optimized resume |

## Admin (ADMIN role required)

| Route | Description |
|---|---|
| `/admin/login` | Login page |
| `/admin/dashboard` | Admin dashboard (post management) |
| `/admin/posts/new` | Create new blog post |
| `/admin/posts/[id]/edit` | Edit existing post |
| `/admin/apps` | Manage client apps |
| `/admin/messages` | Message inbox |
| `/admin/settings` | Site settings (key-value CMS) |
| `/admin/account` | Admin account settings |
| `/admin/users` | User management |

## Client (any authenticated user)

| Route | Description |
|---|---|
| `/client/login` | Client login page |
| `/client/dashboard` | Client dashboard |
| `/client/messages` | Message inbox |
| `/client/account` | Account settings |

## API

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/[...all]` | GET/POST | — | Better-Auth handler (login, logout, session) |
| `/api/upload` | POST | ✅ ADMIN | Upload image to Cloudflare R2; returns `{ url }` |
| `/api/fetch-metadata` | GET | ✅ Any | Fetch Open Graph metadata for a URL |
