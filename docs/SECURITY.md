# Security Document

**Project:** steveackley.org  
**Version:** 2.0.0  
**Date:** March 2026  
**Author:** Steve Ackley  
**Status:** Current

---

## 1. Overview

This document outlines the security measures, threat model, and implementation guidelines for `steveackley.org`. The site includes an admin panel with file upload capabilities, a client portal, and a PostgreSQL backend — security must be considered holistically across authentication, data access, file handling, and infrastructure.

**Auth stack:** Better-Auth (replaces NextAuth/Auth.js)  
**Storage stack:** Cloudflare R2 (replaces local Docker volume uploads)

---

## 2. Threat Model

### 2.1 Assets to Protect

| Asset | Sensitivity | Risk |
|---|---|---|
| Admin credentials | High | Account takeover |
| Database content | Medium | Data manipulation, defacement |
| Uploaded images (R2) | Low–Medium | Malicious file upload |
| Admin session tokens | High | Session hijacking → account takeover |
| Environment variables / secrets | High | Credential exposure |

### 2.2 Threat Actors

| Actor | Motivation | Capability |
|---|---|---|
| Automated bots | Spam, credential stuffing | Low–Medium |
| Script kiddies | Defacement, curiosity | Low–Medium |
| Targeted attacker | Data theft, defacement | Medium–High |

### 2.3 Out of Scope

- DDoS mitigation (handled at Cloudflare edge)
- Zero-day framework vulnerabilities (mitigated by keeping dependencies updated)
- Physical access to host machines

---

## 3. Authentication

### 3.1 Admin Login

**Implementation:** Better-Auth with Email + Password provider

**Security Controls:**

| Control | Implementation |
|---|---|
| Password hashing | bcrypt (managed by Better-Auth) |
| Session strategy | Database-backed sessions (session table in PostgreSQL) |
| Cookie security | `HttpOnly`, `SameSite=Lax`, `Secure` (production) |
| Session expiry | Configurable via Better-Auth `expiresIn` |
| Login page protection | Not publicly indexed (`<meta name="robots" content="noindex">`) |

**Password Setup:**

The admin password is never stored in plaintext. Generate a bcrypt hash at initial setup:

```bash
node scripts/hash-password.js your-password
```

Store the resulting hash in the `ADMIN_PASSWORD_HASH` environment variable. The container entrypoint (`docker/entrypoint.sh`) seeds the admin user on first boot using this hash.

**Brute Force Considerations:**

Better-Auth does not include built-in rate limiting out of the box. For production, configure rate limiting at the Cloudflare WAF or Caddy layer. bcrypt's inherent slowness provides a significant deterrent against automated password attacks.

### 3.2 Route Protection

All `/admin/*` routes are protected by `src/middleware.ts`:

```typescript
export const onRequest = defineMiddleware(async (context, next) => {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });
  context.locals.user = session?.user ?? null;
  context.locals.session = session?.session ?? null;

  const { pathname } = new URL(context.request.url);

  // Admin routes: require ADMIN role
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (!session || session.user.role !== "ADMIN") {
      return context.redirect("/admin/login");
    }
  }

  // Client routes: require any authenticated session
  if (pathname.startsWith("/client") && pathname !== "/client/login") {
    if (!session) {
      return context.redirect("/client/login");
    }
  }

  return next();
});
```

The middleware runs on every request and checks for a valid Better-Auth session before the request reaches any route handler.

### 3.3 Defense in Depth: Action Auth Checks

In addition to middleware, every Astro Action that mutates data performs its own session check:

```typescript
// src/actions/index.ts — pattern used in every mutating action
import { auth } from "@/lib/auth";
import { ActionError } from "astro:actions";

export const server = {
  createPost: defineAction({
    handler: async (input, context) => {
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });
      if (!session || session.user.role !== "ADMIN") {
        throw new ActionError({ code: "UNAUTHORIZED" });
      }
      // ... proceed with DB operation
    },
  }),
};
```

