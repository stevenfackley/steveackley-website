# Contributing to steveackley.org

Thank you for your interest in contributing! This is a personal website project, so contributions will primarily be from the owner. This document exists to document conventions, processes, and guidelines for working on the codebase.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style & Conventions](#code-style--conventions)
- [Commit Message Format](#commit-message-format)
- [Branch Naming](#branch-naming)
- [Testing Guidelines](#testing-guidelines)
- [Environment Variables](#environment-variables)
- [Docker Development](#docker-development)
- [Database Migrations](#database-migrations)
- [Adding Blog Posts (Admin)](#adding-blog-posts-admin)

---

## Prerequisites

Ensure the following tools are installed:

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20.x LTS | JavaScript runtime |
| npm | 10.x | Package manager |
| Docker | 24.x+ | Container runtime |
| Docker Compose | v2.x | Multi-container orchestration |
| Git | 2.x+ | Version control |

### Verify Installation

```bash
node --version   # Should be v20.x.x
npm --version    # Should be 10.x.x
docker --version # Should be 24.x+
docker compose version # Should be v2.x
git --version    # Should be 2.x
```

---

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/steveackleyorg.git
cd steveackleyorg
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your local values. See the [Environment Variables](#environment-variables) section below.

### 4. Start the Database

```bash
docker compose -f docker-compose.dev.yml up -d db
```

### 5. Run Database Migrations

```bash
npx prisma migrate dev
```

### 6. Seed the Admin User

```bash
npm run setup:admin
```

Follow the prompts to create the admin email and password. This generates the bcrypt hash and saves it to your `.env.local`.

### 7. Start the Development Server

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).  
The admin panel is at [http://localhost:3000/admin](http://localhost:3000/admin).

---

## Project Structure

```
src/
├── app/                   # Next.js App Router pages
│   ├── (public)/          # Public-facing pages
│   ├── admin/             # Protected admin pages
│   └── api/               # API routes
├── components/
│   ├── bento/             # Home dashboard cards
│   ├── blog/              # Blog UI components
│   ├── admin/             # Admin panel components
│   └── ui/                # Shared primitive components
├── lib/
│   ├── prisma.ts          # Database client
│   ├── auth.ts            # NextAuth configuration
│   ├── utils.ts           # Shared utilities
│   └── upload.ts          # File upload helpers
└── types/
    └── index.ts           # Shared TypeScript types
```

See `docs/SDD.md` for the complete project structure.

---

## Development Workflow

### Standard Feature Flow

```
1. Create a feature branch from main
2. Write code
3. Test locally (npm run dev + docker compose)
4. Run the linter and type checker
5. Commit with conventional commit message
6. Push and open PR (or merge directly if solo)
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |
| `npm run setup:admin` | Interactive admin user setup |
| `npx prisma studio` | Open Prisma database GUI |
| `npx prisma migrate dev` | Create and apply new migration |
| `npx prisma migrate deploy` | Apply pending migrations (production) |
| `npx prisma generate` | Regenerate Prisma client after schema changes |

---

## Code Style & Conventions

### TypeScript

- **Strict mode** is enabled — no `any` types without justification
- Prefer explicit type annotations on function parameters and return types
- Use `interface` for object shapes, `type` for unions/aliases
- Use `const` by default; `let` when reassignment is needed; never `var`

### React / Next.js

- **Server Components by default** — add `"use client"` only when necessary (event handlers, browser APIs, hooks)
- Keep components small and focused (single responsibility)
- Co-locate component-specific styles with the component file
- Use `next/image` for all `<img>` tags
- Use `next/link` for all internal navigation

### File Naming

| Type | Convention | Example |
|---|---|---|
| React components | PascalCase | `HeroCard.tsx` |
| Utility files | camelCase | `utils.ts` |
| Route files | lowercase (Next.js convention) | `page.tsx`, `route.ts` |
| Test files | `*.test.ts` / `*.spec.ts` | `utils.test.ts` |

### CSS / Tailwind

- Use Tailwind utility classes directly in JSX
- Apply `dark:` variants for every color-related class
- For complex components, extract repeated class combinations into a local `cn()` helper
- Keep class lists readable — break long class strings across multiple lines if needed

### Example Component Pattern

```tsx
// ✅ Good component structure
interface HeroCardProps {
  name: string;
  title: string;
}

export function HeroCard({ name, title }: HeroCardProps) {
  return (
    <div className={`
      bg-white dark:bg-neutral-900
      border border-neutral-200 dark:border-neutral-800
      rounded-2xl p-8
      hover:border-neutral-300 dark:hover:border-neutral-700
      hover:-translate-y-0.5 transition-all duration-200
    `}>
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
        {name}
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400 mt-2">
        {title}
      </p>
    </div>
  );
}
```

---

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | Use For |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, whitespace (no logic changes) |
| `refactor` | Code restructuring (no feature/fix) |
| `chore` | Build process, dependency updates |
| `perf` | Performance improvements |
| `security` | Security fixes |

### Examples

```
feat(blog): add pagination to blog listing page
fix(upload): handle MIME type validation for .webp files
docs: update README with AWS deployment instructions
chore: update prisma to v6.1.0
security: rotate NEXTAUTH_SECRET, add rate limiting notes
```

---

## Branch Naming

```
feature/<description>    # New features
fix/<description>        # Bug fixes
docs/<description>       # Documentation
chore/<description>      # Maintenance tasks
```

Examples:
```
feature/bento-dashboard
fix/upload-mime-validation
docs/aws-deployment-guide
chore/update-dependencies
```

---

## Testing Guidelines

> Note: A formal test suite will be added in a future iteration. Until then, manual testing is the standard.

### Manual Testing Checklist

Before committing significant changes:

**Public Pages:**
- [ ] Home page renders correctly on mobile (375px), tablet (768px), and desktop (1280px)
- [ ] Dark mode and light mode look correct
- [ ] Blog listing loads and paginates
- [ ] Individual blog post renders with correct typography
- [ ] All nav links work

**Admin Panel:**
- [ ] Login works with correct credentials
- [ ] Login rejects incorrect credentials
- [ ] Dashboard loads with post list
- [ ] Creating a new post works
- [ ] Editing an existing post works
- [ ] Deleting a post works
- [ ] Publishing/unpublishing a post works
- [ ] Image upload inserts image into editor

**Docker:**
- [ ] `docker compose up` starts successfully
- [ ] App is accessible at `http://localhost:3000`
- [ ] Database persists after container restart

---

## Environment Variables

Copy `.env.example` to `.env.local` for local development. **Never commit `.env.local`.**

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✅ | JWT signing secret (min 32 chars) |
| `NEXTAUTH_URL` | ✅ | App base URL |
| `ADMIN_EMAIL` | ✅ | Admin login email |
| `ADMIN_PASSWORD_HASH` | ✅ | bcrypt hash of admin password |
| `NEXT_PUBLIC_LINKEDIN_URL` | ✅ | LinkedIn profile URL |
| `NEXT_PUBLIC_EMAIL` | ✅ | Contact email address |
| `NEXT_PUBLIC_P1_OPS_HUB_URL` | ✅ | P1 Ops Hub project URL |
| `UPLOAD_DIR` | ✅ | Filesystem path for image uploads |
| `MAX_UPLOAD_SIZE_MB` | ✅ | Max upload size (default: 5) |

---

## Docker Development

### Start all services:

```bash
docker compose -f docker-compose.dev.yml up
```

### Start only the database (run Next.js locally):

```bash
docker compose -f docker-compose.dev.yml up -d db
npm run dev
```

### Rebuild after dependency changes:

```bash
docker compose build --no-cache
docker compose up
```

### View logs:

```bash
docker compose logs -f web   # App logs
docker compose logs -f db    # Database logs
```

### Access the database directly:

```bash
docker compose exec db psql -U steveackley -d steveackleydb
```

---

## Database Migrations

### Create a new migration (after modifying `schema.prisma`):

```bash
npx prisma migrate dev --name describe-your-change
```

### Apply migrations in production:

```bash
npx prisma migrate deploy
```

### Reset the database (⚠️ destroys all data — development only):

```bash
npx prisma migrate reset
```

### View current migration status:

```bash
npx prisma migrate status
```

### Open Prisma Studio (GUI for database):

```bash
npx prisma studio
```

---

## Adding Blog Posts (Admin)

1. Navigate to `http://localhost:3000/admin/login`
2. Log in with your admin credentials
3. Click **"New Post"**
4. Write content in the Tiptap editor:
   - Use the toolbar for formatting
   - Click the image icon to upload images (max 5MB, JPEG/PNG/WebP/GIF)
5. Add a title, optional excerpt, optional cover image
6. Choose **Draft** to save without publishing, or toggle **Published** to publish immediately
7. Click **Save**

---

## Getting Help

This is a personal project. If you have questions or suggestions, open an issue on GitHub or email directly via the contact information on the site.
