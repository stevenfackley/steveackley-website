# Software Design Document (SDD)

**Project:** steveackley.org  
**Version:** 1.0.0  
**Date:** 2026-02-26  
**Author:** Steve Ackley  
**Status:** Approved

---

## 1. Introduction

### 1.1 Purpose

This document describes the software architecture, component structure, data models, API design, and technology decisions for `steveackley.org`. It serves as the technical blueprint for developers building and maintaining the project.

### 1.2 Scope

Covers the entire application: the Next.js web application, PostgreSQL database, file storage, authentication system, admin panel, and Docker infrastructure.

### 1.3 References

- [PRD.md](./PRD.md) — Product Requirements Document
- [DATA_FLOW.md](./DATA_FLOW.md) — Blog Post & Image Data Flow
- [SECURITY.md](./SECURITY.md) — Security Considerations

---

## 2. System Architecture

### 2.1 High-Level Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Docker Host                            │
│                                                              │
│  ┌─────────────────────────┐    ┌──────────────────────┐    │
│  │   Next.js App (web)     │    │   PostgreSQL (db)     │    │
│  │   Port: 3000            │◄──►│   Port: 5432          │    │
│  │                         │    │                       │    │
│  │  ┌───────────────────┐  │    │  Volume: pgdata        │    │
│  │  │  Next.js App      │  │    └──────────────────────┘    │
│  │  │  Router           │  │                                 │
│  │  │  Server Components│  │    ┌──────────────────────┐    │
│  │  │  Server Actions   │  │    │  Named Volume:        │    │
│  │  │  API Routes       │  │    │  uploads             │    │
│  │  │  NextAuth.js      │  │    │  /app/uploads/        │    │
│  │  └───────────────────┘  │    └──────────────────────┘    │
│  │                         │              ▲                  │
│  │  Volume: uploads ───────┼──────────────┘                  │
│  └─────────────────────────┘                                 │
└──────────────────────────────────────────────────────────────┘
         ▲
         │  HTTP / HTTPS
         ▼
    [ Browser Client ]
