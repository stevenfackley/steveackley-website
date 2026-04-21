# Objective
Fix the failing GitHub Actions CI pipeline by removing leftover references to the deleted `apps/portal` workspace.

# Changes
1. **`.github/workflows/deploy.yml`**: Remove the "Run unit tests (portal)" and "Run integration tests (portal)" steps.
2. **`Dockerfile`**: Remove the line `COPY apps/portal/package.json ./apps/portal/package.json`.
3. **`package.json`**: Remove all scripts ending in `:portal` (`dev:portal`, `build:portal`, `test:portal`, `lint:portal`, `typecheck:portal`). Update the main `build`, `test`, `lint`, and `typecheck` scripts to only run for `site`.
4. **`package-lock.json`**: Run `npm install --no-audit --no-fund --legacy-peer-deps` to remove `apps/portal` from the lockfile and reflect the workspace change.

# Verification
1. Run `npm run test` locally to ensure no workspace resolution errors occur.
2. Optionally verify the Docker build locally to ensure it doesn't fail on the missing package.json file.
3. Create a commit, push, and use `gh run list` and `gh pr checks` to verify the GitHub Actions pipeline passes successfully.