### 3.4 API Route Auth Checks

The `/api/upload` route independently verifies the session:

```typescript
// src/pages/api/upload.ts
export const POST: APIRoute = async ({ request }) => {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session || session.user.role !== "ADMIN") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  // ... proceed with R2 upload
};
```

---

## 4. SQL Injection Prevention

### 4.1 Drizzle ORM

All database operations use Drizzle ORM, which generates parameterized queries internally. **No raw SQL strings are constructed from user input.**

```typescript
// ✅ SAFE — Drizzle parameterizes this automatically
const post = await db
  .select()
  .from(posts)
  .where(eq(posts.slug, userProvidedSlug))
  .limit(1);

// ✅ SAFE — Drizzle parameterizes all values
await db.insert(posts).values({
  title: validatedTitle,
  slug: generatedSlug,
  content: sanitizedContent,
});
```

### 4.2 Raw Query Policy

**Raw SQL queries are avoided** in this codebase. If a raw query is ever necessary, it must use Drizzle's `sql` tagged template literal (which is parameterized) and never concatenate user input as a string.

```typescript
// ✅ SAFE — Tagged template, parameterized
import { sql } from "drizzle-orm";
const result = await db.execute(sql`SELECT * FROM posts WHERE id = ${id}`);

// ❌ NEVER DO THIS — SQL injection vulnerability
const result = await db.execute(`SELECT * FROM posts WHERE id = '${id}'`);
```

### 4.3 Input Validation

All user inputs are validated via Zod schemas in Astro Actions before reaching the database:

- **Title**: Non-empty string, max 255 characters
- **Slug**: Auto-generated from title, validated against `/^[a-z0-9-]+$/`
- **Content**: HTML from Tiptap — sanitized before storage (see Section 6)
- **Excerpt**: Optional string, max 500 characters

---

## 5. Secure File Upload Handling

### 5.1 Threat Vectors

| Threat | Description |
|---|---|
| MIME type spoofing | Attacker uploads `.php` file renamed as `.jpg` |
| Oversized files | DoS via storage exhaustion |
| Malicious SVG | SVG with embedded JavaScript (XSS via `<script>`) |
| Executable upload | Attacker uploads `.js`, `.php`, `.sh` etc. |

### 5.2 Mitigations

**MIME Type Validation (Allowlist):**

```typescript
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
```

SVG is **intentionally excluded** from the allowlist due to its XSS risk.

**File Size Limit:**

```typescript
const maxBytes = (parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? "5")) * 1024 * 1024;
```

**Filename Sanitization:**

Filenames are sanitized and prefixed with a UUID before being used as an R2 object key:

```typescript
function sanitizeFilename(name: string): string {
  const safe = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${randomUUID()}-${safe}`;
}
// R2 key: uploads/{uuid}-{sanitized-name}
```

**No Local Disk Execution Risk:**

Files are stored in Cloudflare R2, not on the application server. There is no local filesystem path where uploaded files could be executed. R2 serves them as opaque blobs via CDN.

**Content-Type Header for Served Files:**

R2 stores and serves the `Content-Type` set at upload time (derived from the validated MIME allowlist). Never trust client-provided content type values.

---

## 6. Content Security (XSS Prevention)

### 6.1 Tiptap HTML Output

Tiptap generates HTML stored in PostgreSQL. When rendered on the public blog via `set:html` (Astro equivalent of `dangerouslySetInnerHTML`), this HTML should be sanitized before storage:

```typescript
import DOMPurify from "isomorphic-dompurify";

