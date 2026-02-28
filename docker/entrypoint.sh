#!/bin/sh
set -e

# =============================================================================
# Docker Entrypoint — reads Docker secrets into env vars, seeds admin, starts app
# =============================================================================

# Load Docker secrets into environment variables
# Secret files at /run/secrets/<name> → env var NAME (uppercased)
if [ -d /run/secrets ]; then
  for secret_file in /run/secrets/*; do
    if [ -f "$secret_file" ]; then
      secret_name=$(basename "$secret_file" | tr '[:lower:]' '[:upper:]')
      export "$secret_name"="$(cat "$secret_file")"
      echo "  ✓ Loaded secret: $secret_name"
    fi
  done
fi

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
