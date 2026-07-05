# ADR-002: Bump Docker Base Image From `node:22-alpine` To `node:26-alpine`

## Status

Accepted (Implemented) (2026-05-19) — gated Dependabot PR #83

> **Implemented** (2026-07-05): Dockerfile is on `node:26-alpine`, `.nvmrc` pins `26.3.0`. Landed alongside the Astro 7 / Vite 8 stack migration (commit 9ef3069).

## Context

The site image (`ghcr.io/stevenfackley/steveackley-web`) currently builds from `node:22-alpine`. Node 22 (Iron) entered maintenance LTS in 2026-04 and reaches EOL in 2027-04. Node 26 became the active release line in 2026-04 and will reach LTS in 2026-10.

Dependabot opened PR #83 to bump the Dockerfile directly from 22 → 26, skipping Node 24. Per the workspace `feedback_dependabot_sweep_policy.md` rule, major bumps require an ADR stub before merge.

PR #83's CI is CLEAN — Astro builds, unit + integration + E2E tests pass against the new image. The bump is empirically compatible with the current dependency tree (Astro 7 + React 19 + Drizzle + Better Auth + R2 SDK + TipTap).

## Decision

Bump the Dockerfile base image to `node:26-alpine`. Skip Node 24 — it never became LTS for this repo's lifecycle.

## Consequences

### Positive

- Aligns the runtime with the current Node release line.
- Picks up native V8 / OpenSSL / undici improvements landed since 22.
- Removes the 2027-04 EOL pressure from `node:22-alpine` ~11 months earlier than a forced bump.

### Negative

- Skipping Node 24 means we never validated this codebase on the intermediate version. Any 23/24-era runtime change reaches us as part of the 26 cliff.
- Alpine + Node 26 is newer than most production deployments; image stability is less battle-tested than `:22-alpine`. Mitigated by: image is rebuilt and deployed via CI on every merge, so a runtime regression surfaces within one deploy cycle.
- Native modules (`sharp`, etc.) in the dependency tree must have prebuilt binaries for Node 26 + Alpine. CI confirms install succeeds; production parity is the same image so no drift.

## Rollback

Single-line revert of the Dockerfile `FROM` directive. Image tagging is per-commit, so rolling back the deploy is `docker compose pull` + `up -d` against the previous tag.

## Related

- Dependabot PR: https://github.com/stevenfackley/steveackley-website/pull/83
- Workspace policy: `feedback_dependabot_sweep_policy.md` (ADR stubs required for majors before merge).
- Audit report: `CI_AUDIT_2026-05-18.md` lists this PR as skipped pending ADR.
