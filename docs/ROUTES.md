# Routes

> Last updated: pre-rewrite snapshot. Update after Phase 3.

## Public

| Route | Description |
|---|---|
| `/` | Homepage (bento grid) |
| `/blog` | Blog post listing |
| `/blog/[slug]` | Individual blog post |
| `/resume` | Resume page |
| `/resume/print` | Print-optimized resume |

## Admin (ADMIN role required)

| Route | Description |
|---|---|
| `/admin/login` | Login page |
| `/admin/dashboard` | Admin dashboard |
| `/admin/posts/new` | Create new blog post |
| `/admin/posts/[id]/edit` | Edit existing post |
| `/admin/apps` | Manage client apps |
| `/admin/messages` | Message inbox |
| `/admin/settings` | Site settings (key-value CMS) |
| `/admin/account` | Admin account settings |

## Client (any authenticated user)

| Route | Description |
|---|---|
| `/client/dashboard` | Client dashboard |
| `/client/messages` | Message inbox |
| `/client/account` | Account settings |

## API

| Route | Description |
|---|---|
| `/api/auth/[...nextauth]` | Auth handler (NextAuth → better-auth post-rewrite) |
| `/api/upload` | File upload endpoint (→ R2 post-rewrite) |
| `/api/uploads/[...path]` | Serve uploaded files from Docker volume (removed post-rewrite) |
| `/api/fetch-metadata` | Fetch URL metadata for ClientApp |
