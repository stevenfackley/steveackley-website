# Contributing to steveackley.org

Personal website project — contributions are primarily from the owner. This document records conventions and workflow for working on the codebase.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style & Conventions](#code-style--conventions)
- [Commit Message Format](#commit-message-format)
- [Branch Naming](#branch-naming)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [Database Migrations](#database-migrations)
- [Adding Blog Posts (Admin)](#adding-blog-posts-admin)

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 26.x | JavaScript runtime (matches Dockerfile's `node:26-alpine`) |
| npm | 10.x+ | Package manager / npm workspaces |
| Docker | 24.x+ | Local Postgres (and prod image builds) |
| Docker Compose | v2.x | Multi-container orchestration |
| Git | 2.x+ | Version control |

```bash
node --version
npm --version
docker --version
docker compose version
git --version
```

---

## Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/stevenfackley/steveackleyorg.git
cd steveackleyorg
```

### 2. Install dependencies (npm workspaces, from repo root)

```bash
npm install
```

### 3. Configure environment variables

Create `apps/site/.env.local` (no `.env.example` is committed — see [Environment Variables](#environment-variables) for the required list). This repo is a Postgres/Drizzle/Better Auth stack, not Next.js/Prisma/NextAuth.

### 4. Start the database

```bash
docker compose -f docker-compose.dev.yml up -d db
```

### 5. Push the schema

```bash
cd apps/site
npm run db:push
```

### 6. Start the dev server (from repo root)

```bash
npm run dev:site
```

The site runs at [http://localhost:3000](http://localhost:3000). Admin portal: `/admin`.

---

## Project Structure

npm workspaces monorepo:

```
apps/site/                  # Astro 7 SSR app
├── src/
│   ├── pages/               # File-based Astro routing (admin/*, client/*, api/*)
│   ├── components/          # React 19 islands: bento/, admin/, blog/, ui/
│   ├── content/              # Astro content collections: blog/, pages/, projects/, resume/
│   ├── actions/               # Astro server actions (Zod-validated)
│   ├── db/                     # Drizzle schema + DB instance
│   ├── lib/                     # auth, github, settings, upload, dashboard, logger
│   ├── layouts/                   # BaseLayout, PublicLayout, AdminLayout, ClientLayout
│   └── __tests__/                  # unit/ (jsdom) and integration/
packages/shared/             # Drizzle ORM schema, Better Auth config, shared types
```

See the root `CLAUDE.md` for the full directory reference.

---

## Development Workflow

```
1. Create a feature branch from main
2. Write code
3. Test locally (npm run dev:site + docker compose db)
4. Run lint + typecheck
5. Commit with a Conventional Commits message
6. Push and open a PR — squash-merge via PR
```

### Available scripts

Run from repo root:

| Command | Description |
|---|---|
| `npm run dev:site` | Start Astro dev server with hot reload |
| `npm run build:site` | Build for production |
| `npm run typecheck:site` | `astro check` |
| `npm run lint:site` | ESLint |
| `npm run test:site` | All vitest tests (unit + integration) |

Run from `apps/site`:

| Command | Description |
|---|---|
| `npm run test:unit` | Unit tests only (jsdom) |
| `npm run test:integration` | Integration tests only |
| `npm run test:e2e` | Playwright E2E (Chromium) |
| `npm run test:e2e:ui` | Playwright with interactive UI |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:push` | Push schema directly to DB (dev) |
| `npm run db:migrate` | Run pending Drizzle migrations |
| `npm run db:studio` | Drizzle Studio GUI |

---

## Code Style & Conventions

### TypeScript

- Strict mode enabled — no `any` without justification
- Prefer explicit types on function parameters and return types
- `interface` for object shapes, `type` for unions/aliases
- `const` by default, `let` when reassigned, never `var`

### Astro / React

- Astro pages/layouts by default; React islands (`.tsx`) only where interactivity is needed, hydrated with an explicit `client:*` directive
- Keep components small and single-responsibility
- Use Astro's built-in `<Image />`/asset handling for images where applicable

### File Naming

| Type | Convention | Example |
|---|---|---|
| React components | PascalCase | `HeroCard.tsx` |
| Utility files | camelCase | `utils.ts` |
| Astro pages/routes | lowercase (file-based routing) | `index.astro`, `[slug].astro` |
| Test files | `*.test.ts` / `*.test.tsx` | `utils.test.ts` |

### CSS / Tailwind

- Tailwind 4 utility classes directly in markup
- Apply `dark:` variants for every color-related class
- Extract repeated class combinations into a local `cn()` helper for complex components

---

## Commit Message Format

[Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

| Type | Use For |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting/whitespace, no logic change |
| `refactor` | Code restructuring, no feature/fix |
| `chore` | Build process, dependency updates |
| `perf` | Performance improvements |
| `security` | Security fixes |

```
feat(blog): add pagination to blog listing page
fix(upload): handle MIME type validation for .webp files
docs: update README with deployment instructions
chore(deps): bump astro to 7.0.4
security: rotate BETTER_AUTH_SECRET, add rate limiting notes
```

**No AI/Claude/Co-Authored-By attribution trailers in commit messages.**

---

## Branch Naming

```
feat/<description>
fix/<description>
docs/<description>
chore/<description>
```

**Never commit directly to `main`.** Always work on a feature branch, push it, and open a PR. Merge via squash-merge on the PR.

---

## Testing

Run from repo root: `npm run test:site` (all vitest tests). From `apps/site`: `npm run test:unit`, `npm run test:integration`, `npm run test:e2e` / `npm run test:e2e:ui` (Playwright, Chromium).

CI (`.github/workflows/deploy.yml`) runs unit → integration → E2E (against a live Postgres + built Astro app) before building and deploying the image — a red E2E run blocks build & deploy.

### Manual smoke checklist (public + admin)

- Home renders correctly on mobile (375px), tablet (768px), desktop (1280px); dark/light mode both correct
- Blog listing loads and paginates; individual post renders with correct typography
- Admin login accepts correct credentials, rejects incorrect ones
- Post create/edit/delete/publish works; image upload inserts into the TipTap editor
- `docker compose up` starts successfully; app reachable at `http://localhost:3000`; Postgres data persists across restart

---

## Environment Variables

No `.env.example` is committed. Create `apps/site/.env.local` with:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Better Auth signing secret |
| `BETTER_AUTH_URL` | App base URL used for auth redirects |
| `GH_API_TOKEN` | GitHub API token for repo enrichment (`lib/github.ts`) |
| `R2_ACCOUNT_ID` | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 access key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret key |
| `R2_BUCKET` | Cloudflare R2 bucket name |
| `R2_PUBLIC_URL` | Cloudflare R2 public URL |
| `ADMIN_EMAIL` | Seed admin login email |
| `ADMIN_PASSWORD_HASH` | Seed admin password hash |

**Never commit `.env.local`.**

---

## Database Migrations

Drizzle ORM (no Prisma in this project).

```bash
cd apps/site

npm run db:generate        # generate a migration from schema changes
npm run db:push            # push schema directly to DB (dev convenience)
npm run db:migrate         # apply pending migrations
npm run db:studio          # open Drizzle Studio (DB GUI)
```

---

## Adding Blog Posts (Admin)

1. Navigate to `http://localhost:3000/admin/login`
2. Log in with your admin credentials
3. Click **New Post**
4. Write content in the TipTap editor (toolbar for formatting; image icon uploads to R2, max 5MB, JPEG/PNG/WebP/GIF)
5. Add a title, optional excerpt, optional cover image
6. Save as **Draft** or toggle **Published**

---

## Getting Help

Personal project — open an issue on GitHub or reach out via the contact info on the site.
