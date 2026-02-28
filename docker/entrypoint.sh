#!/bin/sh
set -e

# =============================================================================
# Docker Entrypoint — pushes DB schema, seeds admin, starts app
#
# Secrets (DATABASE_URL, AUTH_SECRET, ADMIN_PASSWORD_HASH) are injected as
# environment variables by docker-compose via env_file (.env).
# =============================================================================

echo "==> Entrypoint starting..."

# Debug: show which env vars are set (values hidden)
for var in DATABASE_URL AUTH_SECRET ADMIN_PASSWORD_HASH ADMIN_EMAIL NODE_ENV AUTH_URL; do
  if [ -n "$(eval echo \$$var)" ]; then
    echo "  ✓ $var is set"
  else
    echo "  ✗ $var is NOT set"
  fi
done

# Push database schema (creates tables if they don't exist)
if [ -n "$DATABASE_URL" ]; then
  # Print sanitized URL for debugging (hide password)
  echo "  DATABASE_URL host: $(echo "$DATABASE_URL" | sed 's|://[^@]*@|://***@|')"
  echo "==> Pushing database schema..."
  node /app/node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss 2>&1 || echo "⚠ Prisma db push failed"
else
  echo "⚠ DATABASE_URL not set, skipping schema push"
fi

# Seed admin user if credentials are provided
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD_HASH" ]; then
  echo "==> Seeding admin user..."
  node /app/docker/seed-admin.js || echo "⚠ Admin seed failed (non-fatal)"
fi

echo "==> Starting application..."
exec "$@"
