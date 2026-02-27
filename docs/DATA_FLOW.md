# Data Flow Document

**Project:** steveackley.org  
**Version:** 1.0.0  
**Date:** 2026-02-26  
**Author:** Steve Ackley  
**Status:** Approved

---

## 1. Overview

This document details how data moves through the `steveackley.org` system, covering:

1. Blog post creation, storage, and retrieval
2. Image upload flow and volume persistence
3. Blog post public rendering
4. Authentication flow

---

## 2. Blog Post Creation Flow

### 2.1 Step-by-Step Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    BLOG POST CREATION                         │
└──────────────────────────────────────────────────────────────┘

  [Admin Browser]                [Next.js Server]         [PostgreSQL]
       │                               │                       │
       │  1. GET /admin/posts/new      │                       │
       │──────────────────────────────►│                       │
       │                               │ (middleware checks JWT)│
       │  2. Returns PostEditor page   │                       │
       │◄──────────────────────────────│                       │
       │                               │                       │
       │  3. Admin writes content      │                       │
       │     in Tiptap editor          │                       │
       │                               │                       │
       │  4. Admin clicks "Save"       │                       │
       │──────────────────────────────►│                       │
       │     (Server Action:           │                       │
       │      createPost)              │                       │
       │                               │ 5. INSERT into posts  │
       │                               │──────────────────────►│
       │                               │                       │
       │                               │ 6. Returns new post   │
       │                               │◄──────────────────────│
       │                               │                       │
       │                               │ 7. revalidatePath(    │
       │                               │    '/blog',           │
       │                               │    '/admin/dashboard')│
       │                               │                       │
       │  8. Redirect to dashboard     │                       │
       │◄──────────────────────────────│                       │
```

### 2.2 Server Action: `createPost`

**Input (form data):**
```typescript
{
  title: string;           // Post title
  content: string;         // Tiptap HTML output
  excerpt?: string;        // Optional manual excerpt
  coverImage?: string;     // Path to uploaded cover image
  published: boolean;      // Draft or published
}
```

**Processing:**
1. Verify session (defense in depth)
2. Sanitize and validate inputs
3. Auto-generate slug from title (e.g., `"Hello World"` → `"hello-world"`)
4. Ensure slug uniqueness (append `-2`, `-3` if collision)
5. Auto-generate excerpt from content if not provided (strip HTML, take first 160 chars)
6. Insert into PostgreSQL via Prisma

**Output:**
- On success: Redirect to `/admin/dashboard`
- On failure: Return error message to form

---

## 3. Image Upload Flow

### 3.1 Step-by-Step Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    IMAGE UPLOAD FLOW                          │
└──────────────────────────────────────────────────────────────┘

  [Admin Browser]           [Next.js Server]        [Filesystem/Volume]
       │                          │                        │
       │  1. Admin clicks         │                        │
       │     "Insert Image"       │                        │
       │     in Tiptap toolbar    │                        │
       │                          │                        │
       │  2. File picker opens,   │                        │
       │     admin selects file   │                        │
       │                          │                        │
       │  3. POST /api/upload     │                        │
       │     Content-Type:        │                        │
       │     multipart/form-data  │                        │
       │─────────────────────────►│                        │
       │                          │                        │
       │                          │ 4. Validate session    │
       │                          │    (auth check)        │
       │                          │                        │
       │                          │ 5. Validate file:      │
       │                          │    - MIME type         │
       │                          │    - Size ≤ 5MB        │
       │                          │    - Extension check   │
       │                          │                        │
       │                          │ 6. Generate filename:  │
       │                          │    {uuid}-{safe-name}  │
       │                          │                        │
       │                          │ 7. Write to            │
       │                          │    /app/uploads/       │──────────►│
       │                          │    {filename}          │  (volume) │
       │                          │                        │           │
       │                          │ 8. Return JSON:        │           │
       │                          │    { url: "/uploads/   │           │
       │                          │       {filename}" }    │           │
       │◄─────────────────────────│                        │           │
       │                          │                        │           │
       │  9. Tiptap inserts       │                        │           │
       │     <img src="/uploads/  │                        │           │
       │     {filename}"> into    │                        │           │
       │     editor content       │                        │           │
```

### 3.2 Upload API Route: `POST /api/upload`

**Location:** `src/app/api/upload/route.ts`

**Processing Pipeline:**
```
Request received
      │
      ▼
Check session (NextAuth) ──── Unauthorized ──► 401 Response
      │
      ▼
Parse multipart/form-data
      │
      ▼
Validate MIME type ─────────── Invalid ──────► 400 Response
(image/jpeg, image/png,
 image/webp, image/gif)
      │
      ▼
Validate file size ─────────── Too large ────► 413 Response
(≤ 5 MB)
      │
      ▼
Sanitize original filename
(strip path components,
 normalize to alphanum + dots)
      │
      ▼
Generate UUID prefix
(e.g., "a1b2c3d4-e5f6-...")
      │
      ▼
Construct final filename:
"{uuid}-{sanitized-name}.{ext}"
      │
      ▼
Ensure /app/uploads/ exists
(create if missing)
      │
      ▼
Write file to disk ──────────── Write error ──► 500 Response
      │
      ▼
Return { url: "/uploads/{filename}" }
```

### 3.3 Docker Volume Mapping

The `/app/uploads/` directory inside the container is mounted to a named Docker volume:

```yaml
# docker-compose.yml
services:
  web:
    volumes:
      - uploads:/app/uploads

volumes:
  uploads:
    driver: local
```

