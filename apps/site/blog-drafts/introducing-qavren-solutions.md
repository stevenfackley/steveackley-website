<!--
Admin form fields:
  Title:    Qavren Solutions LLC: the company, the roster, and the bench underneath it
  Slug:     introducing-qavren-solutions (auto-derived)
  Excerpt:  On May 28 I filed a Connecticut LLC, contributed the product IP I had been building for years, and put qavrensolutions.com in front of it. Here is what Qavren is, what is live, and the four platform pieces every product now runs on.
  Category: Release
  Tags:     qavren, company, release
  Cover:    (none)
  Body:     everything below this comment
-->

On May 28, 2026 I filed a Certificate of Organization with the Connecticut Secretary of the State. The same day, the first production image of [qavrensolutions.com](https://qavrensolutions.com) went out from a self-hosted runner on the EC2 box that serves it. Qavren Solutions LLC has been a real company for three months. This is the announcement I should have written in May.

## What it is

Qavren Solutions LLC is a Connecticut software company. It designs, builds, and operates software products in intelligent information retrieval, retrieval-augmented generation, content automation, agentic research, and native-AOT signal infrastructure. The one-line version on the site reads: systems that remember, search deep, and outsmart problems that look too big.

Two Managing Members run it. I am Founder and Head of Software: product, engineering, the IP, and the paperwork that comes with being registered agent and Partnership Representative. Mike Riccio runs revenue: customers, partnerships, and turning engineering output into something a buyer can evaluate. We share equally in the company.

The products did not start on May 28. I contributed the pre-existing portfolio, repositories, domains, and marks to the LLC under IRC § 721 at formation. What changed is that they now live under one entity, one brand, and one set of shared infrastructure.

## The roster

The site lists twenty-nine entries, in four tiers.

**Three flagships.** [SquareLog](https://squarelog.app) is legal-evidence RAG for people representing themselves in family court: a daily SitRep app, a retrieval layer over Connecticut Title 46b, and court-ready exports. Undertow Engine takes long-form video in and publishes short-form clips out, on a schedule, without a human in the loop. OmniSift is an AI research agent for the family story you keep meaning to write down.

**Sixteen products.** [StackAlchemist](https://stackalchemist.app) turns a plain-English brief into a compilable .NET, Next.js, and Postgres SaaS repo with a repair loop that guarantees it builds. [Synap](https://getsynap.app) delivers two-minute professional lessons with AI evaluation. [Roast and Resolve](https://roastandresolve.com) roasts your resume or website for free and sells the fix. [Throughline](https://career.qavrensolutions.com) counts the credentials employers ask for in real job postings. [TrailTold](https://trailtold.com) plays GPS-triggered narration on trails. [HaulCall](https://haulcall.app) is the backstage crew for Whatnot sellers, from live capture to verified packing. [ReCharacter](https://recharacter.us) helps veterans build a discharge-upgrade petition. The rest, including RemitHQ, Gavel Suite, Myelix, Syzm, EchoFind, Talebound, Reclaim, Axon, and Kyne, sit at various points between design spec and store submission.

**Six experiments.** Kairis, ClusterOrbit, GhostCrab, PodLinkFixer, Conduit, and Sokode. These are the ideas I want to keep testing without pretending they have a go-to-market yet.

**Four platform pieces.** These are the bench, and they are the reason I can maintain the list above without a team of twenty.

Eight of the twenty-nine resolve to a public host today. The site only renders a link when the host answers, so if a product page has no "visit" button, the product is not live. I would rather show a gap than a dead link.

## The bench

Every new product needs sign-in, a database, a way to ship, and a way to get engineering work done in parallel. Solving each of those per product was the thing eating my weekends, so the LLC's first internal investment was four shared pieces.

**Qavren Auth.** Self-hosted Keycloak 26 with one realm per app, provisioned as code. A new app gets an isolated user pool and a PKCE client in about a minute. Three thin SDKs (Next.js, ASP.NET Core, FastAPI) validate tokens against the realm's JWKS endpoint and fail closed. They are published on npm, PyPI, and NuGet, and I wrote a separate post about the [0.1 release](/blog/qavren-auth-sdks-0-1).

**Qavren DB.** One hosted Postgres project for every app. Each app gets a schema and a login role that owns that schema and holds zero grants anywhere else. Postgres privileges are the wall between products. No Supabase Auth, no exposed schemas, no anon keys. Backups run in two layers: the provider's daily snapshot plus a nightly per-schema `pg_dump` to R2.

**Qavren Nexus.** A .NET 10 release console that tracks each app's lifecycle stage per platform (iOS, Android, web), owns the build-number history, and deploys by dispatching a GitHub Actions workflow in the app's own repo. Status comes back through HMAC-signed webhook callbacks. Production environments are promotion-only: you promote a build that already succeeded, you do not build a new one. Nexus runs in production now, colocated with the auth box, behind a Cloudflare tunnel.

**Qavren Swarm.** An open-source MCP server that runs coding agents inside hardened Docker containers against a read-only copy of a repo. The agent hands back a `git diff`; nothing touches the real working tree until I call `apply_diff`. That one has its own post too: [Qavren Swarm](/blog/qavren-swarm-open-source).

## The site itself

qavrensolutions.com is Next.js 15 with the App Router, built as a standalone server and shipped as a `node:22-alpine` image to GHCR. One workflow with three gated jobs: lint, typecheck, and build on every push; an image build tagged `prod-<sha>` on main; and a deploy job that runs on the production host itself, pulls the image, swaps the container, and smoke-tests `/`. There are no SSH secrets in the repo because the runner is already on the box. Cloudflare proxies the front door.

Product copy lives in one MDX file per product. The roster (slug, name, tier, tagline, category, public URL) is a single TypeScript array that drives the products grid, the home page stats, and per-product routing. Adding a product is one array entry and one MDX file.

There is also a bird. His name is Qav, he shows up in READMEs as `>o)`, and he has a voice guide that forbids exclamation points. I will leave it at that.

## What comes next

The next three months are about moving products from "repo with a spec" to "app in a store." SquareLog is in closed beta on Android and internal testing on iOS. HaulCall has a Chrome extension and a scan-to-pack mobile app, each with its own auth client. Talebound and TrailTold are on the same path.

If you want to talk about any of it, the [contact page](https://qavrensolutions.com/contact) has a calendar link for a technical call with me and a sales call with Mike. Pick whichever one you would rather have.
