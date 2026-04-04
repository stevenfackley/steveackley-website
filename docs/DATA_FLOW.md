# Data Flow Document

**Project:** steveackley.org  
**Version:** 2.0.0  
**Date:** March 2026  
**Author:** Steve Ackley  
**Status:** Current

---

## 1. Overview

This document details how data moves through the `steveackley.org` system, covering:

1. Blog post creation, storage, and retrieval
2. Image upload flow (Cloudflare R2)
3. Blog post public rendering
4. Authentication flow (Better-Auth)

**Stack:** Astro 5 (SSR) · PostgreSQL 16 · Drizzle ORM · Better-Auth · Cloudflare R2

---

## 2. Blog Post Creation Flow

### 2.1 Step-by-Step Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    BLOG POST CREATION                         │
└──────────────────────────────────────────────────────────────┘

  [Admin Browser]              [Astro Server]            [PostgreSQL]
       │                             │                        │
       │  1. GET /admin/posts/new    │                        │
       │────────────────────────────►│                        │
       │   (middleware checks        │                        │
       │    Better-Auth session)     │                        │
       │                             │                        │
       │  2. Returns PostEditor page │                        │
       │◄────────────────────────────│                        │
       │                             │                        │
       │  3. Admin writes content    │                        │
       │     in Tiptap editor        │                        │
       │                             │                        │
       │  4. Admin clicks "Save"     │                        │
       │  POST Astro Action:         │                        │
       │  actions/index.ts#createPost│                        │
       │────────────────────────────►│                        │
       │                             │ 5. INSERT INTO posts   │
       │                             │   (via Drizzle ORM)    │
       │                             │───────────────────────►│
       │                             │                        │
       │                             │ 6. Returns new post    │
       │                             │◄───────────────────────│
       │                             │                        │
       │  7. Redirect to dashboard   │                        │
       │◄────────────────────────────│                        │
```

### 2.2 Astro Action: `createPost`

**Location:** `src/actions/index.ts`

**Input:**
```typescript
{
  title: string;       // Post title
  content: string;     // Tiptap HTML output
  excerpt?: string;    // Optional manual excerpt
  coverImage?: string; // R2 public CDN URL
  published: boolean;  // Draft or published
}
```

**Processing:**
1. Verify Better-Auth session (defense in depth beyond middleware)
2. Validate and sanitize inputs via Zod schema
3. Auto-generate slug from title (e.g., `"Hello World"` → `"hello-world"`)
4. Ensure slug uniqueness (append `-2`, `-3` on collision)
5. Auto-generate excerpt from content if not provided (strip HTML, first 160 chars)
6. Insert into PostgreSQL via Drizzle ORM

**Output:**
- On success: Redirect to `/admin/dashboard`
- On failure: Return `ActionError` to the form

---

## 3. Image Upload Flow

### 3.1 Step-by-Step Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    IMAGE UPLOAD FLOW                          │
└──────────────────────────────────────────────────────────────┘

  [Admin Browser]         [Astro Server]         [Cloudflare R2]
       │                        │                       │
       │  1. Admin clicks       │                       │
       │     "Insert Image"     │                       │
       │     in Tiptap toolbar  │                       │
       │                        │                       │
       │  2. File picker opens, │                       │
       │     admin selects file │                       │
       │                        │                       │
       │  3. POST /api/upload   │                       │
       │     multipart/form-data│                       │
       │───────────────────────►│                       │
       │                        │                       │
       │                        │ 4. Validate session   │
       │                        │    (ADMIN role)       │
       │                        │                       │
       │                        │ 5. Validate file:     │
       │                        │    - MIME allowlist   │
       │                        │    - Size ≤ 5 MB      │
       │                        │                       │
       │                        │ 6. Generate key:      │
       │                        │    uploads/{uuid}-    │
       │                        │    {safe-name}        │
       │                        │                       │
       │                        │ 7. PutObjectCommand   │
       │                        │───────────────────────►
       │                        │                       │
       │                        │ 8. R2 stores file,    │
       │                        │    returns success    │
       │                        │◄───────────────────────
       │                        │                       │
       │                        │ 9. Construct public   │
       │                        │    CDN URL:           │
       │                        │    {R2_PUBLIC_URL}/   │
       │                        │    uploads/{key}      │
       │                        │                       │
       │  10. Return { url }    │                       │
       │◄───────────────────────│                       │
       │                        │                       │
       │  11. Tiptap inserts    │                       │
       │      <img src="{url}"> │                       │
       │      into editor       │                       │
```

