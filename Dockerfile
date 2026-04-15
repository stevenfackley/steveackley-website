# =============================================================================
# steveackley.org — Production Dockerfile for Astro 5
# =============================================================================

# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
COPY apps/site/package.json ./apps/site/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm install --no-audit --no-fund --no-package-lock

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
# Re-run install with full source tree so workspace packages hoist correctly
RUN npm install --no-audit --no-fund --no-package-lock
RUN npm run build:site

# Stage 3: Runner
FROM node:22-alpine AS runner
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

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["node", "./dist/server/entry.mjs"]
