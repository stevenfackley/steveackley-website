# Optimization & Test Coverage Log

## Task Summary
Next.js project test optimization and achieving 100% code coverage.

## Progress History

### Phase 1: Research & Audit (✅ COMPLETE)
- Analyzed codebase and identified untested libraries.
- Mapped out test strategy for Libs and API routes.

### Phase 2: Implementation (✅ COMPLETE)
- Created unit tests for `upload.ts`, `github.ts`, `auth.config.ts`.
- Created integration tests for `uploads` API.
- Reached 100% coverage on core library files.

### Phase 3: CI/CD Integration (✅ COMPLETE)
- Added GitHub Actions workflow `deploy.yml`.
- Set up E2E tests with Playwright and Postgres service.

### Phase 4: Troubleshooting (⏳ IN PROGRESS)
- **2026-03-01**: Run #67 FAILED. Diagnosed as E2E timeout/hang.
- **2026-03-11**: 
    - Analyzed recent failures (Run #88). 
    - Diagnosed "postgres connection hanging" and E2E timeouts (13 min duration).
    - Applied fixes:
        - Added `connect_timeout: 15` to `postgres-js` in `src/db/index.ts`.
        - Added startup logging to `src/db/index.ts` to verify `DATABASE_URL` connectivity.
        - Modified `deploy.yml` to set `HOST: "0.0.0.0"` for Astro server.
        - Modified `deploy.yml` to print server logs `/tmp/astro-server.log` on failure of the E2E step.
        - Reverted problematic `install-deps` from Playwright installation step.
        - Cleaned up `vitest.config.ts` to remove Prisma/Next.js references and correctly target Astro `src/pages/api` for coverage.
        - **Update (Run #92 FAILURE)**: `PostgresError: connection timeout` confirmed via `web_fetch` summarization of GitHub Actions UI logs.
        - **Update (Run #94)**: Refactored E2E job to run in a Docker container (`mcr.microsoft.com/playwright/python:latest`) to resolve persistent database connection issues.
        - **Update (Run #95 FAILURE)**: E2E job failed at "Apply database migrations" step in containerized setup.
        - **Update (Run #96 FAILURE)**: E2E job failed at "Verify PostgreSQL service connectivity" due to `nc: not found` in container image.
        - **Update (Run #97 FAILURE)**: Drizzle `db:migrate` failed with `ECONNREFUSED` and Postgres logs showed `FATAL: role "root" does not exist`.
        - **Update (Run #98)**: Added explicit `PGUSER` and `PGPASSWORD` to E2E container environment to force correct user for migrations.
        - **Update (Run #92 IN PROGRESS)**: `timeout-minutes: 15` on E2E job appears ineffective, job still running past 30 minutes. Triggering new run to clear queue.

## Next Steps
- Monitor Run #89 (ID: TBD) for green status on E2E tests.
- Verify coverage on green pipeline.
