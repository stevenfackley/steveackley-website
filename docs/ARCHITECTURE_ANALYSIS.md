# 🏗️ Architecture Analysis & Deployment

## Executive Summary

**Current State:** The application has been rewritten using **Astro 5** and **React Islands**, deployed on AWS EC2 via **Docker** and **Cloudflare Tunnel**.

**Key Changes:**
- Migrated from Next.js 15 to **Astro 5** for superior performance and static-first architecture.
- Replaced NextAuth with **Better-Auth** for modern, role-based authentication.
- Replaced local Docker volumes for uploads with **Cloudflare R2** object storage.
- Replaced Prisma with **Drizzle ORM** for lightweight, type-safe database interactions.

---

## 📊 Application Stack

```
Framework:    Astro 5 (Server Mode)
Frontend:     React 19 (Islands Architecture)
Language:     TypeScript 5
Database:     PostgreSQL 16 + Drizzle ORM
Auth:         Better-Auth (Drizzle Adapter)
Storage:      Cloudflare R2 (S3-compatible)
Styling:      Tailwind CSS 4
Deployment:   Docker + Docker Compose + Cloudflare Tunnel
CI/CD:        GitHub Actions
```

---

## 🏗️ Architecture

### Data Flow

```
Internet → Cloudflare → Tunnel → Astro App (3000)
                                    ↓
            ┌───────────────────────┴───────────────────────┐
            ↓                                               ↓
      PostgreSQL (DB)                               Cloudflare R2 (Storage)
```

### Storage Architecture (R2)

Previously, images were stored in a local Docker volume (`/app/uploads`). This created issues with horizontal scaling and backup complexity.

**New R2 Flow:**
1. Admin uploads image via Tiptap editor.
2. Server-side action uploads buffer to Cloudflare R2 using `@aws-sdk/client-s3`.
3. R2 returns a public CDN URL.
4. URL is stored in the database.

---

## 🔒 Security

- **Authentication**: Better-Auth handles session management, CSRF protection, and password hashing.
- **Role-Based Access**: Middleware protects `/admin/*` and `/client/*` routes.
- **Tunneling**: Cloudflare Tunnel ensures zero exposed ports on the EC2 instance (except SSH).
- **Environment**: All sensitive keys (R2, Auth, DB) are managed via GitHub Secrets and injected into `web.env` at deploy time.

---

## ✅ Decision Log: Why Astro 5?

1. **Static-First**: Most of the personal site is static. Astro ensures minimal JavaScript is sent to the client.
2. **Islands Architecture**: Complex interactive components like the Tiptap editor only load React when needed.
3. **Content Layer**: Excellent support for fetching and caching content from various sources.
4. **Middleware**: Standardized middleware for auth and routing.

---

**Last Updated:** March 10, 2026  
**Migration Note:** Completed full stack rewrite from Next.js/Prisma to Astro/Drizzle/R2.
