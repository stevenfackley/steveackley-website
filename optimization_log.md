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
        - **Update (Run #89 FAILURE)**: Discovered `PostgresError: connection timeout` in server logs during E2E.
        - **Update (Run #92)**: Added detailed Docker container logs for all services to debug potential database crashes.
        - **Update (Run #92)**: Added job-level timeout (15 min) to prevent hangs.

## Next Steps
- Monitor Run #89 (ID: TBD) for green status on E2E tests.
- Verify coverage on green pipeline.