const sanitizedContent = DOMPurify.sanitize(rawHtmlFromTiptap, {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "u", "s", "h1", "h2", "h3", "h4",
    "h5", "h6", "ul", "ol", "li", "blockquote", "code", "pre",
    "a", "img", "hr", "table", "thead", "tbody", "tr", "th", "td",
  ],
  ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "target", "rel", "width", "height"],
  FORCE_BODY: true,
});
```

### 6.2 Astro's Built-in Escaping

All text content rendered via Astro's `{}` interpolation is automatically HTML-escaped. Only the blog post `content` field uses `set:html`, and it must always be sanitized before storage.

### 6.3 Content Security Policy

The Caddy reverse proxy (`server/Caddyfile`) or Astro middleware should set a `Content-Security-Policy` header:

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://*.r2.dev https://github.com;
font-src 'self';
connect-src 'self';
frame-ancestors 'none';
```

---

## 7. Security Headers

The following HTTP security headers should be set at the Caddy layer:

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `X-DNS-Prefetch-Control` | `on` |

---

## 8. Environment Variable Security

### 8.1 Rules

1. **Never commit `.env` or `web.env` files** — both are in `.gitignore`
2. **Use `.env.example`** — template with placeholder values is committed to document required variables
3. **Rotate secrets on suspected exposure** — especially `BETTER_AUTH_SECRET` and `DATABASE_URL`
4. **Secrets injected at deploy time** — GitHub Actions secrets are written to `web.env` on the EC2 host during CI/CD; the file is `chmod 600` before writing

### 8.2 Secret Entropy

- `BETTER_AUTH_SECRET`: Minimum 32 random bytes (256 bits). Generate with:
  ```bash
  openssl rand -base64 32
  ```
- Database passwords: Minimum 24 random characters, mixed types

### 8.3 Access Control

In production:
- Database port (5432) is **not exposed** publicly — only accessible within the internal Docker network
- Admin credentials never appear in logs
- `ADMIN_PASSWORD_HASH` is a bcrypt hash — safe to store, but treat as sensitive

---

## 9. Infrastructure Security

### 9.1 Cloudflare Tunnel

The EC2 instance does **not** have ports 80 or 443 exposed to the internet. All traffic flows through a Cloudflare Tunnel (`cloudflared`), which provides:

- Zero-trust network access
- DDoS mitigation at the Cloudflare edge
- Automatic TLS termination

### 9.2 Docker Network Isolation

The PostgreSQL container is on the `internal` bridge network only. The web container is on both `web` (for Caddy access) and `internal` (for DB access). The database is never reachable from outside the Docker host.

---

## 10. Dependency Security

### 10.1 Policy

- Run `npm audit` regularly and before releases
- Address `high` and `critical` severity findings promptly
- Keep Astro, Better-Auth, and Drizzle updated to latest stable versions
- Use `npm audit fix` for non-breaking fixes

### 10.2 Automated Scanning

Dependabot or Snyk can be enabled on the GitHub repository for automated dependency vulnerability alerts.

---

## 11. Incident Response

In the event of a suspected compromise:

1. **Immediately rotate** `BETTER_AUTH_SECRET` — this invalidates all existing sessions
2. **Rotate** the database password and update `DATABASE_URL`
3. **Review** server logs for unusual access patterns to `/admin/*` and `/api/upload`
4. **Audit** R2 bucket for unexpected objects
5. **Review** blog post content for injected scripts or defacement
6. **Force re-deploy** the container with fresh secrets via CI/CD

---

## 12. Security Checklist (Pre-Deployment)

- [ ] `BETTER_AUTH_SECRET` is a random 32+ byte value
- [ ] Database password is strong (24+ chars, mixed chars)
- [ ] `.env` and `web.env` are not committed to the repository
- [ ] Admin password is hashed with bcrypt (via Better-Auth seeder)
- [ ] Database port 5432 is not exposed in `docker-compose.yml` (no `ports:` mapping on db service)
- [ ] Security headers are set at the Caddy or middleware layer
- [ ] MIME type allowlist is enforced on uploads
- [ ] HTML content is sanitized with DOMPurify before storage
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] Admin login page has `noindex` meta tag
- [ ] Cloudflare Tunnel is running; EC2 ports 80/443 are not open in Security Group
- [ ] R2 bucket policy does not allow unintended public writes