### 3.2 Upload API Route: `POST /api/upload`

**Location:** `src/pages/api/upload.ts`

**Processing Pipeline:**
```
Request received
      │
      ▼
Check Better-Auth session (ADMIN role) ── Unauthorized ──► 401
      │
      ▼
Parse multipart/form-data
      │
      ▼
Validate MIME type ───────────────────── Invalid ────────► 400
(image/jpeg, image/png,
 image/webp, image/gif)
      │
      ▼
Validate file size ───────────────────── Too large ──────► 413
(≤ MAX_UPLOAD_SIZE_MB)
      │
      ▼
Sanitize original filename
(strip path components,
 normalize to alphanum + dots)
      │
      ▼
Generate UUID-prefixed key:
"uploads/{uuid}-{sanitized-name}"
      │
      ▼
PutObjectCommand to R2 ───────────────── Error ──────────► 500
      │
      ▼
Return { url: "{R2_PUBLIC_URL}/uploads/{key}" }
```

### 3.3 Storage Architecture

Images are stored in Cloudflare R2 (S3-compatible object storage) under the `uploads/` prefix.

- **No local disk storage** — no Docker volumes for uploads
- **Public CDN delivery** — R2 public bucket URL serves images globally
- **Durable** — R2 provides 11 9s durability; no backup volume management needed
- **Key format:** `uploads/{uuid}-{sanitized-filename}.{ext}`

---

## 4. Blog Post Public Retrieval Flow

### 4.1 Blog Listing Page (`/blog`)

```
[Browser]               [Astro Server]              [PostgreSQL]
    │                        │                           │
    │  GET /blog             │                           │
    │───────────────────────►│                           │
    │                        │  SELECT id, title, slug,  │
    │                        │  excerpt, createdAt FROM  │
    │                        │  posts WHERE              │
    │                        │  published = true         │
    │                        │  ORDER BY createdAt DESC  │
    │                        │  LIMIT 10 OFFSET n        │
    │                        │  (Drizzle ORM)            │
    │                        │──────────────────────────►│
    │                        │                           │
    │                        │  Returns post list        │
    │                        │◄──────────────────────────│
    │                        │                           │
    │                        │  Server-renders HTML      │
    │  Returns HTML          │                           │
    │◄───────────────────────│                           │
```

### 4.2 Individual Post Page (`/blog/[slug]`)

```
[Browser]               [Astro Server]              [PostgreSQL]
    │                        │                           │
    │  GET /blog/my-post     │                           │
    │───────────────────────►│                           │
    │                        │  SELECT * FROM posts      │
    │                        │  WHERE slug = 'my-post'   │
    │                        │  AND published = true     │
    │                        │──────────────────────────►│
    │                        │                           │
    │                        │  Returns post data        │
    │                        │◄──────────────────────────│
    │                        │                           │
    │                        │  Server-renders HTML      │
    │                        │  (prose typography)       │
    │  Returns HTML          │                           │
    │◄───────────────────────│                           │
    │                        │                           │
    │  (cover image / inline │                           │
    │   images served from   │                           │
    │   Cloudflare R2 CDN)   │                           │
    │  GET {R2_PUBLIC_URL}/… │                           │
    │───────────────────────►│ (Cloudflare CDN, not Astro)
```

### 4.3 Home Page Blog Preview (`/`)

The home page fetches the 3 most recent published posts at request time and renders them in the Overview tab of the bento dashboard:

```typescript
// src/pages/index.astro
const blogPosts = await db
  .select()
  .from(postsTable)
  .where(eq(postsTable.published, true))
  .orderBy(desc(postsTable.createdAt))
  .limit(3);
```

### 4.4 Cache Strategy

| Route | Rendering | Notes |
|---|---|---|
| `/` | SSR (per-request) | Fresh blog preview on every request |
| `/blog` | SSR (per-request) | Always shows latest posts |
| `/blog/[slug]` | SSR (per-request) | Always shows current content |
| `/resume` | SSR | Dynamic content from Drizzle settings |
| Images | R2 / Cloudflare CDN | Cached at edge; long TTL |

