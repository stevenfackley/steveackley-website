# steveackley.org Monorepo

`steveackley.org` is a single Astro app (`apps/site`) that serves the public site and the authenticated admin/client portal. A split into a separate Next.js portal was planned but never executed; see [ADR-001](./docs/ADR-001-astro-site-next-portal.md).

## Canonical Stack Diagram

```mermaid
flowchart LR
    U["Browser Users"] --> S["apps/site<br/>Astro 7 + MDX + content collections"]
    S --> C["File-authored content<br/>src/content/*"]
    S --> D["Shared Postgres / Drizzle schema"]
    S --> R["Cloudflare R2 media storage"]
    S --> P["Shared auth / uploads / settings<br/>packages/shared"]
    S --> O["Admin-authored content<br/>blog posts, settings, media"]
    O --> D
    D --> S
```

## Repo Layout

| Path | Responsibility |
|---|---|
| `apps/site` | Public website, resume, blog rendering, project pages, admin/client portal |
| `packages/shared` | Shared DB schema, Better Auth config, settings helpers, uploads, common types |
| `docs` | Architecture, data flow, security, route ownership, content model, ADRs |

## Stack

| Area | Technology |
|---|---|
| Site / Portal | Astro 7, React islands, MDX, Astro content collections |
| Shared backend | PostgreSQL 16, Drizzle ORM, Better Auth |
| Storage | Cloudflare R2 |
| Styling | CSS/Tailwind-compatible tokens and app-local styling |
| Language | TypeScript |

## Local Development

### Bootstrap

```bash
npm install
docker compose -f docker-compose.dev.yml up -d db
```

### Run app

```bash
npm run dev:site
```

Default local URL:

- Site: [http://localhost:3000](http://localhost:3000)

### Workspace scripts

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

Per-app:

```bash
npm run typecheck:site
npm run build:site
```

Targeted reproducibility checks:

```bash
npm run test:site:health
```


That path runs the public site health-route contract test only, which is useful
when validating deployment health behavior without pulling the broader site or
portal test surface into the loop.

## Environment Model

Environment values live at the repo root (see the committed [.env.example](./.env.example)); `apps/site` is the only app that reads them.

| Variable | Used By | Purpose |
|---|---|---|
| `DATABASE_URL` | `apps/site`, `packages/shared` | Shared PostgreSQL connection |
| `BETTER_AUTH_SECRET` | `apps/site`, shared auth handler | Session/auth secret |
| `BETTER_AUTH_URL` | `apps/site`, shared auth handler | Better Auth base URL |
| `R2_*` | `apps/site`, shared upload helpers | Cloudflare R2 media storage |
| `GH_API_TOKEN` | `apps/site` | Public GitHub repo enrichment on homepage |

## Content Ownership

| Content Type | Source of Truth | Managed In |
|---|---|---|
| Resume timeline and skill data | Astro content collection | `apps/site/src/content/resume/*` |
| Homepage copy and public narrative content | Astro content collection | `apps/site/src/content/pages/*` |
| Public project writeups | Astro content collection / MDX | `apps/site/src/content/projects/*` |
| Blog posts | Database-backed authored content | `apps/site` admin workflows + shared DB |
| Site settings | Database-backed authored content | `apps/site` admin workflows + shared DB |

## Route Ownership

| Surface | Owner |
|---|---|
| `/`, `/blog/*`, `/resume`, public project pages | `apps/site` |
| `/admin/*` | `apps/site` |
| `/client/*` | `apps/site` |

The Astro site handles all routes, including authenticated admin/client portal surfaces.


## Documentation

| Doc | Focus |
|---|---|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Top-level architecture overview |
| [docs/STACK_ARCHITECTURE.md](./docs/STACK_ARCHITECTURE.md) | Stack breakdown by app/package |
| [docs/CONTENT_ARCHITECTURE.md](./docs/CONTENT_ARCHITECTURE.md) | Collections, MDX, and authored content boundaries |
| [docs/DATA_FLOW.md](./docs/DATA_FLOW.md) | Public render, portal authoring, auth, and upload flows |
| [docs/DEPLOYMENT_ARCHITECTURE.md](./docs/DEPLOYMENT_ARCHITECTURE.md) | Deployment, domains, and environment partitioning |
| [docs/SECURITY.md](./docs/SECURITY.md) | Security model across site, portal, shared services |
| [docs/ADR-001-astro-site-next-portal.md](./docs/ADR-001-astro-site-next-portal.md) | Decision log for the planned (never executed) site/portal split |
| [docs/ROUTES.md](./docs/ROUTES.md) | Route ownership and migration map |
| [docs/DATABASE.md](./docs/DATABASE.md) | Shared schema and persistence boundaries |
| [docs/ARCHITECTURE_ANALYSIS.md](./docs/ARCHITECTURE_ANALYSIS.md) | Superseded stub; kept for history |

## Status

- Astro app lives in `apps/site` and serves every route, including `/admin/*` and `/client/*`
- shared auth/DB/settings/uploads live in `packages/shared`
- public resume and homepage copy live in Astro collections
- the separate Next.js portal (`apps/portal`) was never built; the split is frozen per [ADR-001](./docs/ADR-001-astro-site-next-portal.md)

Production is the single-container Astro deployment on EC2 (see [docs/DEPLOYMENT_ARCHITECTURE.md](./docs/DEPLOYMENT_ARCHITECTURE.md)).
