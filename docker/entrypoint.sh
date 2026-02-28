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

# Seed admin user if credentials are provided
if [ -n "$ADMIN_EMAIL" ] && [ -n "$ADMIN_PASSWORD_HASH" ]; then
  echo "==> Seeding admin user..."
  node /app/docker/seed-admin.js || echo "⚠ Admin seed failed (non-fatal)"
fi

echo "==> Starting application..."
exec "$@"
