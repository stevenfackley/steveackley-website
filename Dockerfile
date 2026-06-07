# =============================================================================
# steveackley.org — Production Dockerfile for Astro 6
# =============================================================================

# Stage 1: Builder
# Install with full source tree present so npm workspace hoisting is correct.
# Base image pinned by digest for reproducible builds; bump deliberately.
FROM node:26-alpine@sha256:144769ec3f32e8ee36b3cfde91e82bee25d9367b20f31a151f3f7eea3a2a8541 AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY . .
# Use npm ci (lockfile-strict) so the Docker build matches local builds and
# CI test runs exactly. --no-package-lock previously allowed dep drift that
# silently switched the JSX transform from automatic to classic in prod.
RUN npm ci --no-audit --no-fund
ENV NODE_ENV=production
RUN npm run build:site

# Stage 2: Runner
FROM node:26-alpine@sha256:144769ec3f32e8ee36b3cfde91e82bee25d9367b20f31a151f3f7eea3a2a8541 AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 astrojs

# Copy build output
COPY --from=builder /app/apps/site/dist ./dist
COPY --from=builder /app/apps/site/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Copy Drizzle config and database files for runtime setup
COPY --from=builder /app/apps/site/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/apps/site/src/db ./src/db
COPY --from=builder /app/apps/site/drizzle ./drizzle
COPY --from=builder /app/apps/site/scripts ./scripts

# Copy entrypoint and seed scripts
COPY --chown=astrojs:nodejs docker/entrypoint.sh /app/docker/entrypoint.sh
COPY --chown=astrojs:nodejs docker/seed-admin.cjs /app/docker/seed-admin.cjs
RUN chmod +x /app/docker/entrypoint.sh

USER astrojs

EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0

# busybox wget ships in node:alpine; hit the unauthenticated health endpoint.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["node", "./dist/server/entry.mjs"]
