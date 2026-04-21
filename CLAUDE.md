# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Run from repo root unless noted.

```bash
# Dev
npm run dev:site              # Start site at localhost:3000

# Build & check
npm run build:site
npm run typecheck:site        # astro check
npm run lint:site             # ESLint

# Tests (root)
npm run test:site             # All vitest tests

# Tests (from apps/site)
npm run test:unit             # Unit tests only
npm run test:integration      # Integration tests only
npm run test:e2e              # Playwright E2E (Chromium)
npm run test:e2e:ui           # Playwright with interactive UI

# Database (from apps/site)
npm run db:generate           # Generate Drizzle migrations
npm run db:push               # Push schema directly to DB
npm run db:migrate            # Run pending migrations
npm run db:studio             # Drizzle Studio GUI

# Local DB
docker compose -f docker-compose.dev.yml up -d db
```

## Architecture

Monorepo (npm workspaces):
- `apps/site` — Astro 6 SSR app: public site, blog, resume, admin portal, client portal
- `packages/shared` — Drizzle ORM schema, Better Auth config, shared types/utilities

**Stack:** Astro 6 + React 19 islands · PostgreSQL 16 · Drizzle ORM · Better Auth · Cloudflare R2 · TailwindCSS 4 · TipTap rich text editor

**Path aliases** (configured in `astro.config.mjs` and `tsconfig.json`):
- `@/` → `apps/site/src/`
- `@shared/` → `packages/shared/src/`

## Key Directories (`apps/site/src/`)

| Dir | Purpose |
|-----|---------|
| `pages/` | File-based Astro routing. Portals: `admin/*`, `client/*`. API: `api/*` |
| `components/` | React islands: `bento/` (dashboard), `admin/`, `blog/`, `ui/` (primitives) |
| `content/` | Astro collections: `blog/`, `pages/`, `projects/`, `resume/` |
| `actions/` | Astro server actions — Zod-validated, all admin-protected |
| `db/` | Drizzle schema (`schema.ts`) + DB instance (`index.ts`) |
| `lib/` | Core utils: auth, github, settings, upload, dashboard, logger |
| `layouts/` | `BaseLayout`, `PublicLayout`, `AdminLayout`, `ClientLayout` |
| `__tests__/` | `unit/` (jsdom for components) and `integration/` |

## Auth

Better Auth with DB-persisted sessions. Role-based: `admin` and `client`.

- Catch-all handler: `pages/api/auth/[...all].ts`
- Client helpers: `src/lib/auth-client.ts`
- Server re-export: `src/lib/auth.ts` (from `@shared/lib/auth`)

Admin actions/routes check for `admin` role before executing.

## Content

Two modes coexist:
- **DB-backed**: Blog posts stored in PostgreSQL, queried via Drizzle
- **File-authored**: Pages, projects, resume — Astro content collections in `src/content/`

## Environment Variables

```
DATABASE_URL
BETTER_AUTH_SECRET
BETTER_AUTH_URL
GH_API_TOKEN
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_PUBLIC_URL
ADMIN_EMAIL
ADMIN_PASSWORD_HASH
```

No `.env` file is committed. Use `.env.local` for local dev.

## Deployment

Docker image → GitHub Container Registry (`ghcr.io/stevenfackley/steveackley-web`) → EC2 via `docker compose`.

CI pipeline (`.github/workflows/deploy.yml`): unit tests → integration tests → E2E tests (with live Postgres + built Astro) → build & push image → SSH deploy.
