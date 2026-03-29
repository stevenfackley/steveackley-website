# Software Design Document (SDD)

**Project:** steveackley.org  
**Version:** 2.0.0  
**Date:** March 2026  
**Author:** Steve Ackley  
**Status:** Current

---

## 1. Introduction

### 1.1 Purpose

This document describes the software architecture, component structure, data models, API design, and technology decisions for `steveackley.org`. It serves as the technical blueprint for developers building and maintaining the project.

### 1.2 Scope

Covers the entire application: the Astro 5 web application, PostgreSQL database, Cloudflare R2 storage, Better-Auth authentication system, admin panel, and Docker infrastructure.

### 1.3 References

- [PRD.md](./PRD.md) — Product Requirements Document
- [DATA_FLOW.md](./DATA_FLOW.md) — Blog Post & Image Data Flow
- [SECURITY.md](./SECURITY.md) — Security Considerations
- [ROUTES.md](./ROUTES.md) — Route Map

---

## 2. System Architecture

### 2.1 High-Level Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Docker Host (EC2)                      │
│                                                              │
│  ┌─────────────────────────┐    ┌──────────────────────┐    │
│  │   Astro 5 App (web)     │    │   PostgreSQL (db)     │    │
│  │   Port: 3000            │◄──►│   Port: 5432          │    │
│  │                         │    │   (internal only)     │    │
│  │  ┌───────────────────┐  │    │  Volume: postgres_data│    │
│  │  │  Astro SSR        │  │    └──────────────────────┘    │
│  │  │  Astro Actions    │  │                                 │
│  │  │  API Routes       │  │                                 │
│  │  │  Better-Auth      │  │    ┌──────────────────────┐    │
│  │  │  Drizzle ORM      │  │    │  Cloudflare R2       │    │
│  │  │  React Islands    │  │◄──►│  (S3-compatible)     │    │
│  │  └───────────────────┘  │    │  Image storage       │    │
│  └─────────────────────────┘    └──────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
         ▲
         │  Cloudflare Tunnel (no exposed ports)
         ▼
    [ Cloudflare Edge ]
         ▲
         │  HTTPS
         ▼
    [ Browser Client ]