---

## 5. Authentication Data Flow

### 5.1 Login Flow (Better-Auth)

```
[Admin Browser]       [Astro Middleware]     [Better-Auth]      [PostgreSQL]
      │                      │                    │                  │
      │  GET /admin/dashboard│                    │                  │
      │─────────────────────►│                    │                  │
      │                      │ getSession()        │                  │
      │                      │ (reads session cookie)               │
      │                      │───────────────────►│                  │
      │                      │ No session          │                  │
      │  302 → /admin/login  │                    │                  │
      │◄─────────────────────│                    │                  │
      │                      │                    │                  │
      │  POST /api/auth/sign-in/email              │                  │
      │  { email, password }  │                    │                  │
      │───────────────────────────────────────────►│                  │
      │                      │                    │ SELECT user       │
      │                      │                    │ WHERE email=?     │
      │                      │                    │─────────────────►│
      │                      │                    │ Returns user row  │
      │                      │                    │◄─────────────────│
      │                      │                    │ bcrypt.compare()  │
      │                      │                    │ Verify role=ADMIN │
      │  Set-Cookie: session  │                    │                  │
      │◄───────────────────────────────────────────│                  │
      │  302 → /admin/dashboard                    │                  │
```

### 5.2 Session Verification on Protected Routes

```
Every request to /admin/* or /client/*:

[Request] → middleware.ts → auth.api.getSession(headers)
                                      │
                          Valid session ───► Set context.locals.user
                                      │      Allow request through
                          No session  ───► Redirect to /admin/login
                                           (or /client/login)
```

**Location:** `src/middleware.ts`

```typescript
export const onRequest = defineMiddleware(async (context, next) => {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });
  context.locals.user = session?.user ?? null;
  context.locals.session = session?.session ?? null;

  const { pathname } = new URL(context.request.url);

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!session || session.user.role !== "ADMIN") {
      return context.redirect("/admin/login");
    }
  }

  if (pathname.startsWith("/client") && pathname !== "/client/login") {
    if (!session) return context.redirect("/client/login");
  }

  return next();
});
```

---

## 6. Data Persistence Summary

| Data Type | Storage | Durability | Backup Strategy |
|---|---|---|---|
| Blog posts | PostgreSQL (Docker container) | Named volume `postgres_data` | `pg_dump`; consider managed DB (RDS/Neon) for HA |
| Uploaded images | Cloudflare R2 | 11 9s (R2 SLA) | Redundant by default; optional R2 bucket replication |
| User credentials | PostgreSQL | Same as blog posts | Same as blog posts |
| Sessions | Better-Auth (DB-backed or cookie JWT) | — | Stateless — no backup needed |
| Site settings | PostgreSQL (key-value store) | Named volume `postgres_data` | Same as blog posts |
| Resume PDF | `public/` directory | Git repository | Version controlled |

---

## 7. Error Handling

| Scenario | Handling |
|---|---|
| DB connection fails | Astro returns 500; error boundary shown |
| Post slug collision | Auto-append numeric suffix (`-2`, `-3`) |
| Image upload MIME violation | Return 400 with descriptive error |
| Image upload size violation | Return 413 with size limit info |
| R2 write failure | Return 500; log error server-side |
| Unauthenticated upload attempt | Return 401 |
| Post not found (`/blog/[slug]`) | Astro `return Astro.redirect('/404')` |
| GitHub API rate limit (home page) | Catch error; render empty repos section |

### 7.1 Structured Logging

All API routes use the centralized `logger` utility (`src/lib/logger.ts`) for consistent error tracking:

```
[2026-03-30T17:30:20.850Z] [ERROR] Upload failed | Error: R2_BUCKET not configured | {"filename":"test.jpg","contentType":"image/jpeg"}
```

This provides:
- ISO 8601 timestamps for log correlation
- Log levels (DEBUG, INFO, WARN, ERROR)
- Contextual metadata for debugging
- Error details including stack traces when available

Debug logs are suppressed in production to reduce noise while maintaining error visibility.
