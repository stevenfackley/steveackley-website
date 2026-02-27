# Security Document

**Project:** steveackley.org  
**Version:** 1.0.0  
**Date:** 2026-02-26  
**Author:** Steve Ackley  
**Status:** Approved

---

## 1. Overview

This document outlines the security measures, threat model, and implementation guidelines for `steveackley.org`. Because the site includes an admin panel with file upload capabilities and a PostgreSQL backend, security must be considered holistically across authentication, data access, and file handling.

---

## 2. Threat Model

### 2.1 Assets to Protect

| Asset | Sensitivity | Risk |
|---|---|---|
| Admin credentials | High | Account takeover |
| Database content | Medium | Data manipulation, defacement |
| Uploaded images | Low–Medium | Path traversal, malicious file execution |
| Admin session tokens | High | Session hijacking → account takeover |
| Environment variables | High | Credential exposure |

### 2.2 Threat Actors

| Actor | Motivation | Capability |
|---|---|---|
| Automated bots | Spam, credential stuffing | Low–Medium |
| Script kiddies | Defacement, curiosity | Low–Medium |
| Targeted attacker | Data theft, defacement | Medium–High |

### 2.3 Out of Scope

- DDoS mitigation (handled at infrastructure/CDN layer, e.g., CloudFront)
- Zero-day framework vulnerabilities (mitigated by keeping dependencies updated)
- Physical access to host machines

---

## 3. Authentication

### 3.1 Admin Login

**Implementation:** NextAuth.js v5 (Auth.js) with Credentials provider

**Security Controls:**

| Control | Implementation |
|---|---|
| Password hashing | bcrypt with cost factor 12 (≥ 10 recommended; 12 is ideal) |
| Session strategy | JWT (stateless, no DB session table) |
| Cookie security | `HttpOnly`, `SameSite=Lax`, `Secure` (production) |
| Session expiry | 24 hours (configurable via `maxAge`) |
| Login page protection | Not publicly indexed (`<meta name="robots" content="noindex">`) |

**Password Setup:**

The admin password is never stored in plaintext. At initial setup, generate a bcrypt hash:

```bash
# Using the provided setup script:
npm run setup:admin

# Or manually:
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 12).then(console.log)"
```

Store the resulting hash in the `ADMIN_PASSWORD_HASH` environment variable. The plaintext password is never committed or stored.

**Brute Force Considerations:**

NextAuth.js does not include built-in rate limiting. For production, configure rate limiting at the infrastructure level (e.g., AWS WAF, nginx rate limiting). The bcrypt cost factor of 12 also significantly slows automated password attempts.

### 3.2 Route Protection

All `/admin/*` routes are protected by `src/middleware.ts`:

```typescript
// src/middleware.ts
export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/admin/:path*"],
};
```

The middleware runs on the Edge and checks for a valid JWT session cookie before the request reaches any route handler. Unauthenticated requests are redirected to `/admin/login`.

### 3.3 Defense in Depth: Server Action Auth Checks

In addition to middleware, every Server Action that mutates data performs its own session check:

```typescript
// Example pattern in every admin Server Action:
import { auth } from "@/lib/auth";

export async function createPost(formData: FormData) {
  const session = await auth();
  if (!session) {
    throw new Error("Unauthorized");
  }
  // ... proceed with DB operation
}
```

This ensures that even if the middleware were bypassed (e.g., a misconfiguration), database mutations cannot be performed without a valid session.

### 3.4 API Route Auth Checks

The `/api/upload` route independently verifies the session:

```typescript
// src/app/api/upload/route.ts
export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... proceed with upload
}
```

---

## 4. SQL Injection Prevention

### 4.1 Prisma ORM

All database operations use Prisma, which generates parameterized queries internally. **No raw SQL strings are constructed from user input.**

```typescript
// ✅ SAFE — Prisma parameterizes this automatically
const post = await prisma.post.findUnique({
  where: { slug: userProvidedSlug },
});

// ✅ SAFE — Prisma parameterizes all values
const newPost = await prisma.post.create({
  data: {
    title: formData.title,
    slug: generatedSlug,
    content: sanitizedContent,
    // ...
  },
});
```

### 4.2 Raw Query Policy

**Raw SQL queries are prohibited** in this codebase. If a raw query is ever necessary (e.g., for a complex migration), it must:

1. Use Prisma's `$queryRaw` with tagged template literals (which are parameterized)
2. Never use `$queryRawUnsafe` with user-provided values
3. Be reviewed and documented

```typescript
// ✅ SAFE — Tagged template literal, parameterized
const result = await prisma.$queryRaw`SELECT * FROM posts WHERE id = ${id}`;

// ❌ NEVER DO THIS — SQL injection vulnerability
const result = await prisma.$queryRawUnsafe(`SELECT * FROM posts WHERE id = '${id}'`);
```

### 4.3 Input Validation

All user inputs (blog title, content, etc.) are validated on the server before reaching the database:

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
| Path traversal | Filename contains `../../../etc/passwd` |
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

// Check the actual Content-Type from the browser
if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
  return Response.json({ error: "File type not allowed" }, { status: 400 });
}
```

Note: SVG is **intentionally excluded** from the allowlist due to its XSS risk.

**File Size Limit:**

```typescript
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

if (file.size > MAX_SIZE_BYTES) {
  return Response.json({ error: "File too large (max 5MB)" }, { status: 413 });
}
```

**Filename Sanitization:**

```typescript
import { randomUUID } from "crypto";
import path from "path";

