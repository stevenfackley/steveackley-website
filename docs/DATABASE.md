# 🗄️ Database Architecture & Configuration

## Overview

This application uses **self-hosted PostgreSQL** with **standard Prisma Client**. There are no cloud database services, no connection poolers, and no driver adapters required.

**Key Principle:** If you're using `postgresql://` URLs, use standard Prisma. Period.

---

## 📋 Quick Reference

### Correct Configuration Checklist

- ✅ `package.json` has `@prisma/client` dependency
- ✅ `package.json` does NOT have `@prisma/adapter-ppg` or other adapters
- ✅ `prisma/schema.prisma` has `url = env("DATABASE_URL")` in datasource
- ✅ `src/lib/prisma.ts` uses plain `new PrismaClient()` (no adapter parameter)
- ✅ `DATABASE_URL` starts with `postgresql://` (not `prisma+postgres://`)

### Environment Variables

**Development:**
```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/steveackleyorg"
```

**CI/Testing:**
```bash
DATABASE_URL="postgresql://testuser:testpassword@localhost:5432/e2etest"
```

**Production:**
```bash
DATABASE_URL="postgresql://username:password@db:5432/steveackleyorg"
```

---

## 🏗️ Architecture

### Connection Flow

```
Next.js App (Node.js Process)
      ↓
PrismaClient (src/lib/prisma.ts)
      ↓
DATABASE_URL from environment
      ↓
PostgreSQL Server (Docker container or cloud)
```

### Container Network (Docker Compose)

```yaml
services:
  web:
    environment:
      DATABASE_URL: postgresql://username:password@db:5432/steveackleyorg
    depends_on:
      db:
        condition: service_healthy
  
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: username
      POSTGRES_PASSWORD: password
      POSTGRES_DB: steveackleyorg
    healthcheck:
      test: pg_isready
```

**Key Points:**
- Service name `db` becomes the hostname in `DATABASE_URL`
- Both containers on same Docker network (automatically created)
- PostgreSQL port not exposed to host (internal only)
- Health check ensures database ready before app starts

---

## ⚠️ Common Mistakes & How to Diagnose

### Mistake #1: Using `@prisma/adapter-ppg` with Standard PostgreSQL

**Cost of this mistake:** $25 in debugging time (based on actual incident)

#### Symptoms:
- Pages return HTTP 500 across the board
- Page title is empty string
- No UI elements render
- Postgres container logs show:
  ```
  FATAL: role "root" does not exist
  ```
  (repeating every ~10 seconds)

#### Root Cause:
`@prisma/adapter-ppg` is **exclusively** for Prisma Inc.'s cloud Postgres service. When you give it a standard `postgresql://` URL:
1. It doesn't understand the credentials
2. Falls back to Unix socket connection
3. Tries to authenticate as the OS process user (e.g., `root` in CI)
4. PostgreSQL rejects it because that's not a database role

#### Detection:
```bash
# 1. Check if wrong adapter is installed
grep "@prisma/adapter-ppg" package.json

# 2. Check if adapter is being used
grep "adapter-ppg" src/lib/prisma.ts

# 3. Check Postgres logs for auth errors
docker logs <postgres-container-id> 2>&1 | grep FATAL
```

#### Fix:
```bash
# 1. Remove the adapter dependency
npm uninstall @prisma/adapter-ppg

# 2. Update src/lib/prisma.ts (remove adapter usage)
# See "Correct Configuration" section below

# 3. Regenerate Prisma Client
npx prisma generate

# 4. Rebuild and restart
npm run build
```

---

### Mistake #2: Missing `url` in Prisma Schema

#### Symptoms:
- Build succeeds but runtime fails
- Error: "Environment variable not found: DATABASE_URL"
- Or: falls back to localhost connection

#### Fix:
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // ← THIS LINE IS REQUIRED
}
```

---

### Mistake #3: Wrong Protocol in DATABASE_URL

#### Symptoms:
- Connection refused
- "Protocol not supported" errors

#### Wrong:
```bash
DATABASE_URL="prisma+postgres://..." # Only for Prisma cloud
DATABASE_URL="postgres://..."        # Old deprecated protocol
```

#### Correct:
```bash
DATABASE_URL="postgresql://user:pass@host:port/db"
```

---

### Mistake #4: Database Not Ready Before App Starts

#### Symptoms:
- App crashes on first request
- "Connection refused" or "Connection timeout"
- Intermittent failures

#### Fix in docker-compose.yml:
```yaml
services:
  web:
    depends_on:
      db:
        condition: service_healthy  # ← Wait for health check
  
  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5