```

### 2.2 Technology Stack

| Component | Technology | Version | Rationale |
|---|---|---|---|
| Framework | Next.js | 15.x | App Router, Server Components, Server Actions — ideal for SSR + static pages |
| Language | TypeScript | 5.x | Type safety, improved DX |
| Styling | Tailwind CSS | 4.x | Utility-first, excellent dark mode support |
| ORM | Prisma | 6.x | Type-safe database access, migrations, schema-first |
| Database | PostgreSQL | 16 | Robust, reliable, well-supported |
| Auth | NextAuth.js | 5.x (Auth.js) | First-class Next.js App Router support |
| Rich Text | Tiptap | 2.x | Headless, extensible, React-based editor |
| Hashing | bcrypt | — | Password hashing with configurable cost factor |
| Containerization | Docker | — | Multi-stage builds, reproducible environments |
| Orchestration | Docker Compose | — | Multi-container local dev and production |

---

## 3. Project Structure

```
steveackleyorg/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (public)/                 # Public route group
│   │   │   ├── layout.tsx            # Public layout with nav + footer
│   │   │   ├── page.tsx              # Home page (bento dashboard)
│   │   │   ├── blog/
│   │   │   │   ├── page.tsx          # Blog listing
│   │   │   │   └── [slug]/
│   │   │   │       └── page.tsx      # Individual blog post
│   │   ├── admin/                    # Admin route group (protected)
│   │   │   ├── layout.tsx            # Admin layout
│   │   │   ├── login/
│   │   │   │   └── page.tsx          # Admin login page
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx          # Post management dashboard
│   │   │   └── posts/
│   │   │       ├── new/
│   │   │       │   └── page.tsx      # New post editor
│   │   │       └── [id]/
│   │   │           └── edit/
│   │   │               └── page.tsx  # Edit post editor
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts      # NextAuth API handler
│   │   │   └── upload/
│   │   │       └── route.ts          # Image upload API route
│   │   ├── layout.tsx                # Root layout
│   │   └── globals.css               # Global styles + Tailwind
│   ├── components/
│   │   ├── bento/                    # Bento dashboard cards
│   │   │   ├── BentoDashboard.tsx
│   │   │   ├── HeroCard.tsx
│   │   │   ├── SkillsCard.tsx
│   │   │   ├── AboutCard.tsx
│   │   │   ├── ProjectsCard.tsx
│   │   │   ├── BlogPreviewCard.tsx
│   │   │   └── CTACard.tsx
│   │   ├── blog/                     # Blog components
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostList.tsx
│   │   │   ├── PostContent.tsx
│   │   │   └── Pagination.tsx
│   │   ├── admin/                    # Admin components
│   │   │   ├── PostEditor.tsx        # Tiptap editor wrapper
│   │   │   ├── ImageUploadButton.tsx
│   │   │   ├── PostForm.tsx
│   │   │   └── AdminPostTable.tsx
│   │   └── ui/                       # Shared UI primitives
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Badge.tsx
│   │       └── Nav.tsx
│   ├── lib/
│   │   ├── prisma.ts                 # Prisma client singleton
│   │   ├── auth.ts                   # NextAuth config
│   │   ├── utils.ts                  # Shared utilities (slugify, etc.)
│   │   └── upload.ts                 # File upload utilities
│   ├── types/
│   │   └── index.ts                  # Shared TypeScript types
│   └── middleware.ts                 # NextAuth route protection
├── prisma/
│   ├── schema.prisma                 # Database schema
│   └── migrations/                   # Prisma migration files
├── public/
│   ├── resume.pdf                    # Steve's resume (manual placement)
│   └── favicon.ico
├── uploads/                          # Local dev uploads (Docker volume in prod)
├── docs/                             # Project documentation
├── Dockerfile                        # Multi-stage production Docker build
├── docker-compose.yml                # Multi-container orchestration
├── docker-compose.dev.yml            # Development overrides
├── .env.example                      # Environment variable template
├── next.config.ts                    # Next.js configuration
├── tailwind.config.ts                # Tailwind configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json
```

---

## 4. Database Design

### 4.1 Prisma Schema

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Post {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  content     String   // Tiptap HTML output
  excerpt     String?  // Auto-generated or manually set
  coverImage  String?  // Relative path: /uploads/{filename}
  published   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 4.2 Indexes

- `User.email` — Unique index (enforced by `@unique`)
- `Post.slug` — Unique index (enforced by `@unique`)
- `Post.published` + `Post.createdAt` — Composite index for blog listing queries (added via migration)
- `Post.createdAt` — For ordering and pagination

### 4.3 Entity Relationships

In v1 there is a single `User` (admin) and `Post` entities. No relational FK between them is required since only one user authors content. Future versions may add an `authorId` FK.

---

## 5. Authentication Design

### 5.1 NextAuth.js (Auth.js v5) Configuration

```
Provider: Credentials
Session Strategy: JWT (stateless, no DB session table needed)
Protected Routes: /admin/* (enforced by middleware.ts)
Login Page: /admin/login
```

### 5.2 Auth Flow

```
1. Admin navigates to /admin/*
2. middleware.ts checks for valid JWT session token
3. If no session → redirect to /admin/login
4. Admin submits email + password
5. NextAuth Credentials provider:
   a. Queries User table by email
   b. Compares submitted password against bcrypt hash
   c. If valid → issues JWT session cookie
   d. If invalid → returns error
6. Admin is redirected to /admin/dashboard
7. JWT cookie is HttpOnly, SameSite=Lax, Secure (in production)
```

### 5.3 Middleware

```typescript
// src/middleware.ts
export { auth as middleware } from "@/lib/auth";
export const config = {
  matcher: ["/admin/:path*"],
};
```

---

## 6. API Routes

### 6.1 NextAuth

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth handler (login, logout, session) |

### 6.2 Image Upload

| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/api/upload` | ✅ Yes | Upload an image; returns `{ url: string }` |

**Request:** `multipart/form-data` with field `file`  
**Validation:**
- MIME type must be one of: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- File size must not exceed 5 MB
- Filename is sanitized and prefixed with a UUID

**Response:**
```json
{ "url": "/uploads/a1b2c3d4-filename.jpg" }
```

---

## 7. Server Actions

Server Actions are used for all blog CRUD operations to keep DB logic server-side:

| Action | File | Description |
|---|---|---|
| `createPost` | `app/admin/posts/new/actions.ts` | Create a new blog post |
| `updatePost` | `app/admin/posts/[id]/edit/actions.ts` | Update an existing post |
| `deletePost` | `app/admin/dashboard/actions.ts` | Delete a post by ID |
| `togglePublished` | `app/admin/dashboard/actions.ts` | Toggle published status |

All Server Actions:
- Verify session before executing (defense in depth beyond middleware)
- Use Prisma for all DB operations
- Revalidate relevant Next.js cache paths after mutations

---

## 8. Component Design

### 8.1 Bento Dashboard Grid

The home page uses CSS Grid with named template areas:

```
Desktop (≥1024px):                  Tablet (≥768px):
┌──────────────┬────────┐           ┌──────────┬────────┐
│     HERO     │ SKILLS │           │   HERO   │ SKILLS │
│  (col-span-2)│        │           │(col-span)│        │
├──────┬───────┴────────┤           ├──────────┴────────┤
│ABOUT │    PROJECTS    │           │      PROJECTS     │
│      │  (col-span-2)  │           │                   │
├──────┴───────┬────────┤           ├─────────┬─────────┤
│  BLOG PREV   │  CTA   │           │  ABOUT  │   CTA   │
│  (col-span-2)│        │           │         │         │
└──────────────┴────────┘           └─────────┴─────────┘

Mobile: Single column stacked
```

### 8.2 Card Component Spec

Every bento card follows this base pattern:

```tsx
interface CardProps {
  href?: string;           // Makes card navigable
  className?: string;      // Additional grid span classes
  children: React.ReactNode;
}
```

Base styles:
- Background: `bg-white dark:bg-neutral-900`
- Border: `border border-neutral-200 dark:border-neutral-800`
- Radius: `rounded-2xl`
- Padding: `p-6` (mobile) / `p-8` (desktop)
- Hover: `hover:border-neutral-300 dark:hover:border-neutral-700 hover:-translate-y-0.5 transition-all duration-200`

### 8.3 Blog Post Editor (Tiptap)

Extensions enabled:
- `StarterKit` (bold, italic, headings, lists, blockquote, code)
- `Image` (insert images from upload)
- `Link` (hyperlinks)
- `Placeholder` (empty state hint)
- `Typography` (smart quotes, em dashes)
- `CodeBlockLowlight` (syntax highlighted code blocks)

---

## 9. Theming

### 9.1 Tailwind Dark Mode Config

```typescript
// tailwind.config.ts
export default {
  darkMode: 'media',  // Uses prefers-color-scheme
  // ...
}
```

### 9.2 Color Palette

| Token | Light | Dark |
|---|---|---|
| Background | `#fafafa` (`neutral-50`) | `#0a0a0a` |
| Surface | `#ffffff` | `#141414` |
| Surface Hover | `#f5f5f5` (`neutral-100`) | `#1e1e1e` |
| Border | `#e5e5e5` (`neutral-200`) | `#2a2a2a` |
| Border Hover | `#d4d4d4` (`neutral-300`) | `#3a3a3a` |
| Text Primary | `#171717` (`neutral-900`) | `#ededed` |
| Text Secondary | `#525252` (`neutral-600`) | `#a3a3a3` |
| Text Muted | `#737373` (`neutral-500`) | `#737373` |
| Accent | `#2563eb` (`blue-600`) | `#60a5fa` (`blue-400`) |
| Accent Hover | `#1d4ed8` (`blue-700`) | `#93c5fd` (`blue-300`) |

---

## 10. Performance Considerations

- **Server Components by default** — Only interactive components (`PostEditor`, nav toggles) are Client Components
- **Static generation** — Home page and individual blog posts use `generateStaticParams` for ISR
- **Image optimization** — Next.js `<Image>` for all images (auto WebP conversion, lazy loading, srcset)
- **Font optimization** — `next/font` for zero-CLS font loading (Inter or Geist)
- **Code splitting** — Tiptap editor is dynamically imported (`next/dynamic`) so it doesn't bloat public pages

---

## 11. Environment Variables

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db:5432/steveackley` |
| `NEXTAUTH_SECRET` | Secret for JWT signing | Random 32-char string |
| `NEXTAUTH_URL` | Application base URL | `http://localhost:3000` |
| `ADMIN_EMAIL` | Admin login email | `stevenfackley@gmail.com` |
| `ADMIN_PASSWORD_HASH` | bcrypt hash of admin password | Generated at setup |
| `NEXT_PUBLIC_LINKEDIN_URL` | LinkedIn profile URL | `https://linkedin.com/in/...` |
| `NEXT_PUBLIC_EMAIL` | Contact email address | `stevenfackley@gmail.com` |
| `NEXT_PUBLIC_P1_OPS_HUB_URL` | P1 Ops Hub project URL | `https://...` |
| `UPLOAD_DIR` | Path for image uploads | `/app/uploads` |
| `MAX_UPLOAD_SIZE_MB` | Max upload size in MB | `5` |