function sanitizeFilename(originalName: string): string {
  // Extract just the base filename (no directory components)
  const basename = path.basename(originalName);
  
  // Remove any characters that aren't alphanumeric, dots, hyphens, or underscores
  const safe = basename.replace(/[^a-zA-Z0-9._-]/g, "_");
  
  // Prefix with UUID to prevent collisions and predictability
  return `${randomUUID()}-${safe}`;
}
```

**Upload Directory:**

- Uploads are stored in `/app/uploads/` — **outside the Next.js `public/` directory**
- Files are served via a custom route handler that streams them, not via static file serving
- This means the web server cannot execute uploaded files as server-side scripts (no PHP, no Node.js execution)
- The upload directory should not have execute permissions: `chmod 644` for files, `chmod 755` for directory

**Content-Type Header for Served Files:**

When serving uploaded images via the custom route handler, always set the `Content-Type` header explicitly based on the known MIME type (stored at upload time or derived from extension), never trust client-provided values:

```typescript
// When streaming file response
return new Response(fileBuffer, {
  headers: {
    "Content-Type": "image/jpeg", // Set explicitly, never from user input
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Disposition": "inline",
    // Prevent execution of content:
    "X-Content-Type-Options": "nosniff",
  },
});
```

---

## 6. Content Security (XSS Prevention)

### 6.1 Tiptap HTML Output

Tiptap generates HTML that is stored in PostgreSQL. When rendered on the public blog, this HTML is inserted via `dangerouslySetInnerHTML`. To prevent stored XSS:

**Server-side HTML sanitization before storage:**

Use `isomorphic-dompurify` or `sanitize-html` to sanitize Tiptap output before it is saved to the database:

```typescript
import DOMPurify from "isomorphic-dompurify";

const sanitizedContent = DOMPurify.sanitize(rawHtmlFromTiptap, {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "u", "s", "h1", "h2", "h3", "h4",
    "h5", "h6", "ul", "ol", "li", "blockquote", "code", "pre",
    "a", "img", "hr", "table", "thead", "tbody", "tr", "th", "td",
  ],
  ALLOWED_ATTR: [
    "href", "src", "alt", "title", "class", "target", "rel",
    "width", "height",
  ],
  // Force safe link targets
  FORCE_BODY: true,
});
```

### 6.2 React's Built-in XSS Protection

All text content rendered via React's JSX is automatically escaped. Only the blog post `content` field uses `dangerouslySetInnerHTML`, and it is always sanitized before storage (see above).

### 6.3 Content Security Policy

Set a `Content-Security-Policy` header in `next.config.ts`:

```typescript
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
`.replace(/\s{2,}/g, " ").trim();
```

---

## 7. Security Headers

Set the following HTTP security headers in `next.config.ts`:

```typescript
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: cspHeader,
  },
];
```

---

## 8. Environment Variable Security

### 8.1 Rules

1. **Never commit `.env` files** — `.env` and `.env.local` are in `.gitignore`
2. **Use `.env.example`** — Template with placeholder values is committed to document required variables
3. **Rotate secrets on suspected exposure** — Especially `NEXTAUTH_SECRET` and `DATABASE_URL`
4. **Use Docker secrets in production** — For AWS deployment, use AWS Secrets Manager or ECS task definition secrets instead of environment variable files

### 8.2 Minimum Secret Entropy

- `NEXTAUTH_SECRET`: Minimum 32 random bytes (256 bits). Generate with:
  ```bash
  openssl rand -base64 32
  ```

- Database passwords: Minimum 24 random characters, alphanumeric + special chars

### 8.3 Access Control

In production:
- Database port (5432) should NOT be exposed publicly — only accessible within the Docker network
- Admin email/password should never appear in logs
- The `ADMIN_PASSWORD_HASH` environment variable is a bcrypt hash — safe to store, but still treat as sensitive

---

## 9. Dependency Security

### 9.1 Policy

- Run `npm audit` regularly and before each release
- Address `high` and `critical` severity findings promptly
- Keep Next.js, Prisma, and NextAuth updated to latest stable versions
- Use `npm audit fix` for non-breaking fixes

### 9.2 Automated Scanning

Consider enabling GitHub Dependabot or Snyk for automated dependency vulnerability scanning.

---

## 10. Incident Response

In the event of a suspected compromise:

1. **Immediately rotate** `NEXTAUTH_SECRET` — this invalidates all existing sessions
2. **Rotate** the database password and update `DATABASE_URL`
3. **Review** server logs for unusual access patterns to `/admin/*` and `/api/upload`
4. **Audit** uploaded files in the `uploads` volume for unexpected file types
5. **Review** blog post content for injected scripts or defacement
6. **Force re-deploy** the container with fresh secrets

---

## 11. Security Checklist (Pre-Deployment)

- [ ] `NEXTAUTH_SECRET` is a random 32+ byte value
- [ ] Database password is strong (24+ chars, mixed chars)
- [ ] `.env` is not committed to the repository
- [ ] Admin password is hashed with bcrypt cost 12+
- [ ] Database port 5432 is not exposed in `docker-compose.yml` (no `ports:` mapping for db service)
- [ ] Security headers are configured in `next.config.ts`
- [ ] Upload directory is writable but not executable
- [ ] MIME type allowlist is enforced on uploads
- [ ] HTML content is sanitized with DOMPurify before storage
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] Admin login page has `noindex` meta tag