```

---

## ✅ Correct Configuration

### File: `package.json`
```json
{
  "dependencies": {
    "@prisma/client": "^7.4.2"
    // NO @prisma/adapter-ppg or other adapters!
  },
  "devDependencies": {
    "prisma": "^7.0.0"
  }
}
```

### File: `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client"
  output   = "./generated"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // ← CRITICAL: Must be present
}

// ... your models ...
```

### File: `src/lib/prisma.ts`
```typescript
import { PrismaClient } from "../../prisma/generated/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // NO adapter parameter!
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### File: `next.config.ts`
```typescript
const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "prisma",
    // NOT @prisma/adapter-ppg
  ],
  // ...
};
```

---

## 🔧 When to Use What

### Use Standard Prisma Client (This App) When:
- ✅ Self-hosted PostgreSQL (Docker, EC2, bare metal)
- ✅ Cloud PostgreSQL (AWS RDS, Google Cloud SQL, Azure Database)
- ✅ URL starts with `postgresql://`
- ✅ You manage the database server yourself or via IaaS

### Use Driver Adapters (NOT This App) When:
- ❌ Using Prisma Postgres cloud service specifically
- ❌ URL starts with `prisma+postgres://`
- ❌ Using serverless databases (Neon, PlanetScale with HTTP API)
- ❌ Edge runtime connections (Cloudflare Workers D1)

**This app uses case #1 — standard Prisma Client, no adapters.**

---

## 🧪 Environment-Specific Setup

### Local Development

**Database:**
```bash
# Option 1: Docker Compose (recommended)
docker compose up db -d

# Option 2: Local PostgreSQL install
# (ensure it's running on port 5432)
```

**Environment:**
```bash
# .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/steveackleyorg"
```

**Initialize:**
```bash
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema to database
npm run setup:admin  # Create admin user
```

---

### CI/E2E Testing (GitHub Actions)

**Database:** GitHub Actions service container
```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpassword
      POSTGRES_DB: e2etest
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
```

**Environment:**
```yaml
env:
  DATABASE_URL: postgresql://testuser:testpassword@localhost:5432/e2etest
  NODE_ENV: test
```

**Build Steps:**
```yaml
- run: npm install
- run: npx prisma generate
- run: npx prisma migrate deploy
- run: npm run build
- run: npm run start &
- run: npm run test:e2e
```

---

### Production (Docker Compose on EC2)

**Database:** PostgreSQL container with persistent volume
```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: steveackleyorg
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app_network

  web:
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/steveackleyorg
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app_network

volumes:
  postgres_data:

networks:
  app_network:
```

**Environment (.env file):**
```bash
DB_USER=your_username
DB_PASSWORD=your_secure_password
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/steveackleyorg
```

---

## 🚨 Troubleshooting Guide

### Issue: "FATAL: role 'root' does not exist"

**Diagnosis:**
```bash
# Check if wrong adapter is in use
grep -r "@prisma/adapter-ppg" src/ package.json next.config.ts scripts/
```

**Solution:**
1. Remove `@prisma/adapter-ppg` from package.json
2. Remove adapter usage from `src/lib/prisma.ts`
3. Remove adapter from `next.config.ts` serverExternalPackages
4. Run `npm install` and `npx prisma generate`

**Cost:** 30 minutes if you catch it early, hours/$$ if you don't

---

### Issue: "Environment variable not found: DATABASE_URL"

**Diagnosis:**
```bash
# Check if DATABASE_URL is set
echo $DATABASE_URL

# Check if schema has url field
grep "url.*env" prisma/schema.prisma
```

**Solution:**
```prisma
// Add to prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")  // ← Add this
}
```

---

### Issue: "Connection refused" or "Connection timeout"

**Diagnosis:**
```bash
# Check if database container is running
docker ps | grep postgres

# Check if database is healthy
docker inspect <container-id> --format='{{.State.Health.Status}}'

# Test connection manually
psql postgresql://user:pass@host:port/db -c "SELECT 1"
```

**Common Causes:**
1. Database container not started: `docker compose up db -d`
2. Wrong hostname in URL (use `db` in Docker, `localhost` locally)
3. Wrong port (should be 5432)
4. Database still initializing (check health status)
5. Firewall blocking connection

---

### Issue: "relation 'User' does not exist"

**Diagnosis:**
```bash
# Check if migrations have been applied
npx prisma migrate status

# Check database tables
psql $DATABASE_URL -c "\dt"
```

**Solution:**
```bash
# Development
npm run db:push

# Production / CI
npm run db:migrate  # or: npx prisma migrate deploy
```

