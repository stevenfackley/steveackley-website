# 🗄️ Database Architecture & Configuration (Drizzle ORM)

## Overview

This application uses **self-hosted PostgreSQL** with **Drizzle ORM**. Drizzle provides a lightweight, type-safe way to interact with the database using standard SQL patterns.

---

## 📋 Quick Reference

### Environment Variables

**Development:**
```bash
DATABASE_URL="postgresql://steveackley:devpassword@localhost:5432/steveackleydb"
```

**CI/Testing:**
```bash
DATABASE_URL="postgresql://testuser:testpassword@localhost:5432/e2etest"
```

**Production:**
```bash
DATABASE_URL="postgresql://username:password@db:5432/steveackleydb"
```

---

## 🏗️ Architecture

### Connection Flow

```
Astro App (Node.js Process)
      ↓
Drizzle ORM (src/db/index.ts)
      ↓
postgres.js driver
      ↓
PostgreSQL Server (Docker container)
```

### Container Network (Docker Compose)

```yaml
services:
  web:
    environment:
      DATABASE_URL: postgresql://username:password@db:5432/steveackleydb
    depends_on:
      db:
        condition: service_healthy
  
  db:
    image: postgres:16-alpine
    container_name: steveackley-db
    environment:
      POSTGRES_DB: steveackleydb
      POSTGRES_USER: steveackley
      POSTGRES_PASSWORD_FILE: /run/secrets/postgres_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

---

## 🛠️ Drizzle Commands

The following scripts are available in `package.json`:

```bash
# Generate migration files from schema
npm run db:generate

# Push schema changes directly to DB (Development)
npm run db:push

# Run migrations (Production)
npm run db:migrate

# Open Drizzle Studio (database GUI)
npm run db:studio

# Introspect existing database
npm run db:pull
```

---

## 🔐 Schema Overview

The database schema is defined in `src/db/schema.ts`. Key tables include:

- **User**: Managed by Better-Auth, includes custom roles (ADMIN, CLIENT)
- **Session**: Auth session management
- **Account**: Auth provider links
- **Post**: Blog posts with slug-based routing
- **ClientApp**: Management of client-specific applications
- **Message**: Internal messaging system between users
- **SiteSetting**: Key-value store for site configuration

---

## ✅ Best Practices

### 1. Always Use Health Checks
Ensure the database is ready before the application starts by using health checks in `docker-compose.yml`.

### 2. Migrations vs. Push
Use `db:push` for rapid iteration in development. Use `db:generate` and `db:migrate` for version-controlled schema changes in production.

### 3. Type Safety
Leverage Drizzle's inference for TypeScript types:
```typescript
import { users } from "@/db/schema";
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

---

**Last Updated:** March 10, 2026  
**Migration Note:** Migrated from Prisma to Drizzle ORM as part of the Astro 5 rewrite.