**What this means:**
- Files written to `/app/uploads/` inside the container are persisted on the host
- If the container is stopped, restarted, or rebuilt, **images are not lost**
- The volume lives at a Docker-managed path on the host (e.g., `/var/lib/docker/volumes/steveackleyorg_uploads/_data/` on Linux)
- For AWS deployment, this volume should be replaced with an EFS (Elastic File System) mount or S3 bucket

### 3.4 Image Serving

Uploaded images are served as static files from the `/uploads/` URL path:

```typescript
// next.config.ts
// Images in /app/uploads are NOT in the Next.js public/ directory.
// They are served via a custom static file route:

// Option A: next.config.ts rewrites
async rewrites() {
  return [
    {
      source: '/uploads/:path*',
      destination: '/api/uploads/:path*',
    },
  ];
}

// Option B (simpler): next/static-files via custom route handler
// src/app/api/uploads/[...path]/route.ts
// Reads file from UPLOAD_DIR and streams it as response
```

---

## 4. Blog Post Public Retrieval Flow

### 4.1 Blog Listing Page (`/blog`)

```
[Browser]              [Next.js Server]           [PostgreSQL]
    │                        │                          │
    │  GET /blog             │                          │
    │───────────────────────►│                          │
    │                        │  SELECT posts WHERE      │
    │                        │  published=true          │
    │                        │  ORDER BY createdAt DESC │
    │                        │  LIMIT 10 OFFSET (page-1)│
    │                        │─────────────────────────►│
    │                        │                          │
    │                        │  Returns post list       │
    │                        │◄─────────────────────────│
    │                        │                          │
    │                        │  Render Server Component │
    │                        │  with post cards         │
    │  Returns HTML          │                          │
    │◄───────────────────────│                          │
```

### 4.2 Individual Post Page (`/blog/[slug]`)

```
[Browser]              [Next.js Server]           [PostgreSQL]
    │                        │                          │
    │  GET /blog/my-post     │                          │
    │───────────────────────►│                          │
    │                        │  SELECT * FROM posts     │
    │                        │  WHERE slug='my-post'    │
    │                        │  AND published=true      │
    │                        │─────────────────────────►│
    │                        │                          │
    │                        │  Returns post data       │
    │                        │◄─────────────────────────│
    │                        │                          │
    │                        │  Render HTML content     │
    │                        │  (via prose typography)  │
    │  Returns HTML          │                          │
    │◄───────────────────────│                          │
    │                        │                          │
    │  (If post has          │                          │
    │   coverImage)          │                          │
    │  GET /uploads/file.jpg │                          │
    │───────────────────────►│                          │
    │                        │  Stream from volume      │
    │  Returns image bytes   │                          │
    │◄───────────────────────│                          │
```

### 4.3 Cache Strategy

| Route | Rendering | Cache | Revalidation |
|---|---|---|---|
| `/blog` | SSR (dynamic) | No cache | On demand (revalidatePath) |
| `/blog/[slug]` | ISR | 60 seconds | After post update |
| `/` (home) | SSR | 60 seconds | On demand |
| `/uploads/*` | Static file | Browser cache (1 year) | — |

---

## 5. Authentication Data Flow

### 5.1 Login Flow

```
[Admin Browser]        [Next.js Middleware]    [NextAuth]        [PostgreSQL]
      │                        │                   │                  │
      │  GET /admin/dashboard  │                   │                  │
      │───────────────────────►│                   │                  │
      │                        │  Check JWT cookie │                  │
      │                        │  (no cookie found)│                  │
      │  302 → /admin/login    │                   │                  │
      │◄───────────────────────│                   │                  │
      │                        │                   │                  │
      │  POST /api/auth/signin  │                   │                  │
      │  { email, password }   │                   │                  │
      │────────────────────────────────────────────►                  │
      │                        │                   │                  │
      │                        │                   │ SELECT user      │
      │                        │                   │ WHERE email=?    │
      │                        │                   │─────────────────►│
      │                        │                   │                  │
      │                        │                   │ Returns user row │
      │                        │                   │◄─────────────────│
      │                        │                   │                  │
      │                        │                   │ bcrypt.compare() │
      │                        │                   │ (password,hash)  │
      │                        │                   │                  │
      │  Set-Cookie: JWT token │                   │                  │
      │◄───────────────────────────────────────────│                  │
      │  302 → /admin/dashboard│                   │                  │
```

### 5.2 Session Verification on Protected Routes

```
Every request to /admin/*:

[Request] → middleware.ts → auth() → Decode JWT cookie
                                          │
                            Valid JWT ────► Allow request through
                                          │
                            No JWT   ────► Redirect to /admin/login
                            Expired JWT──► Redirect to /admin/login
```

---

## 6. Data Persistence Summary

| Data Type | Storage | Persistence Mechanism | Backup Strategy |
|---|---|---|---|
| Blog posts | PostgreSQL | Named Docker volume `pgdata` | pg_dump; AWS RDS snapshots in production |
| Uploaded images | Local filesystem | Named Docker volume `uploads` | Rsync backup; AWS EFS/S3 in production |
| User credentials | PostgreSQL | Named Docker volume `pgdata` | Same as blog posts |
| Session tokens | JWT (stateless) | Client cookie only | N/A — stateless |
| Resume PDF | `public/` directory | Git repository | Version controlled |

---

## 7. Error Handling

| Scenario | Handling |
|---|---|
| DB connection fails | Server returns 500; Next.js error boundary shown |
| Post slug collision | Auto-append numeric suffix (`-2`, `-3`) |
| Image upload MIME violation | Return 400 with descriptive error message |
| Image upload size violation | Return 413 with size limit info |
| Disk write failure | Return 500; log error server-side |
| Unauthenticated upload attempt | Return 401 |
| Post not found (`/blog/[slug]`) | Next.js `notFound()` — renders 404 page |
