# =============================================================================
# steveackley.org — Production Dockerfile for Astro 6
# =============================================================================

# Stage 1: Builder
# Install with full source tree present so npm workspace hoisting is correct.
# Base image pinned by digest for reproducible builds; bump deliberately.
FROM node:26-alpine@sha256:3ad34ca6292aec4a91d8ddeb9229e29d9c2f689efd0dd242860889ac71842eba AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY . .
# Use npm ci (lockfile-strict) so the Docker build matches local builds and
# CI test runs exactly. --no-package-lock previously allowed dep drift that
# silently switched the JSX transform from automatic to classic in prod.
RUN npm ci --no-audit --no-fund
# npm nests version-skewed deps under each workspace's own node_modules
# (e.g. better-auth 1.6.14 put @better-auth/* under apps/site and
# packages/shared, not root). Guarantee the dirs exist so the runner-stage
# COPYs below never fail when a future lockfile hoists everything to root.
RUN mkdir -p apps/site/node_modules packages/shared/node_modules
ENV NODE_ENV=production
RUN npm run build:site

# Stage 2: Runner
FROM node:26-alpine@sha256:3ad34ca6292aec4a91d8ddeb9229e29d9c2f689efd0dd242860889ac71842eba AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 astrojs

# Copy build output
COPY --from=builder /app/apps/site/dist ./dist
COPY --from=builder /app/apps/site/package.json ./package.json

# The server bundle externalizes some packages (better-auth, @better-auth/*)
# and resolves them from /app/node_modules at runtime. npm workspaces nest
# version-skewed deps under apps/site/node_modules and
# packages/shared/node_modules, so overlay all three into one tree.
# Order matters: site last, so its resolutions win — the same precedence
# Node used when the bundle was built from apps/site.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/node_modules ./node_modules
COPY --from=builder /app/apps/site/node_modules ./node_modules

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

# busybox wget ships in node:alpine; hit the unauthenticated health endpoint.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["node", "./dist/server/entry.mjs"]