```

### 2.2 Technology Stack

| Component | Technology | Version | Rationale |
|---|---|---|---|
| Framework | Astro | 5.x | SSR + Islands Architecture; minimal JS to client |
| Language | TypeScript | 5.x | Type safety, improved DX |
| Styling | Tailwind CSS | 4.x | Utility-first, excellent dark mode support |
| ORM | Drizzle ORM | — | Lightweight, type-safe, SQL-first; no Prisma overhead |
| Database | PostgreSQL | 16 | Robust, reliable, well-supported |
| Auth | Better-Auth | — | Modern role-based auth; Drizzle adapter; replaces NextAuth |
| Rich Text | Tiptap | 2.x | Headless, extensible, React-based editor |
| Storage | Cloudflare R2 | — | S3-compatible object storage; replaces local Docker volumes |
| UI Components | React 19 | — | Client islands only; used in admin and bento dashboard |
| Hashing | Better-Auth built-in | — | bcrypt via Better-Auth |
| Containerization | Docker | — | Multi-stage builds, reproducible environments |
| Orchestration | Docker Compose | — | Multi-container production deployment |
| Reverse Proxy | Caddy | 2.x | TLS termination; Cloudflare origin certificate |
| CI/CD | GitHub Actions | — | Build, test, push to GHCR, deploy to EC2 |

---

## 3. Project Structure

```
steveackleyorg/
├── src/
│   ├── pages/                        # Astro file-based routing
│   │   ├── index.astro               # Home page (tabbed bento dashboard)
│   │   ├── 404.astro                 # Custom 404
│   │   ├── blog/
│   │   │   ├── index.astro           # Blog listing page
│   │   │   └── [slug].astro          # Individual blog post
│   │   ├── admin/
│   │   │   ├── login.astro           # Admin login page
│   │   │   ├── dashboard.astro       # Post management dashboard
│   │   │   ├── account.astro         # Admin account settings
│   │   │   ├── apps.astro            # Client app management
│   │   │   ├── clients.astro         # Client user management
│   │   │   ├── messages.astro        # Message inbox
│   │   │   ├── settings.astro        # Site settings (key-value CMS)
│   │   │   ├── users.astro           # User management
│   │   │   └── posts/                # Post CRUD pages
│   │   ├── client/
│   │   │   ├── login.astro
│   │   │   ├── dashboard.astro
│   │   │   ├── messages.astro
│   │   │   └── account.astro
│   │   ├── resume/
│   │   │   ├── index.astro           # Interactive resume
│   │   │   └── print.astro           # Print-optimized resume
│   │   └── api/
│   │       ├── upload.ts             # Image upload → Cloudflare R2
│   │       ├── fetch-metadata.ts     # Open Graph metadata fetcher
│   │       └── auth/
│   │           └── [...all].ts       # Better-Auth handler
│   ├── actions/
│   │   └── index.ts                  # Astro Actions (blog CRUD, settings)
│   ├── components/
│   │   ├── bento/                    # Bento dashboard
│   │   │   ├── BentoDashboard.astro  # Astro wrapper
│   │   │   └── TabsDashboard.tsx     # React tabbed dashboard (client island)
│   │   ├── blog/                     # Blog components
│   │   │   ├── PostCard.astro
│   │   │   ├── PostList.astro
│   │   │   ├── PostContent.astro
│   │   │   └── Pagination.astro
│   │   ├── admin/                    # Admin components (React islands)
│   │   │   ├── PostEditor.tsx        # Tiptap editor wrapper
│   │   │   ├── PostForm.tsx
│   │   │   ├── AdminPostTable.tsx
│   │   │   ├── ImageUploadButton.tsx
│   │   │   ├── ClientLoginForm.tsx
│   │   │   ├── LoginForm.tsx
│   │   │   ├── AdminAccountMenu.tsx
│   │   │   └── SettingsUploadField.tsx
│   │   └── ui/                       # Shared UI primitives
│   │       ├── Button.astro
│   │       ├── Card.astro
│   │       ├── Badge.astro
│   │       ├── Nav.astro
│   │       └── Footer.astro
│   ├── layouts/
│   │   ├── BaseLayout.astro          # Root HTML shell
│   │   ├── PublicLayout.astro        # Public pages (nav + footer)
│   │   ├── AdminLayout.astro         # Admin panel layout
│   │   └── ClientLayout.astro        # Client portal layout
│   ├── db/
│   │   ├── index.ts                  # Drizzle client + table re-exports
│   │   └── schema.ts                 # Drizzle schema definitions
│   ├── lib/
│   │   ├── auth.ts                   # Better-Auth server config
│   │   ├── auth-client.ts            # Better-Auth browser client
│   │   ├── db.ts                     # Drizzle client singleton
│   │   ├── github.ts                 # GitHub API utilities
│   │   ├── settings.ts               # Key-value settings helpers
│   │   ├── setting-keys.ts           # Settings key constants
│   │   ├── upload.ts                 # R2 upload utilities
│   │   └── utils.ts                  # Shared utilities (slugify, dates, etc.)
│   ├── hooks/
│   │   └── useIntersectionVisible.ts # Intersection observer hook
│   ├── types/
│   │   └── index.ts                  # Shared TypeScript types
│   ├── styles/
│   │   └── globals.css               # Global styles + Tailwind
│   └── middleware.ts                 # Better-Auth route protection
├── drizzle/                          # Drizzle migration SQL files
│   └── meta/                         # Drizzle migration metadata
├── docker/
│   ├── entrypoint.sh                 # Container startup (schema push + admin seed)
│   └── seed-admin.cjs                # Admin user seeder
├── docs/                             # Project documentation
├── public/
│   └── steve-ackley-resume.pdf       # Resume PDF
├── scripts/                          # CLI utility scripts
├── Dockerfile                        # Multi-stage production Docker build
├── docker-compose.yml                # Production multi-container orchestration
├── docker-compose.dev.yml            # Development overrides
├── drizzle.config.ts                 # Drizzle Kit configuration
├── astro.config.mjs                  # Astro configuration
├── tailwind.config equivalent (in astro.config)
├── tsconfig.json                     # TypeScript configuration
└── package.json
```

---

## 4. Database Design

### 4.1 Drizzle Schema

**Location:** `src/db/schema.ts`

The schema covers:
- **Better-Auth tables** — `user`, `session`, `account`, `verification` (managed by Better-Auth's Drizzle adapter)
- **Application tables** — `posts`, `settings`

```typescript
// posts table
export const posts = pgTable("posts", {
  id:         text("id").primaryKey(),
  title:      text("title").notNull(),
  slug:       text("slug").notNull().unique(),
  content:    text("content").notNull(),    // Tiptap HTML
  excerpt:    text("excerpt"),
  coverImage: text("cover_image"),          // R2 public CDN URL
  published:  boolean("published").default(false).notNull(),
  createdAt:  timestamp("created_at").defaultNow().notNull(),
  updatedAt:  timestamp("updated_at").defaultNow().notNull(),
});