---

### Issue: "Cannot find module '@prisma/client'"

**Diagnosis:**
```bash
# Check if Prisma Client was generated
ls -la prisma/generated/

# Check if it's in node_modules (shouldn't be)
ls -la node_modules/@prisma/client/
```

**Solution:**
```bash
npx prisma generate
```

**Why this happens:** Prisma Client must be generated after `npm install` and after schema changes.

---

## 🔍 Debugging Commands

### Check Database Connection
```bash
# Test DATABASE_URL manually
psql "$DATABASE_URL" -c "SELECT version();"

# If that fails, break down the URL and test parts:
# postgresql://USER:PASS@HOST:PORT/DATABASE

# Test host reachability
ping HOST  # or: nc -zv HOST PORT

# Test auth (will prompt for password)
psql -h HOST -p PORT -U USER -d DATABASE
```

### Check Prisma Setup
```bash
# Verify schema is valid
npx prisma validate

# Check what DATABASE_URL Prisma sees
npx prisma db execute --stdin <<< "SELECT version();"

# See generated client location
npx prisma generate --schema=prisma/schema.prisma

# View current migration status
npx prisma migrate status
```

### Check Docker Postgres
```bash
# View container logs
docker logs <postgres-container-name>

# Check if it's accepting connections
docker exec <container-name> pg_isready

# Connect to database interactively
docker exec -it <container-name> psql -U username -d database_name

# List all database roles (users)
docker exec <container-name> psql -U postgres -c "\du"
```

### CI-Specific Debugging
```bash
# In GitHub Actions workflow, add this step:
- name: Debug Database Connection
  run: |
    echo "DATABASE_URL format check:"
    echo "$DATABASE_URL" | grep -o "postgresql://[^:]*"
    
    echo "Container logs:"
    docker logs <postgres-service-container> 2>&1 | tail -30
    
    echo "Direct connection test:"
    psql "$DATABASE_URL" -c "SELECT 1 as test;" || echo "Connection failed"
```

---

## 🎯 Best Practices

### 1. Always Use Health Checks

```yaml
db:
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
    interval: 10s
    timeout: 5s
    retries: 5

web:
  depends_on:
    db:
      condition: service_healthy  # Wait for DB to be ready
```

### 2. Use Separate Credentials Per Environment

```bash
# Development (weak password OK)
DATABASE_URL="postgresql://dev:dev@localhost:5432/dev_db"

# CI (throwaway database)
DATABASE_URL="postgresql://testuser:testpass@localhost:5432/test_db"

# Production (strong password, secrets management)
DATABASE_URL="postgresql://prod_user:$(cat /run/secrets/db_password)@db:5432/prod_db"
```

### 3. Connection Pooling (Not Needed for Small Apps)

For this application size, Prisma's built-in connection management is sufficient. **Do not** add external connection poolers unless you're handling 100+ concurrent users.

If you ever need pooling, use:
- **PgBouncer** (recommended for Docker setups)
- **Prisma Accelerate** (if moving to edge/serverless)
- **AWS RDS Proxy** (if using RDS)

### 4. Backup Strategy

```bash
# Automated backup (add to crontab)
docker exec postgres pg_dump -U username database_name | gzip > backup-$(date +%Y%m%d).sql.gz

# Restore from backup
gunzip < backup-20260301.sql.gz | docker exec -i postgres psql -U username -d database_name
```

---

## 🔐 Security Considerations

### Connection String Security

**DO:**
- ✅ Store `DATABASE_URL` in `.env` files (gitignored)
- ✅ Use secrets management in production (Docker secrets, AWS Secrets Manager)
- ✅ Rotate passwords quarterly
- ✅ Use different credentials for each environment

**DON'T:**
- ❌ Commit `DATABASE_URL` to git
- ❌ Use production credentials in development
- ❌ Share credentials in plain text (Slack, email)
- ❌ Use default passwords like `postgres:postgres` in production

### Network Isolation

```yaml
# Good: Database not exposed to internet
db:
  networks:
    - app_network  # Internal network only
  # NO ports: - "5432:5432" in production!

# Exception: Expose for local development only
# In docker-compose.dev.yml you can expose ports
```

---

## 🔄 Migration Scenarios

### Scenario 1: Adding a New Model

```bash
# 1. Edit prisma/schema.prisma
# 2. Create migration
npx prisma migrate dev --name add_new_model

# 3. Generated client updates automatically
# 4. Commit migration files
git add prisma/migrations/
```

### Scenario 2: Changing Database Provider (PostgreSQL → MySQL)

