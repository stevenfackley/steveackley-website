#!/bin/sh
set -e

# =============================================================================
# Docker Entrypoint — pushes DB schema, seeds admin, starts app
#
# Secrets (DATABASE_URL, BETTER_AUTH_SECRET, ADMIN_PASSWORD_HASH) are injected as
# environment variables by docker-compose via env_file (.env).
# =============================================================================

echo "==> Entrypoint starting..."

# Debug: show which env vars are set (values hidden)
for var in DATABASE_URL BETTER_AUTH_SECRET ADMIN_PASSWORD_HASH ADMIN_EMAIL NODE_ENV BETTER_AUTH_URL; do
  if [ -n "$(eval echo \$$var)" ]; then
    echo "  ✓ $var is set"
  else
    # Fallback check for legacy names
    if [ "$var" = "BETTER_AUTH_SECRET" ] && [ -n "$AUTH_SECRET" ]; then
       echo "  ✓ BETTER_AUTH_SECRET is set (via AUTH_SECRET)"
    elif [ "$var" = "BETTER_AUTH_URL" ] && [ -n "$AUTH_URL" ]; then
       echo "  ✓ BETTER_AUTH_URL is set (via AUTH_URL)"
    else
       echo "  ✗ $var is NOT set"
    fi
  fi
done

# Push database schema (creates tables if they don't exist)
if [ -n "$DATABASE_URL" ]; then
  # Print sanitized URL for debugging (hide password)
  echo "  DATABASE_URL host: $(echo "$DATABASE_URL" | sed 's|://[^@]*@|://***@|')"
  echo "==> Migrating database schema (Drizzle)..."
  # Use drizzle-kit to migrate schema directly from the container
  # We assume drizzle-kit is in the node_modules
  npx drizzle-kit migrate || echo "⚠ Drizzle db migrate failed"
else
  echo "⚠ DATABASE_URL not set, skipping schema push"
fi

# Seed admin user if credentials are provided
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD_HASH" ]; then
  echo "==> Seeding admin user..."
  node /app/docker/seed-admin.cjs || echo "⚠ Admin seed failed (non-fatal)"
fi

echo "==> Starting application..."
exec "$@"