// settings table (key-value CMS)
export const settings = pgTable("settings", {
  key:   text("key").primaryKey(),
  value: text("value").notNull(),
});
```

### 4.2 Indexes

- `posts.slug` — Unique index (enforced by `.unique()`)
- `posts.published` + `posts.createdAt` — Used together in blog listing queries
- Better-Auth tables use their own indexes managed by the library

### 4.3 Migrations

Migrations are managed by **Drizzle Kit**:

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations to DB
npx drizzle-kit push --force   # (used in entrypoint.sh and CI)

# Open Drizzle Studio
npx drizzle-kit studio
```

---

## 5. Authentication Design

### 5.1 Better-Auth Configuration

**Location:** `src/lib/auth.ts`

```
Provider:         Email + Password (Credentials)
Session Strategy: Database-backed sessions (Better-Auth manages session table)
Protected Routes: /admin/* (ADMIN role) and /client/* (any authenticated user)
Login Pages:      /admin/login, /client/login
Role field:       user.role — values: "ADMIN" | "CLIENT" | "USER"
```

### 5.2 Auth Flow

```
1. User navigates to /admin/* (or /client/*)
2. middleware.ts calls auth.api.getSession({ headers })
3. If no session → redirect to /admin/login (or /client/login)
4. User submits email + password to /api/auth/sign-in/email
5. Better-Auth:
   a. Queries user table by email (Drizzle adapter)
   b. Compares submitted password against bcrypt hash
   c. If valid → creates session record in DB, sets session cookie
   d. If invalid → returns 401 error
6. User is redirected to dashboard
7. Session cookie is HttpOnly, SameSite=Lax, Secure (in production)
```

### 5.3 Middleware

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

## 6. API Routes

### 6.1 Better-Auth

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/auth/[...all]` | Better-Auth handler (sign-in, sign-out, session, etc.) |

### 6.2 Image Upload

| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/api/upload` | ✅ ADMIN | Upload image to R2; returns `{ url: string }` |

**Request:** `multipart/form-data` with field `file`  
**Validation:**
- MIME type: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- File size: ≤ `MAX_UPLOAD_SIZE_MB` (default: 5 MB)
- Filename is sanitized and prefixed with a UUID

**Response:**
```json
{ "url": "https://pub-xxxx.r2.dev/uploads/a1b2c3d4-filename.jpg" }
```

### 6.3 Fetch Metadata

| Method | Path | Auth Required | Description |
|---|---|---|---|
| GET | `/api/fetch-metadata` | ✅ Any | Fetch Open Graph/meta tags for a URL |

---

## 7. Astro Actions

Astro Actions (server-side typed mutations) handle all blog and settings CRUD:

**Location:** `src/actions/index.ts`

