# =============================================================================
# steveackley.org — Production Dockerfile for Astro 5
# =============================================================================

# Stage 1: Builder
# Install with full source tree present so npm workspace hoisting is correct.
FROM node:26-alpine AS builder
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
FROM node:26-alpine AS runner
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
COPY --chown=astrojs:nodejs docker/password.cjs /app/docker/password.cjs
RUN chmod +x /app/docker/entrypoint.sh

USER astrojs

EXPOSE 3000
ENV PORT=3000
ENV HOST=0.0.0.0

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["node", "./dist/server/entry.mjs"]
