# Decisions

ADR log. One entry per architectural decision. Append-only; supersede with a new entry.

## Format

```
## {{DATE}} — {{title}}
**Status:** proposed | accepted | superseded by #N
**Context:** why we had to decide
**Decision:** what we chose
**Consequences:** what follows (pros, cons, risks)
```

---

## 2026-04-17 — Add root `overrides` for dependabot-flagged transitive deps (hono, dompurify, yaml, esbuild)

**Status:** accepted
**Context:** Four open medium-severity Dependabot alerts — all transitive in `package-lock.json`:
- hono <4.12.14 (GHSA-458j-xx4x-4375, JSX attr-name HTML injection) — via `@modelcontextprotocol/sdk`
- dompurify <=3.3.3 (GHSA-39q2-94rc-95cp, FORBID_TAGS bypass) — via `isomorphic-dompurify`
- yaml >=2.0.0 <2.8.3 (CVE-2026-33532, stack overflow) — nested under `yaml-language-server`
- esbuild <=0.24.2 (GHSA-67mh-4wv8-2f99, dev-server CORS) — nested under `@esbuild-kit/core-utils` (pulled in by drizzle-kit)

No direct-dep bumps available for the transitives. Root `yaml` was already 2.8.3 and root `esbuild` was 0.27.x (both safe); only nested copies were vulnerable.

**Decision:** Add `overrides` to root `package.json`:
- `hono: ^4.12.14`
- `dompurify: ^3.4.0`
- `yaml: ^2.8.3`
- `esbuild: ^0.25.0`

Regenerate `package-lock.json` so Dependabot sees the patched versions.

**Consequences:**
- Dependabot alerts clear on next scan (lockfile-driven).
- CI (`deploy.yml`) installs with `npm install --no-package-lock`, which re-resolves fresh and does NOT honor root overrides for nested deps. Committed lockfile is the source of truth for SCA; CI correctness is unaffected because the direct deps weren't vulnerable.
- `esbuild: ^0.25.0` is narrower than what `vite`/`astro` transitively want (`^0.27.0`). No CI breakage observed because CI bypasses the override. If we ever switch CI to `npm ci`, relax the esbuild override to `>=0.25.0` to allow 0.27+.
- **No major bumps.** All fixes are patch/minor within their current major (hono 4.x, dompurify 3.x, yaml 2.x, esbuild 0.x — no breaking API changes in the bumped ranges).
- Override entries should be revisited and removed whenever the parent packages (`@modelcontextprotocol/sdk`, `isomorphic-dompurify`, `yaml-language-server`, `@esbuild-kit/core-utils`) bump their pins above the vulnerable ranges.


---

## 2026-04-28 — Dependabot sweep: lucide-react 0→1, plus minors

**Status:** accepted (awareness-only stub per saved sweep policy)
**Context:** 10 open Dependabot PRs swept. Minors/patches: aws-sdk/client-s3 patch, better-auth 1.6.5→1.6.9, isomorphic-dompurify 3.9→3.10, msw 2.13.4→2.13.6, tailwindcss 4.2.2→4.2.4 (+ postcss adapter), typescript-eslint lint group, testing group (3 updates), astro group (4 updates). One major warranted an ADR note.
**Decision:** Auto-merge per policy.
**Consequences — major to watch:**
- **lucide-react 0.575.0 → 1.11.0** (PR #63):
  - Pre-1.0, the package was treating each minor like an API-stable point release; v1.0 was the rename of "this is the package" with no big breaking surface in icon names.
  - **Tree-shaking:** v1 dropped legacy CommonJS entry points; ES-module-only. Astro/Vite stack is fine.
  - **Icon API:** prop names and default sizes unchanged for the icons we use. If we ever pinned an exotic icon by an old name, double-check.
  - **Stroke width default:** unchanged at 2; visual diff should be zero.
  - Risk: low.
**Why no review:** private/solo repo, deploy workflow is the real build, revert is cheap.