| Action | Description |
|---|---|
| `createPost` | Create a new blog post |
| `updatePost` | Update an existing post |
| `deletePost` | Delete a post by ID |
| `togglePublished` | Toggle published/draft status |
| `updateSettings` | Update site settings key-value pairs |

All Actions:
- Verify Better-Auth session before executing (defense in depth beyond middleware)
- Use Drizzle ORM for all DB operations
- Return typed results or `ActionError` on failure

---

## 8. Component Design

### 8.1 Bento Dashboard (Home Page)

The home page is a single-page tabbed dashboard implemented as a React client island (`TabsDashboard.tsx`). Tabs:

- **Overview** — Hero card, skills, about, projects preview, recent posts preview
- **About** — Bio, career timeline, interests
- **Skills** — Skill categories with proficiency bars
- **Projects** — GitHub repos + private projects
- **Blog** — Full list of published posts
- **Connect** — LinkedIn, email, GitHub, resume

Data is fetched server-side in `src/pages/index.astro` and passed as props to the island:
- `blogPosts` — up to 3 recent published posts from PostgreSQL
- `githubRepos` — public repos from GitHub API (enriched with badges)
- `avatarUrl` — GitHub avatar
- `couplePhotoUrl` — R2 URL for personal photo

### 8.2 Blog Post Editor (Tiptap)

**Location:** `src/components/admin/PostEditor.tsx`

Extensions enabled:
- `StarterKit` (bold, italic, headings, lists, blockquote, code)
- `Image` (insert images from R2 upload)
- `Link` (hyperlinks)
- `Placeholder` (empty state hint)
- `Typography` (smart quotes, em dashes)
- `CodeBlockLowlight` (syntax highlighted code blocks)

---

## 9. Theming

### 9.1 Dark Mode

Dark mode uses CSS custom properties toggled via `prefers-color-scheme` and a manual toggle stored in `localStorage`. CSS variables are defined in `src/styles/globals.css`.

### 9.2 Color Palette (CSS Variables)

| Variable | Light | Dark |
|---|---|---|
| `--background` | `#fafafa` | `#0a0a0a` |
| `--surface` | `#ffffff` | `#141414` |
| `--surface-hover` | `#f5f5f5` | `#1e1e1e` |
| `--border` | `#e5e5e5` | `#2a2a2a` |
| `--border-hover` | `#d4d4d4` | `#3a3a3a` |
| `--text-primary` | `#171717` | `#ededed` |
| `--text-secondary` | `#525252` | `#a3a3a3` |
| `--text-muted` | `#737373` | `#737373` |
| `--accent` | `#2563eb` | `#60a5fa` |

---

## 10. Performance Considerations

- **Astro SSR** — Pages are rendered on the server per request; no client-side hydration for static content
- **React Islands** — Only the interactive dashboard (`TabsDashboard`) and admin components hydrate on the client (`client:only="react"` / `client:load`)
- **Image CDN** — All uploaded images served from Cloudflare R2's global CDN; no origin image serving
- **GitHub API caching** — GitHub repos are fetched at request time; a failed fetch degrades gracefully (empty array)

---

## 11. Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db:5432/steveackley` |
| `BETTER_AUTH_SECRET` | Secret for session signing | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Application base URL | `https://steveackley.org` |
| `ADMIN_EMAIL` | Admin login email | `stevenfackley@gmail.com` |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of admin password | Generated at setup |
| `GH_API_TOKEN` | GitHub PAT for repo fetching | Classic token, `repo` scope |
| `R2_ACCOUNT_ID` | Cloudflare account ID | — |
| `R2_ACCESS_KEY_ID` | R2 API access key ID | — |
| `R2_SECRET_ACCESS_KEY` | R2 API secret key | — |
| `R2_BUCKET` | R2 bucket name | — |
| `R2_PUBLIC_URL` | R2 public CDN base URL | `https://pub-xxxx.r2.dev` |
| `MAX_UPLOAD_SIZE_MB` | Max upload size | `5` |

See `.env.example` for the complete template.