**DON'T DO THIS.** Your migrations are PostgreSQL-specific. If you must:
1. Export data: `pg_dump > data.sql`
2. Update schema.prisma provider to `mysql`
3. Delete migrations folder
4. Create initial migration: `npx prisma migrate dev --name init`
5. Manually convert and import data
6. **Cost:** 4-8 hours of work

### Scenario 3: Moving from Docker to Cloud Database (RDS)

```bash
# 1. Create RDS PostgreSQL instance (same version: 16.x)
# 2. Update DATABASE_URL to RDS endpoint
DATABASE_URL="postgresql://admin:password@mydb.region.rds.amazonaws.com:5432/steveackleyorg"

# 3. Run migrations
npx prisma migrate deploy

# 4. Migrate data (if coming from existing Docker DB)
pg_dump $OLD_DATABASE_URL | psql $NEW_DATABASE_URL
```

**No code changes required** — only environment variable update.

---

## 📊 Performance Tuning

### Prisma Query Optimization

```typescript
// ❌ N+1 queries (slow)
const posts = await prisma.post.findMany();
for (const post of posts) {
  const author = await prisma.user.findUnique({ where: { id: post.authorId } });
}

// ✅ Single query with include (fast)
const posts = await prisma.post.findMany({
  include: { author: true }
});
```

### Connection Pool Configuration

Only needed for high-traffic apps (100+ concurrent connections):

```bash
# Add to DATABASE_URL
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20"
```

### Indexes

Already optimized in schema:
```prisma
model Message {
  @@index([toUserId, read, createdAt(sort: Desc)])  // For inbox queries
  @@index([fromUserId, createdAt(sort: Desc)])      // For sent messages
}

model Post {
  @@index([published, createdAt(sort: Desc)])       // For blog listing
}
```

---

## 📝 Maintenance Checklist

### Weekly
- [ ] Check database container health: `docker ps`
- [ ] Monitor disk usage: `docker system df`

### Monthly
- [ ] Review Prisma Client version: `npm outdated @prisma/client`
- [ ] Backup database: `pg_dump > backup.sql`
- [ ] Check for slow queries in logs

### Quarterly
- [ ] Update dependencies: `npm update @prisma/client prisma`
- [ ] Test backup restore procedure
- [ ] Rotate database credentials
- [ ] Review and optimize slow queries

### Before Major Deployments
- [ ] Run migrations on staging first
- [ ] Backup production database
- [ ] Test rollback procedure
- [ ] Document any schema changes

---

## 🆘 Emergency Procedures

### Database Connection Lost

```bash
# 1. Check container status
docker ps -a | grep postgres

# 2. Restart database container
docker restart <postgres-container>

# 3. Check logs
docker logs <postgres-container> --tail 50

# 4. Restart app if needed
docker restart <app-container>
```

### Data Corruption

```bash
# 1. Stop app immediately
docker stop <app-container>

# 2. Create emergency backup
docker exec postgres pg_dump -U user db_name > emergency-backup-$(date +%s).sql

# 3. Attempt repair
docker exec postgres pg_resetwal /var/lib/postgresql/data

# 4. If repair fails, restore from last known good backup
```

### Accidental Data Deletion

```bash
# If you just ran a bad DELETE/UPDATE query:

# 1. IMMEDIATELY stop app to prevent more writes
docker stop <app-container>

# 2. Restore from latest backup
# (This is why backups matter!)

# 3. If no backup: Check if Docker volume has snapshots
docker run --rm -v postgres_data:/data alpine ls -la /data/

# 4. Lesson learned: Set up automated backups
```

---

## 📚 Additional Resources

- **Prisma Docs**: https://www.prisma.io/docs/concepts/database-connectors/postgresql
- **PostgreSQL Docs**: https://www.postgresql.org/docs/16/
- **Docker PostgreSQL**: https://hub.docker.com/_/postgres
- **Connection Strings**: https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING

---

## 🎓 Key Takeaways

1. **Standard PostgreSQL = Standard Prisma** (no adapters)
2. **Adapters are for edge cases** (serverless, proprietary protocols)
3. **`url = env("DATABASE_URL")` is mandatory** in schema.prisma
4. **Health checks prevent startup races** between app and database
5. **Wrong adapter = silent failure with cryptic errors** (costs time and money)

**When in doubt:** If your DATABASE_URL starts with `postgresql://`, you never need a driver adapter.

---

**Last Updated:** March 1, 2026  
**Incident Reference:** CI failure costing $25 in debugging time due to incorrect adapter usage
